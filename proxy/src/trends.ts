export interface TrendsSnapshot {
  readonly daily_top: readonly string[];
  readonly related: readonly string[];
  readonly cached_at: string;
  readonly source: 'live' | 'cache' | 'fallback';
}

const TRENDS_TTL_SEC = 30 * 60;
// Google deprecated /trends/api/dailytrends (returns 404 since ~mid-2025).
// New supported feed is /trending/rss — public, no auth, XML.
const RSS_TRENDS_URL = 'https://trends.google.com/trending/rss?geo=TH';

const FALLBACK: TrendsSnapshot = {
  daily_top: [],
  related: [],
  cached_at: new Date(0).toISOString(),
  source: 'fallback',
};

const decodeEntities = (s: string): string =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");

const stripCdata = (s: string): string => {
  const m = /^<!\[CDATA\[([\s\S]*?)\]\]>$/.exec(s.trim());
  return m ? m[1] : s;
};

/**
 * Parse RSS feed and return the title of every <item>, skipping the channel
 * title. Workers have no DOMParser; regex is acceptable here because the
 * feed is well-formed XML produced by Google with a stable structure.
 */
function parseRssTitles(xml: string, max: number): string[] {
  const out: string[] = [];
  const itemRe = /<item\b[^>]*>([\s\S]*?)<\/item>/g;
  const titleRe = /<title\b[^>]*>([\s\S]*?)<\/title>/;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) !== null && out.length < max) {
    const t = titleRe.exec(m[1]);
    if (!t) continue;
    const title = decodeEntities(stripCdata(t[1])).trim();
    if (title.length > 0) out.push(title);
  }
  return out;
}

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
    const res = await fetch(RSS_TRENDS_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (cloudflare-worker mtr-marketing-lab)',
        Accept: 'application/rss+xml, text/xml;q=0.9, */*;q=0.5',
      },
    });
    if (!res.ok) return FALLBACK;
    const xml = await res.text();
    const daily_top = parseRssTitles(xml, 10);
    if (daily_top.length === 0) return FALLBACK;

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
