import { useCallback, useEffect, useState } from 'react';
import * as v from 'valibot';
import {
  CustomerQuotesSchema,
  DEFAULT_QUOTES,
  type CustomerQuote,
} from '../lib/customer-quotes';
import type { PersonaId } from '../lib/schemas';

const STORAGE_KEY = 'mtr_customer_quotes';

const cloneDefaults = (): CustomerQuote[] => DEFAULT_QUOTES.map(q => ({ ...q }));

const load = (): CustomerQuote[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneDefaults();
    const parsed = v.safeParse(CustomerQuotesSchema, JSON.parse(raw));
    return parsed.success ? parsed.output : cloneDefaults();
  } catch {
    return cloneDefaults();
  }
};

const persist = (quotes: readonly CustomerQuote[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(quotes));
  } catch {
    /* localStorage full or disabled — silent */
  }
};

export interface UseCustomerQuotes {
  readonly quotes: readonly CustomerQuote[];
  readonly update: (id: string, patch: Partial<CustomerQuote>) => void;
  readonly add: (persona: PersonaId) => void;
  readonly remove: (id: string) => void;
  readonly resetAll: () => void;
  readonly resetField: (id: string) => void;
}

export const useCustomerQuotes = (): UseCustomerQuotes => {
  const [quotes, setQuotes] = useState<readonly CustomerQuote[]>(() => load());

  useEffect(() => {
    persist(quotes);
  }, [quotes]);

  const update = useCallback((id: string, patch: Partial<CustomerQuote>) => {
    setQuotes(prev => prev.map(q => (q.id === id ? { ...q, ...patch } : q)));
  }, []);

  const add = useCallback((persona: PersonaId) => {
    setQuotes(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        persona,
        quote: '',
        context: '',
        enabled: true,
        isDefault: false,
      },
    ]);
  }, []);

  const remove = useCallback((id: string) => {
    setQuotes(prev => prev.filter(q => q.id !== id));
  }, []);

  const resetAll = useCallback(() => {
    setQuotes(cloneDefaults());
  }, []);

  const resetField = useCallback((id: string) => {
    const seed = DEFAULT_QUOTES.find(q => q.id === id);
    if (!seed) return;
    setQuotes(prev => prev.map(q => (q.id === id ? { ...seed } : q)));
  }, []);

  return { quotes, update, add, remove, resetAll, resetField };
};
