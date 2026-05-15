import { useCallback, useState } from 'react';
import { ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { PersonaScoreCard, type RewriteState } from './PersonaScoreCard';
import type { PersonaEval, PersonaId } from '../lib/schemas';

interface Props {
  readonly personas: readonly PersonaEval[];
  readonly rewriteStateOf?: (personaId: PersonaId) => RewriteState | undefined;
  readonly onRewrite?: (personaId: PersonaId) => void;
  readonly onCopyRewrite?: (text: string) => void;
}

export function PersonaPanelGroup({
  personas,
  rewriteStateOf,
  onRewrite,
  onCopyRewrite,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const toggle = useCallback(() => setExpanded(v => !v), []);

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={expanded}
          className="text-[11px] text-gray-500 hover:text-hermes inline-flex items-center gap-1 min-h-[36px] px-2 -my-1 -mr-2 rounded-md transition-colors"
        >
          {expanded ? (
            <>
              <ChevronsDownUp className="w-3 h-3" aria-hidden="true" />
              ย่อทั้งหมด
            </>
          ) : (
            <>
              <ChevronsUpDown className="w-3 h-3" aria-hidden="true" />
              กางทั้งหมด
            </>
          )}
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {personas.map(p => (
          <PersonaScoreCard
            key={p.id}
            persona={p}
            expanded={expanded}
            onToggle={toggle}
            rewriteState={rewriteStateOf?.(p.id)}
            onRewrite={onRewrite ? () => onRewrite(p.id) : undefined}
            onCopyRewrite={onCopyRewrite}
          />
        ))}
      </div>
    </div>
  );
}
