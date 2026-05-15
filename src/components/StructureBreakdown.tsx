import type { StructureScore } from '../lib/schemas';

interface Props {
  readonly structure: StructureScore;
}

const barColor = (v: number): string => {
  if (v >= 8) return 'bg-green-500';
  if (v >= 6) return 'bg-hermes';
  return 'bg-orange-400/70';
};

interface PartProps {
  readonly label: string;
  readonly score: number;
  readonly critique: string;
}

function Part({ label, score, critique }: PartProps) {
  const pct = Math.max(0, Math.min(10, score)) * 10;
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <dt className="text-[11px] uppercase tracking-wide text-gray-400 font-medium">
          {label}
        </dt>
        <dd className="text-xs font-semibold text-gray-100 tabular-nums">
          {score}<span className="text-gray-600 font-normal">/10</span>
        </dd>
      </div>
      <div
        className="h-1.5 bg-gray-800/80 rounded-full overflow-hidden"
        role="meter"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={10}
        aria-label={`${label} ${score} of 10`}
      >
        <div
          className={`h-full ${barColor(score)} rounded-full transition-[width] duration-300`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[11px] text-gray-400 leading-relaxed">{critique}</p>
    </div>
  );
}

export function StructureBreakdown({ structure }: Props) {
  return (
    <section
      aria-label="โครงสร้างโฆษณา (Hook / Body / CTA)"
      className="bg-black/30 border border-gray-700 rounded-lg p-3"
    >
      <header className="flex items-center justify-between mb-2.5">
        <h4 className="text-[11px] uppercase tracking-wide text-gray-500">
          โครงสร้างโฆษณา
        </h4>
        <span className="text-[10px] text-gray-600">Hook · Body · CTA</span>
      </header>
      <dl className="space-y-3">
        <Part label="Hook"
              score={structure.hook_score}
              critique={structure.hook_critique} />
        <Part label="Body"
              score={structure.body_score}
              critique={structure.body_critique} />
        <Part label="CTA"
              score={structure.cta_score}
              critique={structure.cta_critique} />
      </dl>
    </section>
  );
}
