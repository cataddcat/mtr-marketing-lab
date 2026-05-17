import { useState } from 'react';
import { Check, Loader2, ExternalLink, Key, Crown, Wand2 } from 'lucide-react';
import type { Tier } from '../lib/auth-client';
import {
  CAPABILITY_LABELS,
  CAPABILITY_MATRIX,
  TIER_BLURBS,
  TIER_LABELS,
  type Capability,
} from '../lib/capabilities';
import { PRICING, billingConfig, openCustomerPortal, startCheckout } from '../services/billing';
import { useTier } from '../hooks/useTier';
import { useAuth } from '../hooks/useAuth';
import { useToast } from './toast-context';

const ORDERED_CAPS: Capability[] = [
  'generate_ad',
  'evaluate_panel_full',
  'evaluate_ensemble',
  'brief_generate',
  'brief_web_grounded',
  'own_ai_use',
  'rag_cloud',
  'vault_sync_full',
  'vault_sync_twoway',
  'mirofish_export',
  'training_export',
  'team_workspace',
];

const TIER_ICON: Record<Tier, React.ReactNode> = {
  free: <Wand2 className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden="true" />,
  byok: <Key className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden="true" />,
  paid: <Crown className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden="true" />,
};

export function TierSwitcher() {
  const auth = useAuth();
  const { tier, isServerBacked, setTier } = useTier();
  const toast = useToast();
  const [busy, setBusy] = useState<Tier | null>(null);
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');
  const cfg = billingConfig();

  const switchLocal = async (next: Tier) => {
    setBusy(next);
    try {
      await setTier(next);
      toast.success(`เปลี่ยน tier เป็น ${TIER_LABELS[next]}`);
    } catch (err) {
      console.error(err);
      toast.info('เปลี่ยน tier ไม่สำเร็จ');
    } finally {
      setBusy(null);
    }
  };

  const handleUpgradePaid = () => {
    const r = startCheckout({
      interval,
      userEmail: auth.session?.user?.email ?? undefined,
      userId: auth.userId ?? undefined,
    });
    if (!r.ok) {
      toast.info(r.reason ?? 'Payment Link ยังไม่ได้ตั้งค่า');
      return;
    }
    // browser will navigate away — no further state to set
  };

  return (
    <div className="p-4 space-y-4">
      <section
        className="rounded-md border p-4 space-y-2"
        style={{
          background: 'var(--color-bg-sunken)',
          borderColor: 'var(--color-border-faint)',
        }}
      >
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-pill" style={{ background: 'color-mix(in oklch, var(--color-accent) 14%, transparent)', color: 'var(--color-accent)' }}>
            {TIER_ICON[tier]}
          </span>
          <span className="text-sm font-semibold text-fg-1">
            ปัจจุบัน: {TIER_LABELS[tier]}
          </span>
          {isServerBacked && (
            <span
              className="font-mono text-[9px] tracking-[0.10em] uppercase px-1.5 py-0.5 rounded-pill"
              style={{
                background: 'color-mix(in oklch, var(--color-success) 12%, transparent)',
                color: 'var(--color-success)',
              }}
              title="ดึงจาก profile บน Supabase"
            >
              cloud
            </span>
          )}
        </div>
        <p className="text-[12px] text-fg-3 leading-relaxed" lang="th">
          {TIER_BLURBS[tier]}
        </p>
      </section>

      {/* Tier cards */}
      <div className="grid grid-cols-3 gap-2">
        {(['free', 'byok', 'paid'] as Tier[]).map(t => {
          const isCurrent = t === tier;
          const isPaid = t === 'paid';
          return (
            <div
              key={t}
              className="rounded-md border p-3 flex flex-col gap-2"
              style={{
                background: isCurrent
                  ? 'color-mix(in oklch, var(--color-accent) 8%, var(--color-bg-elevated))'
                  : 'var(--color-bg-elevated)',
                borderColor: isCurrent
                  ? 'color-mix(in oklch, var(--color-accent) 45%, transparent)'
                  : 'var(--color-border-faint)',
              }}
            >
              <div className="flex items-center gap-1.5">
                {TIER_ICON[t]}
                <span className="text-sm font-semibold text-fg-1">
                  {TIER_LABELS[t]}
                </span>
              </div>
              <div className="font-mono text-base tabular-nums text-fg-1 leading-none">
                {t === 'paid' ? (
                  <>
                    ฿{PRICING.paid[interval].toLocaleString('en-US')}
                    <span className="text-[10px] text-fg-3 font-normal">
                      /{interval === 'yearly' ? 'ปี' : 'เดือน'}
                    </span>
                  </>
                ) : (
                  <span className="text-fg-3 text-sm">ฟรี</span>
                )}
              </div>
              <p className="text-[11px] text-fg-3 leading-relaxed" lang="th">
                {TIER_BLURBS[t]}
              </p>
              {isCurrent ? (
                <span
                  className="inline-flex items-center justify-center gap-1 text-[11px] min-h-[32px] rounded-md"
                  style={{ color: 'var(--color-accent)' }}
                  lang="th"
                >
                  <Check className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
                  ใช้อยู่
                </span>
              ) : isPaid ? (
                <button
                  type="button"
                  onClick={handleUpgradePaid}
                  disabled={busy !== null}
                  className="inline-flex items-center justify-center gap-1 text-[11px] font-medium min-h-[32px] rounded-md transition-colors disabled:opacity-50"
                  style={{
                    background: 'var(--color-accent)',
                    color: 'var(--color-accent-fg)',
                  }}
                >
                  {busy === t ? (
                    <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} aria-hidden="true" />
                  ) : (
                    <ExternalLink className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
                  )}
                  Upgrade
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => switchLocal(t)}
                  disabled={busy !== null}
                  className="inline-flex items-center justify-center gap-1 text-[11px] min-h-[32px] rounded-md border transition-colors disabled:opacity-50 hover:bg-bg-hover"
                  style={{
                    borderColor: 'var(--color-border-faint)',
                    color: 'var(--color-fg-2)',
                  }}
                  lang="th"
                >
                  {busy === t ? (
                    <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} aria-hidden="true" />
                  ) : null}
                  เปลี่ยนเป็น {TIER_LABELS[t]}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-2 text-[11px] text-fg-3">
        <span lang="th">รอบบิล:</span>
        <button
          type="button"
          onClick={() => setInterval('monthly')}
          className="px-2 py-1 rounded-pill border transition-colors"
          style={{
            borderColor:
              interval === 'monthly'
                ? 'color-mix(in oklch, var(--color-accent) 45%, transparent)'
                : 'var(--color-border-faint)',
            color: interval === 'monthly' ? 'var(--color-accent)' : 'var(--color-fg-3)',
          }}
          lang="th"
        >
          รายเดือน
        </button>
        <button
          type="button"
          onClick={() => setInterval('yearly')}
          className="px-2 py-1 rounded-pill border transition-colors"
          style={{
            borderColor:
              interval === 'yearly'
                ? 'color-mix(in oklch, var(--color-accent) 45%, transparent)'
                : 'var(--color-border-faint)',
            color: interval === 'yearly' ? 'var(--color-accent)' : 'var(--color-fg-3)',
          }}
          lang="th"
        >
          รายปี (ประหยัด 17%)
        </button>
      </div>

      {!cfg.monthlyConfigured && (
        <p className="text-[11px] text-fg-3 text-center" lang="th">
          ⚠️ Payment Links ยังไม่ได้ตั้งค่า — ดู <code>STRIPE_SETUP.md</code>
        </p>
      )}

      {cfg.portalConfigured && (
        <button
          type="button"
          onClick={() => openCustomerPortal()}
          className="w-full inline-flex items-center justify-center gap-1.5 text-[12px] text-fg-3 hover:text-fg-1 min-h-[36px] border rounded-md transition-colors hover:bg-bg-hover"
          style={{ borderColor: 'var(--color-border-faint)' }}
          lang="th"
        >
          <ExternalLink className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
          จัดการ subscription (Stripe Portal)
        </button>
      )}

      {/* Comparison table */}
      <section
        className="rounded-md border overflow-hidden"
        style={{
          background: 'var(--color-bg-sunken)',
          borderColor: 'var(--color-border-faint)',
        }}
      >
        <div
          className="px-3 py-2 font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-3 border-b"
          style={{ borderColor: 'var(--color-border-faint)' }}
          lang="th"
        >
          เปรียบเทียบ feature
        </div>
        <table className="w-full text-[12px]">
          <thead>
            <tr style={{ background: 'var(--color-bg-elevated)' }}>
              <th className="text-left px-3 py-2 font-normal text-fg-3">Feature</th>
              <th className="text-center px-2 py-2 font-mono text-[10px] tracking-[0.10em] uppercase text-fg-3">
                Free
              </th>
              <th className="text-center px-2 py-2 font-mono text-[10px] tracking-[0.10em] uppercase text-fg-3">
                BYOK
              </th>
              <th className="text-center px-2 py-2 font-mono text-[10px] tracking-[0.10em] uppercase text-fg-3">
                Pro
              </th>
            </tr>
          </thead>
          <tbody>
            {ORDERED_CAPS.map((cap, i) => (
              <tr
                key={cap}
                style={{
                  borderTop: i > 0 ? '1px solid var(--color-border-faint)' : undefined,
                }}
              >
                <td className="px-3 py-2 text-fg-2" lang="th">
                  {CAPABILITY_LABELS[cap]}
                </td>
                <CapCell value={CAPABILITY_MATRIX.free[cap]} />
                <CapCell value={CAPABILITY_MATRIX.byok[cap]} />
                <CapCell value={CAPABILITY_MATRIX.paid[cap]} />
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="text-[10.5px] text-fg-4 text-center" lang="th">
        ใน production: tier เปลี่ยนจาก Stripe webhook → Supabase. ตอนนี้ใช้ Payment Links +
        manual sync ภายใต้สมมุติฐาน source-of-truth = profiles.tier
      </p>
    </div>
  );
}

function CapCell({ value }: { readonly value: boolean | number }) {
  if (value === false) {
    return (
      <td className="text-center px-2 py-2 text-fg-4">
        <span aria-hidden="true">·</span>
        <span className="sr-only">ไม่มี</span>
      </td>
    );
  }
  if (value === true) {
    return (
      <td className="text-center px-2 py-2" style={{ color: 'var(--color-success)' }}>
        <Check className="inline w-3.5 h-3.5" strokeWidth={1.5} aria-hidden="true" />
      </td>
    );
  }
  return (
    <td
      className="text-center px-2 py-2 font-mono text-[11px] tabular-nums"
      style={{ color: 'var(--color-info)' }}
    >
      {value}/วัน
    </td>
  );
}
