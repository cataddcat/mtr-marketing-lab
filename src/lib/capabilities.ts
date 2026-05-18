import type { Tier } from './auth-client';

// ════════════════════════════════════════════════════════════════════
// Capabilities — single source of truth for what each tier can do
// ════════════════════════════════════════════════════════════════════

export type Capability =
  | 'generate_ad'
  | 'evaluate_panel_full'    // 4-persona panel (vs 1)
  | 'evaluate_ensemble'      // 3-run ensemble for variance
  | 'brief_generate'
  | 'brief_web_grounded'     // Phase 3 — proxy /strategy with web search
  | 'own_ai_use'             // Phase 4b — fine-tuned models
  | 'rag_cloud'              // Phase 4a — cloud vector index
  | 'vault_sync_full'
  | 'vault_sync_twoway'
  | 'mirofish_export'
  | 'community_sim_run'      // Track E.M2 — Super-Judge community simulation
  | 'training_export'
  | 'team_workspace';

/**
 * `true`  — feature available (unlimited)
 * number  — daily limit (e.g. generate_ad: 5 = 5 per local day)
 * `false` — feature locked behind upgrade
 */
export type CapabilityValue = boolean | number;

type CapabilityMatrix = Record<Tier, Record<Capability, CapabilityValue>>;

export const CAPABILITY_MATRIX: CapabilityMatrix = {
  free: {
    generate_ad: 5,
    evaluate_panel_full: false,
    evaluate_ensemble: false,
    brief_generate: 1, // one brief per day, no edits persist beyond session
    brief_web_grounded: false,
    own_ai_use: false,
    rag_cloud: false,
    vault_sync_full: false,
    vault_sync_twoway: false,
    mirofish_export: false,
    // Track E.M2: enabled for all tiers during dev. Gate flips when SaaS
    // billing turns on.
    community_sim_run: true,
    training_export: false,
    team_workspace: false,
  },
  byok: {
    generate_ad: true,
    evaluate_panel_full: true,
    evaluate_ensemble: true,
    brief_generate: true,
    brief_web_grounded: false, // requires our proxy → not user's key
    own_ai_use: false,
    rag_cloud: false,
    vault_sync_full: true,
    vault_sync_twoway: false,
    mirofish_export: true,
    community_sim_run: true,
    training_export: true,
    team_workspace: false,
  },
  paid: {
    generate_ad: true,
    evaluate_panel_full: true,
    evaluate_ensemble: true,
    brief_generate: true,
    brief_web_grounded: true,
    own_ai_use: true,
    rag_cloud: true,
    vault_sync_full: true,
    vault_sync_twoway: true,
    mirofish_export: true,
    community_sim_run: true,
    training_export: true,
    team_workspace: true,
  },
};

// Friendly labels surfaced in upsell chips + comparison table
export const CAPABILITY_LABELS: Record<Capability, string> = {
  generate_ad: 'สร้าง ad',
  evaluate_panel_full: 'Panel 4 persona เต็ม',
  evaluate_ensemble: 'Ensemble eval (3 รอบ)',
  brief_generate: 'ร่าง Strategy Brief',
  brief_web_grounded: 'Brief จากข้อมูล web จริง',
  own_ai_use: 'AI ของ Marnthara (fine-tuned)',
  rag_cloud: 'RAG บน cloud index',
  vault_sync_full: 'Vault export ครบ',
  vault_sync_twoway: 'Vault sync 2-way',
  mirofish_export: 'MiroFish boards',
  community_sim_run: 'Community deep-eval (Super-Judge)',
  training_export: 'Export training data',
  team_workspace: 'Team workspace + invite',
};

export const TIER_LABELS: Record<Tier, string> = {
  free: 'Free',
  byok: 'BYOK',
  paid: 'Pro',
};

export const TIER_BLURBS: Record<Tier, string> = {
  free: 'ลองใช้ฟรี · จำกัด generate 5/วัน · 1 persona',
  byok: 'ใช้ key ของคุณเอง · ไม่จำกัด · ทุก feature ยกเว้น Own AI + Team',
  paid: 'Pro · ไม่จำกัด · Own AI · Web-grounded brief · Team',
};

// ════════════════════════════════════════════════════════════════════
// Daily usage counter (for `generate_ad` / `brief_generate` limits)
// ════════════════════════════════════════════════════════════════════

interface DailyUsage {
  date: string; // YYYY-MM-DD
  counts: Partial<Record<Capability, number>>;
}

const USAGE_KEY = 'mtr_daily_usage';
const todayStr = (): string => new Date().toISOString().slice(0, 10);

const loadUsage = (): DailyUsage => {
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    if (!raw) return { date: todayStr(), counts: {} };
    const parsed = JSON.parse(raw) as Partial<DailyUsage>;
    if (parsed.date !== todayStr()) return { date: todayStr(), counts: {} };
    return {
      date: parsed.date,
      counts: parsed.counts ?? {},
    };
  } catch {
    return { date: todayStr(), counts: {} };
  }
};

const persistUsage = (u: DailyUsage): void => {
  try {
    localStorage.setItem(USAGE_KEY, JSON.stringify(u));
  } catch {
    // ignore
  }
};

const usageListeners = new Set<() => void>();
const subscribeUsage = (cb: () => void): (() => void) => {
  usageListeners.add(cb);
  return () => usageListeners.delete(cb);
};
const notifyUsage = (): void => {
  for (const cb of usageListeners) cb();
};

let usageCache = loadUsage();

export const getUsage = (cap: Capability): number => {
  if (usageCache.date !== todayStr()) {
    usageCache = { date: todayStr(), counts: {} };
    persistUsage(usageCache);
    notifyUsage();
  }
  return usageCache.counts[cap] ?? 0;
};

export const recordUsage = (cap: Capability): void => {
  if (usageCache.date !== todayStr()) {
    usageCache = { date: todayStr(), counts: {} };
  }
  usageCache = {
    date: usageCache.date,
    counts: { ...usageCache.counts, [cap]: (usageCache.counts[cap] ?? 0) + 1 },
  };
  persistUsage(usageCache);
  notifyUsage();
};

export const subscribeToUsage = subscribeUsage;
export const usageSnapshot = (): DailyUsage => usageCache;

// ════════════════════════════════════════════════════════════════════
// Resolver — given a tier + capability, return concrete gate state
// ════════════════════════════════════════════════════════════════════

export interface GateState {
  readonly allowed: boolean;
  readonly limit: number | null; // null = unlimited
  readonly used: number;
  readonly remaining: number | null; // null = unlimited
  readonly tier: Tier;
  readonly capability: Capability;
}

export const resolveGate = (tier: Tier, cap: Capability): GateState => {
  const value = CAPABILITY_MATRIX[tier][cap];
  if (value === false) {
    return { allowed: false, limit: 0, used: 0, remaining: 0, tier, capability: cap };
  }
  if (value === true) {
    return { allowed: true, limit: null, used: 0, remaining: null, tier, capability: cap };
  }
  // number → daily limit
  const used = getUsage(cap);
  const remaining = Math.max(0, value - used);
  return {
    allowed: remaining > 0,
    limit: value,
    used,
    remaining,
    tier,
    capability: cap,
  };
};
