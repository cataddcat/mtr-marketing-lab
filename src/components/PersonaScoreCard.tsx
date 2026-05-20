import { useId } from 'react';
import { ChevronDown, ChevronUp, Loader2, Sparkles, Copy as CopyIcon } from 'lucide-react';
import {
  getPersonaLabel,
  personaAverage,
  type Confidence,
  type PersonaEval,
  type ParsedAdIdea,
} from '../lib/schemas';
import { ScoreBar } from './ScoreBar';
import { scoreClass, scoreColorVar } from '../lib/score';
import { FeedbackThumbs } from './FeedbackThumbs';
import { hashContent } from '../lib/feedback';

export type RewriteState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; result: ParsedAdIdea }
  | { status: 'error' };

interface Props {
  readonly persona: PersonaEval;
  readonly expanded: boolean;
  readonly onToggle: () => void;
  readonly rewriteState?: RewriteState;
  readonly onRewrite?: () => void;
  readonly onCopyRewrite?: (text: string) => void;
  readonly parentAdId?: string;
}

export function PersonaScoreCard({
  persona,
  expanded,
  onToggle,
  rewriteState,
  onRewrite,
  onCopyRewrite,
  parentAdId,
}: Props) {
  const detailsId = useId();
  const avg = personaAverage(persona);
  const cls = scoreClass(avg);
  const tone = scoreColorVar(cls);
  const rewrite = rewriteState ?? { status: 'idle' as const };

  return (
    <div
      className="rounded-md overflow-hidden border"
      style={{
        background: 'var(--color-bg-elevated)',
        borderColor: 'var(--color-border-faint)',
        borderTop: `2px solid ${tone}`,
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={detailsId}
        className="w-full p-3 text-left flex items-center justify-between gap-2 min-h-[44px] hover:bg-bg-hover transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="font-mono text-[10.5px] tracking-[0.12em] uppercase text-fg-3 mb-1 truncate" lang="th">
            {getPersonaLabel(persona.id)}
          </div>
          <div
            className="font-mono text-lg font-medium tabular-nums"
            style={{ color: tone }}
          >
            {avg.toFixed(1)}<span className="text-fg-4 text-xs font-normal">/10</span>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-fg-3 shrink-0" strokeWidth={1.5} aria-hidden="true" />
        ) : (
          <ChevronDown className="w-4 h-4 text-fg-3 shrink-0" strokeWidth={1.5} aria-hidden="true" />
        )}
      </button>
      {expanded && (
        <div
          id={detailsId}
          className="px-3 pb-3 space-y-3 border-t pt-3"
          style={{ borderColor: 'var(--color-border-faint)' }}
        >
          <ConfidenceBadge level={persona.confidence} />
          <dl className="space-y-2.5">
            <MetricBar label="Scroll-stop" value={persona.scroll_stop_score} />
            <MetricBar label="Focused"     value={persona.focused_score} />
            <MetricBar label="Memory"      value={persona.memory_score} />
          </dl>
          <div className="space-y-1.5 pt-1">
            <p className="text-xs text-fg-2 leading-relaxed" lang="th">
              <span className="text-fg-4">เห็นแล้ว:</span> {persona.verdict}
            </p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-info)' }} lang="th">
              <span className="text-fg-4">แก้ให้โดน:</span> {persona.suggestion}
            </p>
            <div className="pt-1">
              <FeedbackThumbs
                target={{
                  contentHash: hashContent(
                    'judge',
                    parentAdId ?? 'no-ad',
                    persona.id,
                    persona.suggestion,
                  ),
                  role: 'judge',
                  kind: 'persona_suggestion',
                  parentId: parentAdId,
                }}
              />
            </div>
          </div>
          {onRewrite && (
            <RewriteBlock
              state={rewrite}
              onRewrite={onRewrite}
              onCopy={onCopyRewrite}
              feedbackParentId={parentAdId}
              personaKey={persona.id}
            />
          )}
        </div>
      )}
    </div>
  );
}

interface RewriteBlockProps {
  readonly state: RewriteState;
  readonly onRewrite: () => void;
  readonly onCopy?: (text: string) => void;
  readonly feedbackParentId?: string;
  readonly personaKey: string;
}

