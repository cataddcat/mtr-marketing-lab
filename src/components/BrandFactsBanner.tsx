import { AlertTriangle } from 'lucide-react';
import type { BrandFact } from '../lib/brand-facts';
import { findPlaceholderFacts } from '../lib/brand-facts';

interface Props {
  readonly facts: readonly BrandFact[];
  readonly onOpenPanel: () => void;
}

export function BrandFactsBanner({ facts, onOpenPanel }: Props) {
  const pending = findPlaceholderFacts(facts);
  if (pending.length === 0) return null;

  const preview = pending
    .slice(0, 2)
    .map(f => f.label)
    .join(', ');
  const more = pending.length > 2 ? ` (และอีก ${pending.length - 2})` : '';

  return (
    <button
      type="button"
      onClick={onOpenPanel}
      className="w-full text-left rounded-md p-3 min-h-[44px] flex items-start gap-2.5 transition-colors border"
      style={{
        background: 'var(--color-warning-bg)',
        borderColor: 'color-mix(in oklch, var(--color-warning) 35%, transparent)',
      }}
      aria-label="แก้ข้อมูลร้านที่ยังเป็น placeholder"
    >
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" strokeWidth={1.5} style={{ color: 'var(--color-warning)' }} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium leading-snug" style={{ color: 'var(--color-warning)' }} lang="th">
          ข้อมูลร้านยังเป็น placeholder
        </p>
        <p className="text-[11px] mt-0.5 leading-relaxed text-fg-2" lang="th">
          {preview}
          {more} ยังมี <span className="font-mono">XXX</span> อยู่ — แก้ก่อนใช้งานจริง
        </p>
      </div>
    </button>
  );
}
