import { useId } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  PERSONA_LABELS,
  personaAverage,
  type PersonaEval,
} from '../lib/schemas';

interface Props {
  readonly persona: PersonaEval;
  readonly expanded: boolean;
  readonly onToggle: () => void;
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

export function PersonaScoreCard({ persona, expanded, onToggle }: Props) {
  const detailsId = useId();
  const avg = personaAverage(persona);

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
        </div>
      )}
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
