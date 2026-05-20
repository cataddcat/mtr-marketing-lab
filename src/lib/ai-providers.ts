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

export interface ChatOptions {
  signal?: AbortSignal;
  temperature?: number;
  /** When set, the proxy uses its judge endpoint for server-side caching. */
  cacheKeyData?: string;
}

// ════════════════════════════════════════════════════════════════════
// Telemetry — emitted per call, consumed later by usage dashboard
// ════════════════════════════════════════════════════════════════════

export interface AIUsageEvent {
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
// Main entry — single proxy backend with role-tagged telemetry.
// Multi-provider/BYOK was scaffolded but never wired (all 5 alternatives
// were unavailable stubs); cut to remove the illusion of switching.
// Bring it back by reintroducing a provider registry + role assignment
// when a real second backend exists.
// ════════════════════════════════════════════════════════════════════

export const callAI = async (
  role: AIRole,
  system: string,
  user: string,
  opts: ChatOptions = {},
): Promise<string> => {
  const start = performance.now();
  try {
    const result = opts.cacheKeyData !== undefined
      ? await aiJudge(system, user, {
          cacheKeyData: opts.cacheKeyData,
          signal: opts.signal,
          temperature: opts.temperature,
        })
      : await aiClient(system, user, { signal: opts.signal, temperature: opts.temperature });
    emitUsage({
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
