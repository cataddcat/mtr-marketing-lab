import { Lock, Sparkles } from 'lucide-react';
import type { Capability } from '../lib/capabilities';
import { CAPABILITY_LABELS } from '../lib/capabilities';

interface Props {
  readonly capability: Capability;
  readonly onUpgrade: () => void;
  readonly compact?: boolean;
  readonly reason?: string;
}

export function UpsellChip({ capability, onUpgrade, compact, reason }: Props) {
  const label = CAPABILITY_LABELS[capability];
  const hint = reason ?? `feature นี้อยู่ใน Pro · upgrade เพื่อปลด`;

  return (
    <button
      type="button"
      onClick={onUpgrade}
      className={
        compact
          ? 'inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-pill border transition-colors'
          : 'inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 min-h-[32px] rounded-md border transition-colors'
      }
      style={{
        background: 'color-mix(in oklch, var(--color-warning) 8%, transparent)',
        borderColor: 'color-mix(in oklch, var(--color-warning) 35%, transparent)',
        color: 'var(--color-warning)',
      }}
      title={hint}
      aria-label={`Upgrade เพื่อปลด ${label}`}
    >
      <Lock className={compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} strokeWidth={1.5} aria-hidden="true" />
      <span>Upgrade · {label}</span>
      {!compact && <Sparkles className="w-3 h-3 ml-0.5" strokeWidth={1.5} aria-hidden="true" />}
    </button>
  );
}
