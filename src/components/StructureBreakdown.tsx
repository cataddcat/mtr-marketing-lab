import type { StructureScore } from '../lib/schemas';
import { LevelMeter } from './LevelMeter';
import { scoreClass, scoreColorVar } from '../lib/score';

interface Props {
  readonly structure: StructureScore;
}

interface PartProps {
  readonly label: string;
  readonly score: number;
  readonly critique: string;
}

function Part({ label, score, critique }: PartProps) {
  const cls = scoreClass(score);
  return (
    <div
      className="space-y-2 py-3 border-t first:border-t-0 first:pt-0 last:pb-0"
      style={{ borderColor: 'var(--color-border-faint)' }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <dt className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-3 font-medium">
          {label}
        </dt>
        <dd
          className="font-mono text-sm font-medium tabular-nums"
          style={{ color: scoreColorVar(cls) }}
        >
          {score}<span className="text-fg-4 text-[10px] font-normal">/10</span>
        </dd>
      </div>
      <LevelMeter value={score} />
      <p className="text-[12.5px] text-fg-2 leading-relaxed" lang="th">{critique}</p>
    </div>
  );
}

export function StructureBreakdown({ structure }: Props) {
  return (
    <section
      aria-label="โครงสร้างโฆษณา (Hook / Body / CTA)"
      className="rounded-md p-4 border"
      style={{
        background: 'var(--color-bg-elevated)',
        borderColor: 'var(--color-border-faint)',
      }}
    >
      <header className="flex items-center justify-between mb-3 pb-3 border-b" style={{ borderColor: 'var(--color-border-faint)' }}>
        <h4 className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-3 font-medium">
          โครงสร้าง
        </h4>
        <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-fg-4">
          Hook · Body · CTA
        </span>
      </header>
      <dl className="space-y-0">
        <Part label="Hook" score={structure.hook_score} critique={structure.hook_critique} />
        <Part label="Body" score={structure.body_score} critique={structure.body_critique} />
        <Part label="CTA"  score={structure.cta_score}  critique={structure.cta_critique} />
      </dl>
    </section>
  );
}
