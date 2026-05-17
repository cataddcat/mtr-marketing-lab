import { useCallback, useState } from 'react';
import { useAuth } from './useAuth';
import { getSupabase, type Tier } from '../lib/auth-client';

const LOCAL_TIER_KEY = 'mtr_local_tier';

const isTier = (v: unknown): v is Tier =>
  v === 'free' || v === 'byok' || v === 'paid';

const loadLocalTier = (): Tier => {
  try {
    const raw = localStorage.getItem(LOCAL_TIER_KEY);
    return isTier(raw) ? raw : 'free';
  } catch {
    return 'free';
  }
};

const saveLocalTier = (t: Tier): void => {
  try {
    localStorage.setItem(LOCAL_TIER_KEY, t);
  } catch {
    // ignore
  }
};

export interface UseTier {
  readonly tier: Tier;
  /** True when the tier comes from the authenticated profile (server-trusted). */
  readonly isServerBacked: boolean;
  /**
   * Optimistically switch the tier on the client and persist. When auth is
   * enabled this also writes to `profiles.tier` in Supabase — real billing
   * webhooks are the source of truth in production.
   */
  readonly setTier: (next: Tier) => Promise<void>;
}

export const useTier = (): UseTier => {
  const auth = useAuth();
  const [localTier, setLocalTier] = useState<Tier>(() => loadLocalTier());

  // When auth lands, prefer profile.tier as the source of truth. We never
  // sync profile → localTier inside an effect (forbidden by react-hooks lint);
  // setTier() writes both whenever the user explicitly changes plans.
  const tier: Tier = auth.profile?.tier ?? localTier;
  const isServerBacked = !!auth.profile;

  const setTier = useCallback(
    async (next: Tier) => {
      setLocalTier(next);
      saveLocalTier(next);

      if (auth.status !== 'signed-in' || !auth.userId) return;
      const sb = getSupabase();
      if (!sb) return;
      const { error } = await sb
        .from('profiles')
        .update({ tier: next, tier_changed_at: new Date().toISOString() })
        .eq('id', auth.userId);
      if (error) {
        console.error('[useTier] failed to update tier:', error);
        return;
      }
      // Reflect new tier in app state immediately (the next refetch
      // will agree); useAuth re-reads on auth state change.
      await auth.refreshProfile();
    },
    [auth],
  );

  return { tier, isServerBacked, setTier };
};
