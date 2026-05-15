export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export interface JudgeRequest {
  readonly systemPrompt: string;
  readonly userPrompt: string;
  readonly cacheKeyData: string;
}

export async function readJudgeCache(
  kv: KVNamespace | undefined,
  cacheKeyData: string,
): Promise<{ key: string; hit: string | null }> {
  const key = `judge:${await sha256Hex(cacheKeyData)}`;
  if (!kv) return { key, hit: null };
  const hit = await kv.get(key);
  return { key, hit };
}

const JUDGE_TTL_SEC = 24 * 60 * 60;

export async function writeJudgeCache(
  kv: KVNamespace | undefined,
  key: string,
  payload: string,
): Promise<void> {
  if (!kv) return;
  await kv.put(key, payload, { expirationTtl: JUDGE_TTL_SEC });
}
