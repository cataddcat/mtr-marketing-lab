import { aiClient, aiJudge } from './ai-config';

// ════════════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════════════

export type AIRole =
  | 'generator'
  | 'judge'
  | 'rewriter'
  | 'strategist'
  | 'visual'
  | 'translator';

export const AI_ROLE_LABELS: Record<AIRole, string> = {
  generator: 'สร้าง ad',
  judge: 'ประเมิน ad',
  rewriter: 'rewrite ad',
  strategist: 'ร่าง Strategy Brief',
  visual: 'visual prompt',
  translator: 'แปลภาษา',
};

export type ProviderId =
  | 'proxy_default'
  | 'cloud_claude'
  | 'cloud_openai'
  | 'own_rag'
  | 'own_finetuned'
  | 'own_local_ollama';

export interface ChatOptions {
  signal?: AbortSignal;
  temperature?: number;
  /** When set, the provider should use a cached endpoint if it supports caching. */
  cacheKeyData?: string;
}

export interface ProviderSupports {
  tools: boolean;
  web: boolean;
  cache: boolean;
  stream: boolean;
}

export interface CostPer1MTokens {
  input: number;
  output: number;
}

export interface AIProvider {
  readonly id: ProviderId;
  readonly label: string;
  readonly available: boolean;
  readonly supports: ProviderSupports;
  readonly costPer1MTokens: CostPer1MTokens;
  chat(system: string, user: string, opts?: ChatOptions): Promise<string>;
}

// ════════════════════════════════════════════════════════════════════
// Provider implementations
// ════════════════════════════════════════════════════════════════════

const proxyDefault: AIProvider = {
  id: 'proxy_default',
  label: 'Proxy (Groq/SambaNova)',
  available: true,
  supports: { tools: false, web: false, cache: true, stream: false },
  costPer1MTokens: { input: 0, output: 0 }, // covered by proxy
  chat: (system, user, opts = {}) => {
    if (opts.cacheKeyData !== undefined) {
      return aiJudge(system, user, {
        cacheKeyData: opts.cacheKeyData,
        signal: opts.signal,
        temperature: opts.temperature,
      });
    }
    return aiClient(system, user, { signal: opts.signal, temperature: opts.temperature });
  },
};

const unavailableProvider = (id: ProviderId, label: string): AIProvider => ({
  id,
  label,
  available: false,
  supports: { tools: false, web: false, cache: false, stream: false },
  costPer1MTokens: { input: 0, output: 0 },
  chat: () =>
    Promise.reject(
      new Error(
        `Provider "${label}" is not configured yet — switch back to "${proxyDefault.label}" in Settings.`,
      ),
    ),
});

const REGISTRY: Record<ProviderId, AIProvider> = {
  proxy_default: proxyDefault,
  cloud_claude: unavailableProvider('cloud_claude', 'Anthropic Claude (BYOK)'),
  cloud_openai: unavailableProvider('cloud_openai', 'OpenAI (BYOK)'),
  own_rag: unavailableProvider('own_rag', 'Marnthara RAG (in-house)'),
  own_finetuned: unavailableProvider('own_finetuned', 'Marnthara fine-tuned (in-house)'),
  own_local_ollama: unavailableProvider('own_local_ollama', 'Local Ollama (dev)'),
};

export const listProviders = (): readonly AIProvider[] => Object.values(REGISTRY);

export const getProvider = (id: ProviderId): AIProvider => REGISTRY[id] ?? proxyDefault;

// ════════════════════════════════════════════════════════════════════
// Role assignment — which provider handles which role
// ════════════════════════════════════════════════════════════════════

export type RoleAssignment = Record<AIRole, ProviderId>;

const STORAGE_KEY = 'mtr_ai_role_assignment';

const DEFAULT_ASSIGNMENT: RoleAssignment = {
  generator: 'proxy_default',
  judge: 'proxy_default',
  rewriter: 'proxy_default',
  strategist: 'proxy_default',
  visual: 'proxy_default',
  translator: 'proxy_default',
};

const isProviderId = (v: unknown): v is ProviderId =>
  typeof v === 'string' && v in REGISTRY;

const isRole = (v: unknown): v is AIRole =>
  typeof v === 'string' && v in DEFAULT_ASSIGNMENT;

let cachedAssignment: RoleAssignment | null = null;

const loadAssignment = (): RoleAssignment => {
  if (cachedAssignment) return cachedAssignment;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      cachedAssignment = { ...DEFAULT_ASSIGNMENT };
      return cachedAssignment;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      cachedAssignment = { ...DEFAULT_ASSIGNMENT };
      return cachedAssignment;
    }
    const merged: RoleAssignment = { ...DEFAULT_ASSIGNMENT };
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (isRole(k) && isProviderId(v)) merged[k] = v;
    }
    cachedAssignment = merged;
    return merged;
  } catch {
    cachedAssignment = { ...DEFAULT_ASSIGNMENT };
    return cachedAssignment;
  }
};

export const getRoleAssignment = (): RoleAssignment => loadAssignment();

export const setRoleProvider = (role: AIRole, providerId: ProviderId): void => {
  const current = loadAssignment();
  const next: RoleAssignment = { ...current, [role]: providerId };
  cachedAssignment = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // quota / disabled — keep in-memory
  }
};

export const resetRoleAssignment = (): void => {
  cachedAssignment = { ...DEFAULT_ASSIGNMENT };
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
};

export const getProviderForRole = (role: AIRole): AIProvider => {
  const assigned = loadAssignment()[role];
  const provider = REGISTRY[assigned];
  if (!provider || !provider.available) {
    // Graceful degrade: fall through to default. UI will surface the mismatch.
    return proxyDefault;
  }
  return provider;
};

// ════════════════════════════════════════════════════════════════════
// Telemetry — emitted per call, consumed later by Track B.10 dashboard
// ════════════════════════════════════════════════════════════════════

export interface AIUsageEvent {
  readonly provider: ProviderId;
  readonly role: AIRole;
  readonly timestamp: string;
  readonly latency_ms: number;
  readonly ok: boolean;
  readonly aborted: boolean;
  readonly error?: string;
}

type UsageListener = (e: AIUsageEvent) => void;

const listeners = new Set<UsageListener>();

export const onAIUsage = (cb: UsageListener): (() => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

const emitUsage = (e: AIUsageEvent): void => {
  for (const cb of listeners) {
    try {
      cb(e);
    } catch (err) {
      console.error('[ai-providers] usage listener threw:', err);
    }
  }
};

// ════════════════════════════════════════════════════════════════════
// Main entry — route a role's call through its assigned provider with telemetry
// ════════════════════════════════════════════════════════════════════

export const callAI = async (
  role: AIRole,
  system: string,
  user: string,
  opts: ChatOptions = {},
): Promise<string> => {
  const provider = getProviderForRole(role);
  const start = performance.now();
  try {
    const result = await provider.chat(system, user, opts);
    emitUsage({
      provider: provider.id,
      role,
      timestamp: new Date().toISOString(),
      latency_ms: Math.round(performance.now() - start),
      ok: true,
      aborted: false,
    });
    return result;
  } catch (err) {
    const aborted = err instanceof DOMException && err.name === 'AbortError';
    emitUsage({
      provider: provider.id,
      role,
      timestamp: new Date().toISOString(),
      latency_ms: Math.round(performance.now() - start),
      ok: false,
      aborted,
      error: aborted ? 'AbortError' : err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
};