function RewriteBlock({ state, onRewrite, onCopy, feedbackParentId, personaKey }: RewriteBlockProps) {
  if (state.status === 'ready') {
    return (
      <div
        className="mt-2 p-2.5 rounded-md space-y-2 border"
        style={{
          background: 'var(--color-bg-sunken)',
          borderColor: 'color-mix(in oklch, var(--color-accent) 35%, transparent)',
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <p
            className="font-mono text-[10px] tracking-[0.14em] uppercase"
            style={{ color: 'var(--color-accent)' }}
          >
            เวอร์ชันที่แก้แล้ว
          </p>
          <div className="flex items-center gap-1">
            <FeedbackThumbs
              target={{
                contentHash: hashContent(
                  'rewriter',
                  feedbackParentId ?? 'no-ad',
                  personaKey,
                  state.result.copy,
                ),
                role: 'rewriter',
                kind: 'rewrite_result',
                parentId: feedbackParentId,
              }}
            />
            <button
              type="button"
              onClick={onRewrite}
              className="text-[10px] text-fg-3 hover:text-accent inline-flex items-center gap-1 min-h-[28px] transition-colors"
            >
              <Sparkles className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
              ลองอีก
            </button>
          </div>
        </div>
        <p className="text-xs text-fg-1 leading-relaxed whitespace-pre-wrap" lang="th">{state.result.copy}</p>
        <p className="text-[11px] text-fg-3 leading-relaxed" lang="th">
          <span className="text-fg-4">ภาพ:</span> {state.result.visual_idea}
        </p>
        {onCopy && (
          <button
            type="button"
            onClick={() => onCopy(state.result.copy)}
            className="text-[11px] text-fg-3 hover:text-accent inline-flex items-center gap-1 min-h-[32px] transition-colors"
          >
            <CopyIcon className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
            คัดลอกข้อความ
          </button>
        )}
      </div>
    );
  }

  if (state.status === 'loading') {
    return (
      <button
        type="button"
        disabled
        aria-busy="true"
        className="mt-2 w-full text-xs text-fg-3 inline-flex items-center justify-center gap-1.5 min-h-[36px] border border-border rounded-md py-1.5 opacity-60"
      >
        <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} aria-hidden="true" />
        กำลังคิดเวอร์ชันใหม่...
      </button>
    );
  }

  if (state.status === 'error') {
    return (
      <button
        type="button"
        onClick={onRewrite}
        className="mt-2 w-full text-xs inline-flex items-center justify-center gap-1.5 min-h-[36px] rounded-md py-1.5 border transition-colors"
        style={{
          color: 'var(--color-warning)',
          background: 'var(--color-warning-bg)',
          borderColor: 'color-mix(in oklch, var(--color-warning) 35%, transparent)',
        }}
      >
        <Sparkles className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
        แก้แล้วล้มเหลว — ลองอีกครั้ง
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onRewrite}
      className="mt-2 w-full text-xs text-fg-2 hover:text-accent inline-flex items-center justify-center gap-1.5 min-h-[36px] border border-border rounded-md py-1.5 transition-colors hover:bg-bg-hover"
    >
      <Sparkles className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
      ลองแก้ตาม suggestion
    </button>
  );
}

const CONFIDENCE_META: Record<Confidence, { label: string; toneVar: string }> = {
  high: { label: 'มั่นใจสูง',     toneVar: '--color-success' },
  med:  { label: 'มั่นใจปานกลาง', toneVar: '--color-fg-3' },
  low:  { label: 'มั่นใจต่ำ',     toneVar: '--color-warning' },
};

function ConfidenceBadge({ level }: { readonly level: Confidence }) {
  const meta = CONFIDENCE_META[level];
  const color = `var(${meta.toneVar})`;
  return (
    <div className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] uppercase">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} aria-hidden="true" />
      <span style={{ color }} lang="th">{meta.label}</span>
    </div>
  );
}

interface MetricBarProps {
  readonly label: string;
  readonly value: number;
}

function MetricBar({ label, value }: MetricBarProps) {
  const cls = scoreClass(value);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <dt className="text-[11px] text-fg-3">{label}</dt>
        <dd
          className="font-mono text-xs font-medium tabular-nums"
          style={{ color: scoreColorVar(cls) }}
        >
          {value}<span className="text-fg-4 font-normal">/10</span>
        </dd>
      </div>
      <ScoreBar value={value} size="thin" />
    </div>
  );
}
