import { useCallback, useState } from 'react';
import { ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { PersonaScoreCard, type RewriteState } from './PersonaScoreCard';
import { Radar } from './Radar';
import { PERSONA_LABELS, personaAverage, type PersonaEval, type PersonaId } from '../lib/schemas';

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

  const radarValues = personas.map(personaAverage);
  const radarLabels = personas.map(p => ({ name: PERSONA_LABELS[p.id] }));

  return (
    <section
      aria-label="Panel of personas"
      className="rounded-md p-4 border space-y-3"
      style={{
        background: 'var(--color-bg-elevated)',
        borderColor: 'var(--color-border-faint)',
      }}
    >
      <header className="flex items-center justify-between gap-2">
        <h4 className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-3 font-medium">
          Panel of personas
          <span className="ml-2 text-fg-4 normal-case tracking-normal">
            {personas.length} voices
          </span>
        </h4>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={expanded}
          className="text-[11px] text-fg-3 hover:text-accent inline-flex items-center gap-1 min-h-[28px] px-2 -my-1 -mr-2 rounded-md transition-colors"
        >
          {expanded ? (
            <>
              <ChevronsDownUp className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
              ย่อทั้งหมด
            </>
          ) : (
            <>
              <ChevronsUpDown className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
              กางทั้งหมด
            </>
          )}
        </button>
      </header>

      <div className="flex justify-center py-2">
        <Radar values={radarValues} labels={radarLabels} size={240} />
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
    </section>
  );
}
