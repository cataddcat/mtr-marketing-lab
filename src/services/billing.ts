import type { Tier } from '../lib/auth-client';

// ════════════════════════════════════════════════════════════════════
// Stripe Checkout via Payment Links (no backend required for now).
// In production this gets replaced with a real Stripe Checkout Session
// created server-side from a Cloudflare Worker / Supabase Edge Function,
// which is the source of truth for tier flips via webhook.
// ════════════════════════════════════════════════════════════════════

const PAYMENT_LINK_MONTHLY = (import.meta.env.VITE_STRIPE_LINK_MONTHLY ?? '').trim();
const PAYMENT_LINK_YEARLY = (import.meta.env.VITE_STRIPE_LINK_YEARLY ?? '').trim();
const CUSTOMER_PORTAL_URL = (import.meta.env.VITE_STRIPE_CUSTOMER_PORTAL ?? '').trim();

export type BillingInterval = 'monthly' | 'yearly';

export interface BillingConfig {
  readonly monthlyConfigured: boolean;
  readonly yearlyConfigured: boolean;
  readonly portalConfigured: boolean;
}

export const billingConfig = (): BillingConfig => ({
  monthlyConfigured: PAYMENT_LINK_MONTHLY.length > 0,
  yearlyConfigured: PAYMENT_LINK_YEARLY.length > 0,
  portalConfigured: CUSTOMER_PORTAL_URL.length > 0,
});

export interface CheckoutOptions {
  readonly interval: BillingInterval;
  readonly userEmail?: string;
  readonly userId?: string;
}

/**
 * Opens Stripe Checkout for the chosen interval. Uses Payment Links because
 * they don't require a backend — append metadata via `client_reference_id`
 * so the webhook can match the session back to a user.
 */
export const startCheckout = (opts: CheckoutOptions): { ok: boolean; reason?: string } => {
  const base = opts.interval === 'yearly' ? PAYMENT_LINK_YEARLY : PAYMENT_LINK_MONTHLY;
  if (!base) {
    return {
      ok: false,
      reason:
        'ยังไม่ได้ตั้งค่า Payment Link — ดู STRIPE_SETUP.md (VITE_STRIPE_LINK_MONTHLY / _YEARLY)',
    };
  }
  const url = new URL(base);
  if (opts.userEmail) url.searchParams.set('prefilled_email', opts.userEmail);
  if (opts.userId) url.searchParams.set('client_reference_id', opts.userId);
  window.location.href = url.toString();
  return { ok: true };
};

export const openCustomerPortal = (): { ok: boolean; reason?: string } => {
  if (!CUSTOMER_PORTAL_URL) {
    return { ok: false, reason: 'Customer Portal URL ยังไม่ได้ตั้งค่า' };
  }
  window.open(CUSTOMER_PORTAL_URL, '_blank', 'noopener,noreferrer');
  return { ok: true };
};

/**
 * Tier override happens in 3 ways:
 *   1. Stripe webhook → updates `profiles.tier` server-side (production)
 *   2. User pastes BYOK keys → tier='byok' (Track D3)
 *   3. Local dev / no Supabase → manual toggle in TierSwitcher
 *
 * Pricing copy (THB) — purely informational, not enforced client-side.
 */
export const PRICING: Record<Tier, { monthly: number; yearly: number }> = {
  free: { monthly: 0, yearly: 0 },
  byok: { monthly: 0, yearly: 0 },
  paid: { monthly: 890, yearly: 8900 },
};
