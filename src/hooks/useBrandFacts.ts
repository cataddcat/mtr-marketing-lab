import { useCallback, useEffect, useState } from 'react';
import * as v from 'valibot';
import {
  BrandFactsSchema,
  DEFAULT_BRAND_FACTS,
  type BrandFact,
} from '../lib/brand-facts';

const STORAGE_KEY = 'mtr_brand_facts';

const cloneDefaults = (): BrandFact[] => DEFAULT_BRAND_FACTS.map(f => ({ ...f }));

const loadFacts = (): BrandFact[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneDefaults();
    const parsed = v.safeParse(BrandFactsSchema, JSON.parse(raw));
    return parsed.success ? parsed.output : cloneDefaults();
  } catch {
    return cloneDefaults();
  }
};

const persist = (facts: readonly BrandFact[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(facts));
  } catch {
    // localStorage full / disabled — silent fail, in-memory still works
  }
};

export interface UseBrandFacts {
  readonly facts: readonly BrandFact[];
  readonly update: (id: string, patch: Partial<BrandFact>) => void;
  readonly add: (label: string, value: string) => void;
  readonly remove: (id: string) => void;
  readonly resetAll: () => void;
  readonly resetField: (id: string) => void;
}

export const useBrandFacts = (): UseBrandFacts => {
  const [facts, setFacts] = useState<readonly BrandFact[]>(() => loadFacts());

  useEffect(() => {
    persist(facts);
  }, [facts]);

  const update = useCallback((id: string, patch: Partial<BrandFact>) => {
    setFacts(prev => prev.map(f => (f.id === id ? { ...f, ...patch } : f)));
  }, []);

  const add = useCallback((label: string, value: string) => {
    setFacts(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        label: label.trim() || 'หัวข้อใหม่',
        value,
        enabled: true,
        isDefault: false,
      },
    ]);
  }, []);

  const remove = useCallback((id: string) => {
    setFacts(prev => prev.filter(f => f.id !== id));
  }, []);

  const resetAll = useCallback(() => {
    setFacts(cloneDefaults());
  }, []);

  const resetField = useCallback((id: string) => {
    const seed = DEFAULT_BRAND_FACTS.find(f => f.id === id);
    if (!seed) return;
    setFacts(prev => prev.map(f => (f.id === id ? { ...seed } : f)));
  }, []);

  return { facts, update, add, remove, resetAll, resetField };
};
