export interface TrendsSnapshot {
  readonly daily_top: readonly string[];
  readonly daily_top_previous: readonly string[];
  readonly new_in_window: readonly string[];
  readonly related: readonly string[];
  readonly cached_at: string;
  readonly previous_cached_at: string | null;
  readonly source: 'live' | 'cache' | 'fallback';
}

const STALENESS_MS = 30 * 60 * 1000;
const STORE_TTL_SEC = 24 * 60 * 60;     // hard ceiling, much longer than staleness
const STORE_KEY = 'trends:TH:store';

// Google deprecated /trends/api/dailytrends (returns 404 since ~mid-2025).
// Supported feed is /trending/rss — public, no auth, XML.
const RSS_TRENDS_URL = 'https://trends.google.com/trending/rss?geo=TH';

interface TrendsBucket {
  readonly titles: readonly string[];
  readonly fetched_at: number;
}

interface TrendsStore {
  current: TrendsBucket | null;
  previous: TrendsBucket | null;
}

const EMPTY_STORE: TrendsStore = { current: null, previous: null };

const FALLBACK: TrendsSnapshot = {
  daily_top: [],
  daily_top_previous: [],
  new_in_window: [],
  related: [],
  cached_at: new Date(0).toISOString(),
  previous_cached_at: null,
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

async function fetchLiveTitles(): Promise<string[] | null> {
  try {
    const res = await fetch(RSS_TRENDS_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (cloudflare-worker mtr-marketing-lab)',
        Accept: 'application/rss+xml, text/xml;q=0.9, */*;q=0.5',
      },
    });
    if (!res.ok) return null;
    const xml = await res.text();
    const titles = parseRssTitles(xml, 10);
    return titles.length > 0 ? titles : null;
  } catch {
    return null;
  }
}

function compose(
  store: TrendsStore,
  source: 'live' | 'cache',
  query: string,
): TrendsSnapshot {
  const current = store.current?.titles ?? [];
  const previous = store.previous?.titles ?? [];
  const prevSet = new Set(previous);
  const newInWindow = current.filter(t => !prevSet.has(t));

  const q = query.toLowerCase().trim();
  const related = q
    ? Array.from(new Set([...current, ...previous])).filter(t =>
        t.toLowerCase().includes(q),
      )
    : [];

  return {
    daily_top: current,
    daily_top_previous: previous,
    new_in_window: newInWindow,
    related,
    cached_at: store.current
      ? new Date(store.current.fetched_at).toISOString()
      : new Date(0).toISOString(),
    previous_cached_at: store.previous
      ? new Date(store.previous.fetched_at).toISOString()
      : null,
    source,
  };
}

export async function fetchTrends(
  query: string,
  kv?: KVNamespace,
): Promise<TrendsSnapshot> {
  const store: TrendsStore = kv
    ? ((await kv.get<TrendsStore>(STORE_KEY, 'json')) ?? { ...EMPTY_STORE })
    : { ...EMPTY_STORE };

  const now = Date.now();

  // current still fresh — return without refetch
  if (store.current && now - store.current.fetched_at < STALENESS_MS) {
    return compose(store, 'cache', query);
  }

  // need refresh: try live, on failure return whatever we have
  const fresh = await fetchLiveTitles();
  if (!fresh) {
    if (store.current) return compose(store, 'cache', query);
    return FALLBACK;
  }

  const rotated: TrendsStore = {
    current: { titles: fresh, fetched_at: now },
    // shift current -> previous; if no current existed, keep any previous we had
    previous: store.current ?? store.previous ?? null,
  };

  if (kv) {
    await kv.put(STORE_KEY, JSON.stringify(rotated), {
      expirationTtl: STORE_TTL_SEC,
    });
  }

  return compose(rotated, 'live', query);
}
