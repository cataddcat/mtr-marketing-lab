export interface TrendsSnapshot {
  readonly daily_top: readonly string[];
  readonly related: readonly string[];
  readonly cached_at: string;
  readonly source: 'live' | 'cache' | 'fallback';
}

const TRENDS_TTL_SEC = 30 * 60;
const DAILY_TRENDS_URL =
  'https://trends.google.com/trends/api/dailytrends?hl=th&tz=-420&geo=TH&ns=15';

const stripGoogleAntiHijack = (s: string): string =>
  s.startsWith(")]}',") ? s.slice(s.indexOf('\n') + 1) : s;

interface DailyTrendsResponse {
  default?: {
    trendingSearchesDays?: Array<{
      trendingSearches?: Array<{
        title?: { query?: string };
      }>;
    }>;
  };
}

const FALLBACK: TrendsSnapshot = {
  daily_top: [],
  related: [],
  cached_at: new Date(0).toISOString(),
  source: 'fallback',
};

export async function fetchTrends(
  query: string,
  kv?: KVNamespace,
): Promise<TrendsSnapshot> {
  const normalizedQ = query.toLowerCase().trim();
  const cacheKey = `trends:TH:${normalizedQ}`;

  if (kv) {
    const hit = await kv.get<TrendsSnapshot>(cacheKey, 'json');
    if (hit) return { ...hit, source: 'cache' };
  }

  try {
    const res = await fetch(DAILY_TRENDS_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (cloudflare-worker)' },
    });
    if (!res.ok) return FALLBACK;
    const text = stripGoogleAntiHijack(await res.text());
    const data = JSON.parse(text) as DailyTrendsResponse;

    const daily_top: string[] = (
      data.default?.trendingSearchesDays?.[0]?.trendingSearches ?? []
    )
      .map(t => t.title?.query)
      .filter((q): q is string => typeof q === 'string')
      .slice(0, 10);

    const related = normalizedQ
      ? daily_top.filter(t => t.toLowerCase().includes(normalizedQ))
      : [];

    const snap: TrendsSnapshot = {
      daily_top,
      related,
      cached_at: new Date().toISOString(),
      source: 'live',
    };

    if (kv) {
      await kv.put(cacheKey, JSON.stringify(snap), { expirationTtl: TRENDS_TTL_SEC });
    }
    return snap;
  } catch {
    return FALLBACK;
  }
}
