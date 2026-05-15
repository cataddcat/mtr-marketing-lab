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
      className="w-full text-left bg-orange-900/20 border border-orange-800/50 rounded-md p-3 hover:bg-orange-900/30 transition-colors min-h-[44px] flex items-start gap-2.5"
      aria-label="แก้ข้อมูลร้านที่ยังเป็น placeholder"
    >
      <AlertTriangle className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-orange-200 leading-snug">
          ข้อมูลร้านยังเป็น placeholder
        </p>
        <p className="text-[11px] text-orange-300/80 mt-0.5 leading-relaxed">
          {preview}
          {more} ยังมี <span className="font-mono">XXX</span> อยู่ — แก้ก่อนใช้งานจริง
        </p>
      </div>
    </button>
  );
}
