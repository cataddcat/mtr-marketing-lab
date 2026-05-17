import * as v from 'valibot';
import type { AIRole } from './ai-providers';

// ════════════════════════════════════════════════════════════════════
// Feedback record — what the user signals about a specific AI output
// ════════════════════════════════════════════════════════════════════

export type FeedbackSignal = 'up' | 'down';

/**
 * Where the feedback was attached. `role` is the AI role that produced the
 * content (so we can later partition training data per role). `kind` is a
 * finer label (e.g., 'ad_copy', 'persona_suggestion', 'positioning') that's
 * free-form for now.
 */
export const FeedbackTargetSchema = v.object({
  contentHash: v.pipe(v.string(), v.minLength(1)),
  role: v.picklist([
    'generator',
    'judge',
    'rewriter',
    'strategist',
    'visual',
    'translator',
  ] as const),
  kind: v.pipe(v.string(), v.maxLength(64)),
  parentId: v.optional(v.pipe(v.string(), v.maxLength(80))),
});
export type FeedbackTarget = v.InferOutput<typeof FeedbackTargetSchema> & {
  role: AIRole;
};

export const FeedbackRecordSchema = v.object({
  id: v.pipe(v.string(), v.minLength(1)),
  target: FeedbackTargetSchema,
  signal: v.picklist(['up', 'down'] as const),
  reason: v.optional(v.pipe(v.string(), v.maxLength(240))),
  edited_to: v.optional(v.pipe(v.string(), v.maxLength(2000))),
  created_at: v.pipe(v.string(), v.minLength(1)),
});
export type FeedbackRecord = v.InferOutput<typeof FeedbackRecordSchema>;

export const FeedbackRecordsSchema = v.array(FeedbackRecordSchema);

// Reason presets surfaced in the 👎 popover
export const DOWN_REASONS: readonly string[] = [
  'voice/tone ผิด',
  'เกินจริง / hallucination',
  'ขัด brand facts',
  'ขัด positioning',
  'ทั่วไปเกิน ไม่ specific',
  'ภาษาไม่เป็นธรรมชาติ',
  'ยาวเกิน / สั้นเกิน',
];

// ════════════════════════════════════════════════════════════════════
// Content hashing — stable id per piece of AI-generated text
// ════════════════════════════════════════════════════════════════════

/** djb2-ish, matches the convention used elsewhere in the codebase. */
export const hashContent = (...parts: readonly string[]): string => {
  const s = parts.join('␟'); // unit separator — unlikely to appear in user text
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h.toString(36);
};

// ════════════════════════════════════════════════════════════════════
// Storage — singleton, subscribable, in localStorage
// ════════════════════════════════════════════════════════════════════

const STORAGE_KEY = 'mtr_feedback';

const loadAll = (): FeedbackRecord[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = v.safeParse(FeedbackRecordsSchema, JSON.parse(raw));
    return parsed.success ? parsed.output : [];
  } catch {
    return [];
  }
};

const persist = (records: readonly FeedbackRecord[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // quota / disabled — keep in-memory only
  }
};

let cache: FeedbackRecord[] = loadAll();
const listeners = new Set<() => void>();

const notify = (): void => {
  for (const cb of listeners) {
    try {
      cb();
    } catch (err) {
      console.error('[feedback] listener threw:', err);
    }
  }
};

export const subscribe = (cb: () => void): (() => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

export const snapshot = (): readonly FeedbackRecord[] => cache;

export const findFeedback = (contentHash: string): FeedbackRecord | undefined =>
  cache.find(r => r.target.contentHash === contentHash);

export const upsertFeedback = (
  target: FeedbackTarget,
  signal: FeedbackSignal,
  reason?: string,
): FeedbackRecord => {
  const next: FeedbackRecord = {
    id: crypto.randomUUID(),
    target,
    signal,
    reason: reason?.trim() ? reason.trim() : undefined,
    created_at: new Date().toISOString(),
  };
  cache = [next, ...cache.filter(r => r.target.contentHash !== target.contentHash)];
  persist(cache);
  notify();
  return next;
};

export const removeFeedback = (contentHash: string): void => {
  const before = cache.length;
  cache = cache.filter(r => r.target.contentHash !== contentHash);
  if (cache.length !== before) {
    persist(cache);
    notify();
  }
};

export const clearAllFeedback = (): void => {
  if (cache.length === 0) return;
  cache = [];
  persist(cache);
  notify();
};

// Aggregate counters for dashboards (Track B.10)
export interface FeedbackStats {
  readonly up: number;
  readonly down: number;
  readonly byRole: Record<AIRole, { up: number; down: number }>;
}

interface MutableStats {
  up: number;
  down: number;
  byRole: Record<AIRole, { up: number; down: number }>;
}

const emptyMutableStats = (): MutableStats => ({
  up: 0,
  down: 0,
  byRole: {
    generator: { up: 0, down: 0 },
    judge: { up: 0, down: 0 },
    rewriter: { up: 0, down: 0 },
    strategist: { up: 0, down: 0 },
    visual: { up: 0, down: 0 },
    translator: { up: 0, down: 0 },
  },
});

export const computeStats = (): FeedbackStats => {
  const out = emptyMutableStats();
  for (const r of cache) {
    if (r.signal === 'up') out.up += 1;
    else out.down += 1;
    const bucket = out.byRole[r.target.role];
    if (bucket) {
      if (r.signal === 'up') bucket.up += 1;
      else bucket.down += 1;
    }
  }
  return out;
};
