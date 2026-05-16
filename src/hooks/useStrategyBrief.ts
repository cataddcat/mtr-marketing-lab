import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as v from 'valibot';
import {
  StrategyBriefsSchema,
  campaignHashOf,
  type StrategyBrief,
} from '../lib/strategy-brief';
import { fetchStrategyBrief } from '../services/strategy-brief';
import type { BrandFact } from '../lib/brand-facts';

const STORAGE_KEY = 'mtr_strategy_briefs';
const MAX_BRIEFS = 20;

const loadBriefs = (): StrategyBrief[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = v.safeParse(StrategyBriefsSchema, JSON.parse(raw));
    return parsed.success ? parsed.output : [];
  } catch {
    return [];
  }
};

const persist = (briefs: readonly StrategyBrief[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(briefs));
  } catch {
    // quota exceeded or disabled — in-memory still works
  }
};

const trimLRU = (briefs: readonly StrategyBrief[]): StrategyBrief[] => {
  if (briefs.length <= MAX_BRIEFS) return [...briefs];
  // newest at front, drop oldest
  const sorted = [...briefs].sort((a, b) =>
    b.drafted_at.localeCompare(a.drafted_at),
  );
  return sorted.slice(0, MAX_BRIEFS);
};

const errorMessage = (err: unknown): string =>
  err instanceof Error && err.message ? err.message : 'เกิดข้อผิดพลาดในการดึง Strategy Brief';

const isAbortError = (err: unknown): boolean =>
  err instanceof DOMException && err.name === 'AbortError';

/**
 * Deep-merge edit-preserving combination — takes `incoming` (newly drafted)
 * and overwrites with `prev` values at the dotted paths listed in
 * `prev.edited_fields`. Returns the merged brief plus the carried-over
 * edited_fields list.
 */
const mergePreservingEdits = (
  incoming: StrategyBrief,
  prev: StrategyBrief | null,
): StrategyBrief => {
  if (!prev || prev.edited_fields.length === 0) return incoming;

  const out: StrategyBrief = {
    ...incoming,
    edited_fields: prev.edited_fields,
  };

  for (const path of prev.edited_fields) {
    const value = readPath(prev, path);
    if (value !== undefined) writePath(out, path, value);
  }

  return out;
};

// Minimal dotted-path get/set (supports `.` and `[index]` segments).
const readPath = (obj: unknown, path: string): unknown => {
  const segs = parsePath(path);
  let cur: unknown = obj;
  for (const seg of segs) {
    if (cur === null || cur === undefined) return undefined;
    if (typeof seg === 'number') {
      if (!Array.isArray(cur)) return undefined;
      cur = cur[seg];
    } else {
      if (typeof cur !== 'object') return undefined;
      cur = (cur as Record<string, unknown>)[seg];
    }
  }
  return cur;
};

const writePath = (obj: unknown, path: string, value: unknown): void => {
  const segs = parsePath(path);
  if (segs.length === 0) return;
  let cur: unknown = obj;
  for (let i = 0; i < segs.length - 1; i++) {
    const seg = segs[i];
    if (typeof seg === 'number') {
      if (!Array.isArray(cur)) return;
      cur = cur[seg];
    } else {
      if (cur === null || typeof cur !== 'object') return;
      cur = (cur as Record<string, unknown>)[seg];
    }
  }
  const last = segs[segs.length - 1];
  if (typeof last === 'number') {
    if (Array.isArray(cur)) cur[last] = value;
  } else if (cur && typeof cur === 'object') {
    (cur as Record<string, unknown>)[last] = value;
  }
};

const parsePath = (path: string): Array<string | number> => {
  const out: Array<string | number> = [];
  const re = /([^.[\]]+)|\[(\d+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(path)) !== null) {
    if (m[1] !== undefined) out.push(m[1]);
    else if (m[2] !== undefined) out.push(Number(m[2]));
  }
  return out;
};

export interface UseStrategyBriefInput {
  readonly product: string;
  readonly promo: string;
  readonly brandFacts?: readonly BrandFact[];
}

export interface UseStrategyBrief {
  readonly current: StrategyBrief | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly isStale: boolean;
  readonly generate: () => Promise<void>;
  readonly regenerate: () => Promise<void>;
  readonly update: (path: string, value: unknown) => void;
  readonly clearCurrent: () => void;
  readonly clearAll: () => void;
  readonly all: readonly StrategyBrief[];
}

export const useStrategyBrief = ({
  product,
  promo,
  brandFacts,
}: UseStrategyBriefInput): UseStrategyBrief => {
  const [briefs, setBriefs] = useState<readonly StrategyBrief[]>(() => loadBriefs());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    persist(briefs);
  }, [briefs]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  const currentHash = campaignHashOf(product, promo);
  const current = useMemo(
    () => briefs.find(b => b.campaign_hash === currentHash) ?? null,
    [briefs, currentHash],
  );
  // Stale only when the user has SOME brief and the current input no longer
  // matches it — useful for nudging "regenerate?" UX after product changes.
  const isStale = current === null && briefs.length > 0;

  const upsert = useCallback((brief: StrategyBrief) => {
    setBriefs(prev => {
      const without = prev.filter(b => b.campaign_hash !== brief.campaign_hash);
      return trimLRU([brief, ...without]);
    });
  }, []);

  const runFetch = useCallback(
    async (preserveEdits: boolean): Promise<void> => {
      if (!product.trim()) {
        setError('กรอก Product ก่อน — Strategy Brief ต้องการ context');
        return;
      }
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);
      try {
        const result = await fetchStrategyBrief(product, promo, {
          brandFacts,
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (!result) {
          setError('AI ส่งคำตอบที่ parse ไม่ได้ ลองอีกครั้ง');
          return;
        }
        const merged = preserveEdits ? mergePreservingEdits(result, current) : result;
        upsert(merged);
      } catch (err) {
        if (isAbortError(err)) return;
        console.error('Failed to fetch strategy brief:', err);
        setError(errorMessage(err));
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
          setLoading(false);
        }
      }
    },
    [brandFacts, current, product, promo, upsert],
  );

  const generate = useCallback(() => runFetch(false), [runFetch]);
  const regenerate = useCallback(() => runFetch(true), [runFetch]);

  const update = useCallback(
    (path: string, value: unknown) => {
      if (!current) return;
      const draft: StrategyBrief = JSON.parse(JSON.stringify(current));
      writePath(draft, path, value);
      // Track which fields have been edited so regenerate preserves them.
      const editedSet = new Set(draft.edited_fields);
      editedSet.add(path);
      draft.edited_fields = [...editedSet];
      upsert(draft);
    },
    [current, upsert],
  );

  const clearCurrent = useCallback(() => {
    setBriefs(prev => prev.filter(b => b.campaign_hash !== currentHash));
  }, [currentHash]);

  const clearAll = useCallback(() => {
    setBriefs([]);
  }, []);

  return {
    current,
    loading,
    error,
    isStale,
    generate,
    regenerate,
    update,
    clearCurrent,
    clearAll,
    all: briefs,
  };
};
