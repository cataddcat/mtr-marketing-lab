import * as v from 'valibot';

const TrendsSchema = v.object({
  daily_top: v.array(v.string()),
  related: v.array(v.string()),
  cached_at: v.string(),
  source: v.picklist(['live', 'cache', 'fallback']),
});

export type TrendsSnapshot = v.InferOutput<typeof TrendsSchema>;

const PROXY_URL = (import.meta.env.VITE_AI_PROXY_URL ?? '').replace(/\/+$/, '');

export const fetchTrends = async (
  query: string,
  signal?: AbortSignal,
): Promise<TrendsSnapshot | null> => {
  if (!PROXY_URL) return null;
  try {
    const res = await fetch(
      `${PROXY_URL}/trends?q=${encodeURIComponent(query)}`,
      { signal },
    );
    if (!res.ok) return null;
    const parsed = v.safeParse(TrendsSchema, await res.json());
    return parsed.success ? parsed.output : null;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    return null;
  }
};
