import { fetchTrends } from './trends';
import { readJudgeCache, writeJudgeCache, type JudgeRequest } from './judge-cache';
import { generateImage, type ImageRequest } from './image';

export interface Env {
  GROQ_API_KEY: string;
  SAMBANOVA_API_KEY: string;
  ALLOWED_ORIGIN?: string;
  TRENDS_KV?: KVNamespace;
  JUDGE_KV?: KVNamespace;
  IMAGE_KV?: KVNamespace;
  AI?: Ai;
}

interface ChatRequest {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const SAMBANOVA_URL = 'https://api.sambanova.ai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';        // primary — ~220 tok/s
const SAMBANOVA_MODEL = 'Meta-Llama-3.3-70B-Instruct'; // fallback — more reliable, slower

type Provider = 'groq' | 'sambanova';

class ProviderError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ProviderError';
    this.status = status;
  }
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function jsonResponse(
  body: unknown,
  status: number,
  headers: Record<string, string>,
  extra: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8', ...extra },
  });
}

async function callProvider(
  url: string,
  apiKey: string,
  model: string,
  body: ChatRequest,
): Promise<string> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: body.systemPrompt },
        { role: 'user', content: body.userPrompt },
      ],
      temperature: body.temperature ?? 0.7,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new ProviderError(`${url} -> ${res.status}: ${text.slice(0, 500)}`, res.status);
  }

  const data = (await res.json()) as ChatCompletionResponse;
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || content.length === 0) {
    throw new ProviderError(`${url} returned empty content`);
  }
  return content;
}

function isTransientFailure(err: unknown): boolean {
  if (err instanceof ProviderError) {
    if (err.status === undefined) return true;
    return err.status === 429 || err.status >= 500;
  }
  return true;
}

interface ChatResult {
  content: string;
  provider: Provider;
  groqError?: string;
  sambanovaError?: string;
}

async function callPrimaryWithFallback(env: Env, body: ChatRequest): Promise<ChatResult> {
  if (!env.GROQ_API_KEY && !env.SAMBANOVA_API_KEY) {
    throw new ProviderError('No provider API keys configured');
  }

  let groqError: string | undefined;

  if (env.GROQ_API_KEY) {
    try {
      const content = await callProvider(GROQ_URL, env.GROQ_API_KEY, GROQ_MODEL, body);
      return { content, provider: 'groq' };
    } catch (err) {
      groqError = err instanceof Error ? err.message : String(err);
      if (!isTransientFailure(err)) {
        throw new ProviderError(`Primary (groq) failed: ${groqError}`);
      }
    }
  }

  if (!env.SAMBANOVA_API_KEY) {
    throw new ProviderError(
      `Primary failed and fallback unavailable. groq: ${groqError ?? 'no key'}`,
    );
  }

  try {
    const content = await callProvider(
      SAMBANOVA_URL,
      env.SAMBANOVA_API_KEY,
      SAMBANOVA_MODEL,
      body,
    );
    return { content, provider: 'sambanova', groqError };
  } catch (err) {
    const sambanovaError = err instanceof Error ? err.message : String(err);
    throw new ProviderError(
      `Both providers failed. groq: ${groqError ?? 'no key'} | sambanova: ${sambanovaError}`,
    );
  }
}

async function handleChat(
  req: Request,
  env: Env,
  headers: Record<string, string>,
): Promise<Response> {
  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400, headers);
  }

  if (typeof body.systemPrompt !== 'string' || typeof body.userPrompt !== 'string') {
    return jsonResponse(
      { error: 'systemPrompt and userPrompt must be strings' },
      400,
      headers,
    );
  }
  if (body.systemPrompt.length === 0 || body.userPrompt.length === 0) {
    return jsonResponse({ error: 'Prompts must be non-empty' }, 400, headers);
  }

  try {
    const result = await callPrimaryWithFallback(env, body);
    return jsonResponse({ content: result.content, provider: result.provider }, 200, headers);
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : 'Provider call failed' },
      502,
      headers,
    );
  }
}

async function handleJudge(
  req: Request,
  env: Env,
  headers: Record<string, string>,
): Promise<Response> {
  let body: JudgeRequest;
  try {
    body = (await req.json()) as JudgeRequest;
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400, headers);
  }

  if (
    typeof body.systemPrompt !== 'string' ||
    typeof body.userPrompt !== 'string' ||
    typeof body.cacheKeyData !== 'string'
  ) {
    return jsonResponse(
      { error: 'systemPrompt, userPrompt, and cacheKeyData must be strings' },
      400,
      headers,
    );
  }

  const { key, hit } = await readJudgeCache(env.JUDGE_KV, body.cacheKeyData);
  if (hit) {
    return new Response(hit, {
      status: 200,
      headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8', 'X-Cache': 'HIT' },
    });
  }

  try {
    const result = await callPrimaryWithFallback(env, {
      systemPrompt: body.systemPrompt,
      userPrompt: body.userPrompt,
    });
    const payload = JSON.stringify({ content: result.content, provider: result.provider });
    await writeJudgeCache(env.JUDGE_KV, key, payload);
    return new Response(payload, {
      status: 200,
      headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8', 'X-Cache': 'MISS' },
    });
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : 'Provider call failed' },
      502,
      headers,
    );
  }
}

async function handleTrends(
  url: URL,
  env: Env,
  headers: Record<string, string>,
): Promise<Response> {
  const q = url.searchParams.get('q') ?? '';
  const snap = await fetchTrends(q, env.TRENDS_KV);
  return jsonResponse(snap, 200, headers);
}

async function handleImage(
  req: Request,
  env: Env,
  headers: Record<string, string>,
): Promise<Response> {
  let body: ImageRequest;
  try {
    body = (await req.json()) as ImageRequest;
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400, headers);
  }
  if (typeof body.prompt !== 'string') {
    return jsonResponse({ error: 'prompt must be a string' }, 400, headers);
  }
  const result = await generateImage(env, body);
  if ('error' in result) {
    return jsonResponse({ error: result.error }, 502, headers);
  }
  return jsonResponse(
    { image: result.image, cached: result.cached },
    200,
    headers,
    { 'X-Cache': result.cached ? 'HIT' : 'MISS' },
  );
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const allowedOrigin = env.ALLOWED_ORIGIN ?? '*';
    const headers = corsHeaders(allowedOrigin);
    const url = new URL(req.url);

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
      return jsonResponse(
        {
          ok: true,
          service: 'mtr-marketing-lab-proxy',
          endpoints: {
            chat: 'POST /chat',
            judge: 'POST /judge',
            trends: 'GET /trends?q=<query>',
            image: 'POST /image',
          },
        },
        200,
        headers,
      );
    }

    if (req.method === 'GET' && url.pathname === '/trends') {
      return handleTrends(url, env, headers);
    }

    if (req.method === 'POST' && url.pathname === '/chat') {
      return handleChat(req, env, headers);
    }

    if (req.method === 'POST' && url.pathname === '/judge') {
      return handleJudge(req, env, headers);
    }

    if (req.method === 'POST' && url.pathname === '/image') {
      return handleImage(req, env, headers);
    }

    return jsonResponse(
      { error: 'Not found', hint: 'GET / for endpoint list' },
      404,
      headers,
    );
  },
};
