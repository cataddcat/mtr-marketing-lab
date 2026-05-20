import { useCallback, useState } from 'react';
import { ChevronsDownUp, ChevronsUpDown, AlertCircle } from 'lucide-react';
import { PersonaScoreCard, type RewriteState } from './PersonaScoreCard';
import { personaAverage, type PersonaEval, type PersonaId } from '../lib/schemas';

interface Props {
  readonly personas: readonly PersonaEval[];
  readonly rewriteStateOf?: (personaId: PersonaId) => RewriteState | undefined;
  readonly onRewrite?: (personaId: PersonaId) => void;
  readonly onCopyRewrite?: (text: string) => void;
  readonly parentAdId?: string;
}

/**
 * Detect LLM template-scoring patterns. Returns human-readable warnings
 * so the user knows when scores are "anchor-and-shift" lazy output vs
 * real per-persona reasoning. See marketing-agent prompt §ANTI-TEMPLATE
 * for the rules the LLM is told to follow.
 */
const detectTemplateScoring = (personas: readonly PersonaEval[]): string[] => {
  const warnings: string[] = [];
  if (personas.length < 3) return warnings;

  const avgs = personas.map(personaAverage);

  // 1. Same fractional digit across most averages — telltale of `[N, N-1, N-1]`
  //    pattern (always gives sum mod 3 = 1 → avg ends in .3).
  const fractionalDigits = avgs.map(a => Math.round((a - Math.floor(a)) * 10));
  const fracCounts = new Map<number, number>();
  for (const d of fractionalDigits) fracCounts.set(d, (fracCounts.get(d) ?? 0) + 1);
  const topFracCount = Math.max(...fracCounts.values());
  if (topFracCount >= Math.max(4, Math.ceil(personas.length * 0.7))) {
    warnings.push(
      `${topFracCount}/${personas.length} ค่าเฉลี่ยลงท้ายตัวเลขเดียวกัน — LLM ใช้ pattern [N,N-1,N-1] template ไม่ได้คิดแยกตาม persona`,
    );
  }

  // 2. Low std deviation across personas — real personas have varied reactions.
  //    Threshold 1.2 chosen because well-targeted vs off-target diff typically
  //    produces 2-4 points of spread in human scoring.
  const mean = avgs.reduce((sum, v) => sum + v, 0) / avgs.length;
  const variance = avgs.reduce((sum, v) => sum + (v - mean) ** 2, 0) / avgs.length;
  const stdDev = Math.sqrt(variance);
  if (stdDev < 1.2 && personas.length >= 4) {
    warnings.push(
      `Variance ต่ำ (std=${stdDev.toFixed(2)}) — personas ทั้งหมดเกือบเห็นพ้อง · มักเป็น "ไม่มี dissent" จริง ๆ มี ad ที่ทุก persona ชอบเท่ากันน้อยมาก`,
    );
  }

  // 3. No dissent — no persona scored < 4 on ANY dimension.
  //    Real ads have at least one weak spot for at least one audience.
  if (personas.length >= 5) {
    const hasDissent = personas.some(p =>
      p.scroll_stop_score < 4 || p.focused_score < 4 || p.memory_score < 4,
    );
    if (!hasDissent) {
      warnings.push(
        `ไม่มี persona ใดที่ scoreมิติใด < 4 — ad นี้ไม่มี blind spot จริงหรือ Judge หลีกเลี่ยง dissent?`,
      );
    }
  }

  // 4. Per-persona internal spread — if scroll/focused/memory always ≤ 1 apart
  //    for every persona, scoring is mechanical.
  const lowSpreadCount = personas.filter(p => {
    const max = Math.max(p.scroll_stop_score, p.focused_score, p.memory_score);
    const min = Math.min(p.scroll_stop_score, p.focused_score, p.memory_score);
    return max - min <= 1;
  }).length;
  if (lowSpreadCount >= Math.max(4, Math.ceil(personas.length * 0.7))) {
    warnings.push(
      `${lowSpreadCount}/${personas.length} personas ที่ scroll/focused/memory กระจาย ≤ 1 จุด — 3 มิติแทบเหมือนกัน เป็น template`,
    );
  }

  return warnings;
};

export function PersonaPanelGroup({
  personas,
  rewriteStateOf,
  onRewrite,
  onCopyRewrite,
  parentAdId,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const toggle = useCallback(() => setExpanded(v => !v), []);
  const templateWarnings = detectTemplateScoring(personas);

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

      {templateWarnings.length > 0 && (
        <div
          className="rounded-md border px-2.5 py-2 space-y-1"
          style={{
            background: 'color-mix(in oklch, var(--color-warning) 8%, transparent)',
            borderColor: 'color-mix(in oklch, var(--color-warning) 35%, transparent)',
          }}
          role="alert"
        >
          <p
            className="font-mono text-[9.5px] tracking-[0.14em] uppercase inline-flex items-center gap-1.5"
            style={{ color: 'var(--color-warning)' }}
            lang="th"
          >
            <AlertCircle className="w-2.5 h-2.5" strokeWidth={1.5} aria-hidden="true" />
            สัญญาณ template scoring · {templateWarnings.length}
          </p>
          <ul className="space-y-0.5 text-[11px] leading-snug" lang="th">
            {templateWarnings.map((w, i) => (
              <li key={i} style={{ color: 'var(--color-warning)' }}>• {w}</li>
            ))}
          </ul>
        </div>
      )}

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
            parentAdId={parentAdId}
          />
        ))}
      </div>
    </section>
  );
}
