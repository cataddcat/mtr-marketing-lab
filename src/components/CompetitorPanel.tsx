import { Swords, Trophy, Equal, Lightbulb } from 'lucide-react';
import type { CompetitorComparison, Winner } from '../lib/schemas';

interface Props {
  readonly comparison: CompetitorComparison;
}

const WINNER_META: Record<
  Winner,
  { label: string; toneVar: string; icon: typeof Trophy }
> = {
  ours:   { label: 'เราชนะ',     toneVar: '--color-success', icon: Trophy },
  theirs: { label: 'คู่แข่งชนะ', toneVar: '--color-warning', icon: Trophy },
  tie:    { label: 'เสมอ',       toneVar: '--color-fg-3',    icon: Equal },
};

export function CompetitorPanel({ comparison }: Props) {
  const meta = WINNER_META[comparison.winner];
  const Icon = meta.icon;
  const color = `var(${meta.toneVar})`;

  return (
    <section
      aria-label="เปรียบเทียบกับ ad คู่แข่ง"
      className="rounded-md p-4 border space-y-3"
      style={{
        background: 'var(--color-bg-elevated)',
        borderColor: 'var(--color-border-faint)',
      }}
    >
      <header className="flex items-center justify-between gap-2">
        <h4 className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-3 font-medium inline-flex items-center gap-1.5">
          <Swords className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
          เทียบ ad คู่แข่ง
        </h4>
        <span
          className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-pill border"
          style={{
            color,
            background: `color-mix(in oklch, ${color} 14%, transparent)`,
            borderColor: `color-mix(in oklch, ${color} 35%, transparent)`,
          }}
        >
          <Icon className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
          <span lang="th">{meta.label}</span>
          <span className="opacity-60">·</span>
          <span className="tabular-nums font-mono">margin {comparison.margin}/10</span>
        </span>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Side
          label="ของเราเด่นกว่า"
          items={comparison.ours_strengths}
          toneVar="--color-success"
        />
        <Side
          label="คู่แข่งเด่นกว่า"
          items={comparison.theirs_strengths}
          toneVar="--color-warning"
        />
      </div>

      <div
        className="pt-3 border-t flex items-start gap-2"
        style={{ borderColor: 'var(--color-border-faint)' }}
      >
        <Lightbulb className="w-3.5 h-3.5 mt-0.5 shrink-0" strokeWidth={1.5} style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
        <p className="text-xs text-fg-2 leading-relaxed" lang="th">
          <span className="text-fg-4">ลองปรับ:</span> {comparison.recommendation}
        </p>
      </div>
    </section>
  );
}

interface SideProps {
  readonly label: string;
  readonly items: readonly string[];
  readonly toneVar: string;
}

function Side({ label, items, toneVar }: SideProps) {
  if (items.length === 0) {
    return (
      <div className="text-[11px] text-fg-4 italic" lang="th">— ไม่มีข้อมูล —</div>
    );
  }
  const color = `var(${toneVar})`;
  return (
    <div>
      <p className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-3 mb-1.5" lang="th">{label}</p>
      <ul className="space-y-1 list-none p-0">
        {items.map((it, i) => (
          <li
            key={i}
            className="text-[12px] leading-relaxed flex items-start gap-1.5"
            style={{ color }}
            lang="th"
          >
            <span
              className="w-1 h-1 rounded-full mt-1.5 shrink-0"
              style={{ background: color, opacity: 0.7 }}
              aria-hidden="true"
            />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
