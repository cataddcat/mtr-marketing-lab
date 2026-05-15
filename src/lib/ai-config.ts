const PROXY_URL = (import.meta.env.VITE_AI_PROXY_URL ?? '').replace(/\/+$/, '');

export class AiClientError extends Error {
  readonly status?: number;
  readonly detail?: unknown;

  constructor(message: string, status?: number, detail?: unknown) {
    super(message);
    this.name = 'AiClientError';
    this.status = status;
    this.detail = detail;
  }
}

interface ProxyChatResponse {
  content: string;
  provider: 'groq' | 'sambanova';
}

interface ProxyErrorResponse {
  error: string;
  [key: string]: unknown;
}

type ProxyResponse = ProxyChatResponse | ProxyErrorResponse;

export interface AiClientOptions {
  temperature?: number;
  signal?: AbortSignal;
}

export const aiClient = async (
  systemPrompt: string,
  userPrompt: string,
  options: AiClientOptions = {},
): Promise<string> => {
  if (!PROXY_URL) {
    throw new AiClientError(
      'VITE_AI_PROXY_URL is not configured. Set it in .env and restart the dev server.',
    );
  }

  const body: Record<string, unknown> = { systemPrompt, userPrompt };
  if (options.temperature !== undefined) body.temperature = options.temperature;

  let res: Response;
  try {
    res = await fetch(`${PROXY_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: options.signal,
    });
  } catch (networkErr) {
    if (networkErr instanceof DOMException && networkErr.name === 'AbortError') {
      throw networkErr;
    }
    throw new AiClientError(
      'Network error contacting AI proxy',
      undefined,
      networkErr instanceof Error ? networkErr.message : String(networkErr),
    );
  }

  let payload: ProxyResponse | null = null;
  try {
    payload = (await res.json()) as ProxyResponse;
  } catch {
    // Non-JSON body (e.g. Cloudflare 5xx HTML page)
  }

  if (!res.ok) {
    const message =
      payload && 'error' in payload && typeof payload.error === 'string'
        ? payload.error
        : `Proxy returned HTTP ${res.status}`;
    throw new AiClientError(message, res.status, payload);
  }

  if (!payload || !('content' in payload) || typeof payload.content !== 'string') {
    throw new AiClientError('Proxy returned an unexpected response shape', res.status, payload);
  }

  return payload.content;
};
