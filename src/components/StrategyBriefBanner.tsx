import { Sparkles, AlertTriangle } from 'lucide-react';
import type { StrategyBrief } from '../lib/strategy-brief';
import { ARCHETYPE_LABELS, OBJECTIVE_LABELS } from '../lib/strategy-brief';

interface Props {
  readonly brief: StrategyBrief | null;
  readonly isStale: boolean;
  readonly canDraft: boolean;
  readonly onOpenPanel: () => void;
}

export function StrategyBriefBanner({ brief, isStale, canDraft, onOpenPanel }: Props) {
  // Stale (had a brief but product changed) → warning banner
  if (isStale) {
    return (
      <button
        type="button"
        onClick={onOpenPanel}
        className="w-full text-left rounded-md p-3 min-h-[44px] flex items-start gap-2.5 transition-colors border"
        style={{
          background: 'var(--color-warning-bg)',
          borderColor: 'color-mix(in oklch, var(--color-warning) 35%, transparent)',
        }}
        aria-label="แคมเปญเปลี่ยน — Strategy Brief เก่าอาจไม่ตรง"
      >
        <AlertTriangle
          className="w-4 h-4 mt-0.5 shrink-0"
          strokeWidth={1.5}
          style={{ color: 'var(--color-warning)' }}
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <p
            className="text-xs font-medium leading-snug"
            style={{ color: 'var(--color-warning)' }}
            lang="th"
          >
            Product/Promo เปลี่ยน — Strategy Brief ยังไม่ตรง
          </p>
          <p className="text-[11px] mt-0.5 leading-relaxed text-fg-2" lang="th">
            กดเปิดเพื่อร่าง brief ใหม่สำหรับแคมเปญนี้
          </p>
        </div>
      </button>
    );
  }

  // Has brief → friendly summary, neutral styling
  if (brief) {
    const seg1 = brief.segments[0];
    return (
      <button
        type="button"
        onClick={onOpenPanel}
        className="w-full text-left rounded-md p-3 min-h-[44px] flex items-start gap-2.5 transition-colors border hover:bg-bg-hover"
        style={{
          background: 'var(--color-bg-sunken)',
          borderColor: 'var(--color-border-faint)',
        }}
        aria-label="เปิด Strategy Brief"
      >
        <Sparkles
          className="w-4 h-4 mt-0.5 shrink-0"
          strokeWidth={1.5}
          style={{ color: 'var(--color-accent)' }}
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0 space-y-0.5">
          <p className="text-xs font-medium leading-snug text-fg-1" lang="th">
            {ARCHETYPE_LABELS[brief.positioning.archetype]} ·{' '}
            <span className="text-fg-3 font-normal">
              {OBJECTIVE_LABELS[brief.campaign.objective]}
            </span>
          </p>
          {seg1 && (
            <p className="text-[11px] leading-relaxed text-fg-3 line-clamp-1" lang="th">
              segment #1: {seg1.name} — {seg1.winning_angle}
            </p>
          )}
        </div>
        {brief.edited_fields.length > 0 && (
          <span
            className="font-mono text-[10px] tabular-nums px-1.5 py-0.5 rounded-pill border shrink-0"
            style={{
              background: 'color-mix(in oklch, var(--color-accent) 10%, transparent)',
              borderColor: 'color-mix(in oklch, var(--color-accent) 35%, transparent)',
              color: 'var(--color-accent)',
            }}
            title="ฟิลด์ที่ผู้ใช้แก้"
          >
            ✎ {brief.edited_fields.length}
          </span>
        )}
      </button>
    );
  }

  // No brief, product entered → CTA to draft
  if (canDraft) {
    return (
      <button
        type="button"
        onClick={onOpenPanel}
        className="w-full text-left rounded-md p-3 min-h-[44px] flex items-start gap-2.5 transition-colors border border-dashed hover:bg-bg-hover"
        style={{ borderColor: 'var(--color-border)' }}
        aria-label="ร่าง Strategy Brief สำหรับแคมเปญนี้"
      >
        <Sparkles
          className="w-4 h-4 mt-0.5 shrink-0 text-fg-3"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium leading-snug text-fg-2" lang="th">
            ยังไม่มี Strategy Brief สำหรับแคมเปญนี้
          </p>
          <p className="text-[11px] mt-0.5 leading-relaxed text-fg-3" lang="th">
            ร่าง brief 1 ครั้ง → ทุก ad ต่อจากนี้จะเคารพ positioning + segments + offer
          </p>
        </div>
      </button>
    );
  }

  // No product yet → don't show anything
  return null;
}
