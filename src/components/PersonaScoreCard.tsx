import { useId } from 'react';
import { ChevronDown, ChevronUp, Loader2, Sparkles, Copy as CopyIcon } from 'lucide-react';
import {
  PERSONA_LABELS,
  personaAverage,
  type Confidence,
  type PersonaEval,
  type ParsedAdIdea,
} from '../lib/schemas';

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
}

const scoreColor = (v: number): string => {
  if (v >= 8) return 'text-green-400';
  if (v >= 6) return 'text-gray-100';
  return 'text-orange-300';
};

const barColor = (v: number): string => {
  if (v >= 8) return 'bg-green-500';
  if (v >= 6) return 'bg-hermes';
  return 'bg-orange-400/70';
};

export function PersonaScoreCard({
  persona,
  expanded,
  onToggle,
  rewriteState,
  onRewrite,
  onCopyRewrite,
}: Props) {
  const detailsId = useId();
  const avg = personaAverage(persona);
  const rewrite = rewriteState ?? { status: 'idle' as const };

  return (
    <div className="bg-black/30 rounded-lg border border-gray-700 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={detailsId}
        className="w-full p-3 text-left flex items-center justify-between gap-2 min-h-[44px] hover:bg-black/20 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="text-xs text-gray-500 mb-1 truncate">{PERSONA_LABELS[persona.id]}</div>
          <div className={`text-lg font-semibold ${scoreColor(avg)}`}>
            {avg.toFixed(1)}<span className="text-xs text-gray-500 font-normal">/10</span>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" aria-hidden="true" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" aria-hidden="true" />
        )}
      </button>
      {expanded && (
        <div id={detailsId} className="px-3 pb-3 space-y-3 border-t border-gray-800 pt-3">
          <ConfidenceBadge level={persona.confidence} />
          <dl className="space-y-2.5">
            <MetricBar label="Scroll-stop" value={persona.scroll_stop_score} />
            <MetricBar label="Focused"     value={persona.focused_score} />
            <MetricBar label="Memory"      value={persona.memory_score} />
          </dl>
          <div className="space-y-1.5 pt-1">
            <p className="text-xs text-gray-300 leading-relaxed">
              <span className="text-gray-500">เห็นแล้ว:</span> {persona.verdict}
            </p>
            <p className="text-xs text-blue-300 leading-relaxed">
              <span className="text-gray-500">แก้ให้โดน:</span> {persona.suggestion}
            </p>
          </div>
          {onRewrite && (
            <RewriteBlock
              state={rewrite}
              onRewrite={onRewrite}
              onCopy={onCopyRewrite}
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
}

function RewriteBlock({ state, onRewrite, onCopy }: RewriteBlockProps) {
  if (state.status === 'ready') {
    return (
      <div className="mt-2 p-2.5 bg-black/40 border border-hermes/30 rounded-md space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] uppercase tracking-wide text-hermes">เวอร์ชันที่แก้แล้ว</p>
          <button
            type="button"
            onClick={onRewrite}
            className="text-[10px] text-gray-500 hover:text-hermes inline-flex items-center gap-1 min-h-[28px]"
          >
            <Sparkles className="w-3 h-3" aria-hidden="true" />
            ลองอีก
          </button>
        </div>
        <p className="text-xs text-gray-200 leading-relaxed whitespace-pre-wrap">{state.result.copy}</p>
        <p className="text-[11px] text-gray-400 leading-relaxed">
          <span className="text-gray-500">ภาพ:</span> {state.result.visual_idea}
        </p>
        {onCopy && (
          <button
            type="button"
            onClick={() => onCopy(state.result.copy)}
            className="text-[11px] text-gray-400 hover:text-hermes inline-flex items-center gap-1 min-h-[32px]"
          >
            <CopyIcon className="w-3 h-3" aria-hidden="true" />
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
        className="mt-2 w-full text-xs text-gray-400 inline-flex items-center justify-center gap-1.5 min-h-[36px] border border-gray-800 rounded-md py-1.5 opacity-60"
      >
        <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
        กำลังคิดเวอร์ชันใหม่...
      </button>
    );
  }

  if (state.status === 'error') {
    return (
      <button
        type="button"
        onClick={onRewrite}
        className="mt-2 w-full text-xs text-orange-300 hover:text-orange-200 inline-flex items-center justify-center gap-1.5 min-h-[36px] border border-orange-900/40 rounded-md py-1.5 bg-orange-900/10"
      >
        <Sparkles className="w-3 h-3" aria-hidden="true" />
        แก้แล้วล้มเหลว — ลองอีกครั้ง
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onRewrite}
      className="mt-2 w-full text-xs text-gray-300 hover:text-hermes inline-flex items-center justify-center gap-1.5 min-h-[36px] border border-gray-800 hover:border-hermes/40 rounded-md py-1.5 transition-colors"
    >
      <Sparkles className="w-3 h-3" aria-hidden="true" />
      ลองแก้ตาม suggestion
    </button>
  );
}

const CONFIDENCE_META: Record<Confidence, { label: string; dot: string; text: string }> = {
  high: { label: 'มั่นใจสูง',   dot: 'bg-green-500',   text: 'text-green-400' },
  med:  { label: 'มั่นใจปานกลาง', dot: 'bg-gray-400',    text: 'text-gray-400' },
  low:  { label: 'มั่นใจต่ำ',   dot: 'bg-orange-400',  text: 'text-orange-300' },
};

function ConfidenceBadge({ level }: { readonly level: Confidence }) {
  const meta = CONFIDENCE_META[level];
  return (
    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide">
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} aria-hidden="true" />
      <span className={meta.text}>{meta.label}</span>
    </div>
  );
}

interface MetricBarProps {
  readonly label: string;
  readonly value: number;
}

function MetricBar({ label, value }: MetricBarProps) {
  const pct = Math.max(0, Math.min(10, value)) * 10;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <dt className="text-[11px] text-gray-400">{label}</dt>
        <dd className="text-xs font-semibold text-gray-100 tabular-nums">
          {value}<span className="text-gray-600 font-normal">/10</span>
        </dd>
      </div>
      <div
        className="h-1.5 bg-gray-800/80 rounded-full overflow-hidden"
        role="meter"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={10}
        aria-label={`${label} ${value} of 10`}
      >
        <div
          className={`h-full ${barColor(value)} rounded-full transition-[width] duration-300`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
