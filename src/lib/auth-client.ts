import { createClient, type SupabaseClient, type Session, type User } from '@supabase/supabase-js';

const URL = (import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/+$/, '');
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const isAuthConfigured = (): boolean => URL.length > 0 && ANON_KEY.length > 0;

let cached: SupabaseClient | null = null;

/**
 * Returns the Supabase browser client, or `null` if env vars aren't set yet.
 * Callers MUST handle null — when null, the app runs in local-only mode
 * (no auth, no cloud sync). This is the Phase-1 graceful fallback.
 */
export const getSupabase = (): SupabaseClient | null => {
  if (!isAuthConfigured()) return null;
  if (cached) return cached;
  cached = createClient(URL, ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return cached;
};

export type { Session, User };

// ════════════════════════════════════════════════════════════════════
// Profile (extends auth.users)
// ════════════════════════════════════════════════════════════════════

export type Tier = 'free' | 'byok' | 'paid';

export interface Profile {
  id: string;
  display_name: string | null;
  org_id: string | null;
  tier: Tier;
  tier_changed_at: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  byok_provider_keys: unknown;
  feature_overrides: Record<string, unknown>;
  preferred_language: 'th' | 'en';
  created_at: string;
  updated_at: string;
}

export const fetchProfile = async (userId: string): Promise<Profile | null> => {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    console.error('[fetchProfile]', error);
    return null;
  }
  return (data as Profile | null) ?? null;
};

// ════════════════════════════════════════════════════════════════════
// Magic-link sign-in (Phase 1: simplest auth flow)
// ════════════════════════════════════════════════════════════════════

export interface SignInResult {
  ok: boolean;
  error?: string;
}

export const signInWithMagicLink = async (email: string): Promise<SignInResult> => {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: 'Supabase ยังไม่ได้ตั้งค่า — กรอก env แล้ว reload' };
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
};

export const signInWithOAuth = async (
  provider: 'google' | 'line' | 'apple',
): Promise<SignInResult> => {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: 'Supabase ยังไม่ได้ตั้งค่า' };
  // Note: 'line' requires a custom OAuth provider configured in Supabase Studio
  const { error } = await sb.auth.signInWithOAuth({
    provider: provider as never,
    options: { redirectTo: window.location.origin },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
};

export const signOut = async (): Promise<void> => {
  const sb = getSupabase();
  if (!sb) return;
  await sb.auth.signOut();
};
