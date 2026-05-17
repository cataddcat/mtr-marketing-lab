import { useCallback, useEffect, useState } from 'react';
import {
  fetchProfile,
  getSupabase,
  isAuthConfigured,
  signOut as supabaseSignOut,
  type Profile,
  type Session,
} from '../lib/auth-client';

export type AuthStatus =
  | 'disabled' // Supabase env not set — app runs in local-only mode
  | 'loading' // resolving initial session
  | 'signed-out'
  | 'signed-in';

export interface UseAuth {
  readonly status: AuthStatus;
  readonly session: Session | null;
  readonly profile: Profile | null;
  readonly userId: string | null;
  readonly signOut: () => Promise<void>;
  readonly refreshProfile: () => Promise<void>;
}

export const useAuth = (): UseAuth => {
  const enabled = isAuthConfigured();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) return;
    const sb = getSupabase();
    if (!sb) return;

    let mounted = true;

    sb.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
      setLoading(false);
    });

    const { data: sub } = sb.auth.onAuthStateChange((_event, next) => {
      if (!mounted) return;
      setSession(next);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [enabled]);

  // Resolve profile after session known. We never call setProfile(null)
  // synchronously inside the effect (cleared via the `effectiveProfile`
  // render-time derivation below).
  useEffect(() => {
    if (!enabled || !session?.user) return;
    let mounted = true;
    fetchProfile(session.user.id).then(p => {
      if (mounted) setProfile(p);
    });
    return () => {
      mounted = false;
    };
  }, [enabled, session]);

  // When session goes away, treat profile as gone too — without writing to
  // state in the effect body (which the React 19 lint rule forbids).
  const effectiveProfile: Profile | null = session?.user ? profile : null;

  const refreshProfile = useCallback(async () => {
    if (!enabled || !session?.user) return;
    const fresh = await fetchProfile(session.user.id);
    setProfile(fresh);
  }, [enabled, session]);

  const handleSignOut = useCallback(async () => {
    await supabaseSignOut();
  }, []);

  let status: AuthStatus;
  if (!enabled) status = 'disabled';
  else if (loading) status = 'loading';
  else if (session) status = 'signed-in';
  else status = 'signed-out';

  return {
    status,
    session,
    profile: effectiveProfile,
    userId: session?.user?.id ?? null,
    signOut: handleSignOut,
    refreshProfile,
  };
};
