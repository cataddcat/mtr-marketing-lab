export interface Env {
  GROQ_API_KEY: string;
  SAMBANOVA_API_KEY: string;
  ALLOWED_ORIGIN?: string;
}

interface ChatRequest {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

const SAMBANOVA_URL = 'https://api.sambanova.ai/v1/chat/completions';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const SAMBANOVA_MODEL = 'Meta-Llama-3.3-70B-Instruct';
const GROQ_MODEL = 'llama-3.3-70b-versatile';


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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function jsonResponse(body: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
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
      'Content-Type': 'application/json',
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

// Fall back ONLY on transient failures: rate limit (429), server errors (5xx),
// or network/transport failures (no status). Auth, validation, and other 4xx
// responses are bugs on our side — surface them instead of masking with a retry.
function isTransientFailure(err: unknown): boolean {
  if (err instanceof ProviderError) {
    if (err.status === undefined) return true;
    return err.status === 429 || err.status >= 500;
  }
  return true;
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
          endpoints: { chat: 'POST /chat' },
        },
        200,
        headers,
      );
    }

    if (req.method !== 'POST') {
      return jsonResponse(
        { error: 'Method not allowed', hint: 'POST /chat with { systemPrompt, userPrompt }' },
        405,
        { ...headers, Allow: 'POST, OPTIONS' },
      );
    }

    if (url.pathname !== '/chat') {
      return jsonResponse({ error: 'Not found' }, 404, headers);
    }

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

    if (!env.SAMBANOVA_API_KEY) {
      return jsonResponse({ error: 'SAMBANOVA_API_KEY is not configured' }, 500, headers);
    }

    let content: string;
    let provider: 'sambanova' | 'groq' = 'sambanova';
    let sambanovaError: string | null = null;

    try {
      content = await callProvider(
        SAMBANOVA_URL,
        env.SAMBANOVA_API_KEY,
        SAMBANOVA_MODEL,
        body,
      );
    } catch (err) {
      sambanovaError = err instanceof Error ? err.message : String(err);

      if (!isTransientFailure(err)) {
        return jsonResponse(
          { error: 'Primary provider failed', sambanova: sambanovaError },
          502,
          headers,
        );
      }

      if (!env.GROQ_API_KEY) {
        return jsonResponse(
          {
            error: 'Primary provider failed and fallback is not configured',
            sambanova: sambanovaError,
          },
          502,
          headers,
        );
      }

      provider = 'groq';
      try {
        content = await callProvider(GROQ_URL, env.GROQ_API_KEY, GROQ_MODEL, body);
      } catch (fallbackErr) {
        return jsonResponse(
          {
            error: 'Both providers failed',
            sambanova: sambanovaError,
            groq: fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr),
          },
          502,
          headers,
        );
      }
    }

    return jsonResponse({ content, provider }, 200, headers);
  },
};
