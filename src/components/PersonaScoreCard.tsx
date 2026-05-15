import { useId, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  PERSONA_LABELS,
  personaAverage,
  type PersonaEval,
} from '../lib/schemas';

interface Props {
  readonly persona: PersonaEval;
}

export function PersonaScoreCard({ persona }: Props) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  const avg = personaAverage(persona);
  const avgColor =
    avg >= 8 ? 'text-green-400' : avg >= 6 ? 'text-gray-100' : 'text-orange-300';

  return (
    <div className="bg-black/30 rounded-lg border border-gray-700 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
        aria-controls={detailsId}
        className="w-full p-3 text-left flex items-center justify-between gap-2 min-h-[44px] hover:bg-black/20 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="text-xs text-gray-500 mb-1">{PERSONA_LABELS[persona.id]}</div>
          <div className={`text-lg font-semibold ${avgColor}`}>
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
        <div id={detailsId} className="px-3 pb-3 space-y-2 border-t border-gray-800 pt-3">
          <dl className="grid grid-cols-3 gap-2 text-center">
            <Metric label="Scroll-stop" value={persona.scroll_stop_score} />
            <Metric label="Focused" value={persona.focused_score} />
            <Metric label="Memory" value={persona.memory_score} />
          </dl>
          <p className="text-xs text-gray-300 leading-relaxed">
            <span className="text-gray-500">เห็นแล้วรู้สึก:</span> {persona.verdict}
          </p>
          <p className="text-xs text-blue-300 leading-relaxed">
            <span className="text-gray-500">แก้ให้โดน:</span> {persona.suggestion}
          </p>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { readonly label: string; readonly value: number }) {
  return (
    <div className="bg-black/40 rounded p-2 border border-gray-800">
      <dt className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="text-sm font-semibold text-gray-100 mt-0.5">{value}</dd>
    </div>
  );
}
