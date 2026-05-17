import { Sparkles, Target, Compass, Gauge as GaugeIcon } from 'lucide-react';
import { CHANNEL_LABELS, type StrategyFit } from '../lib/schemas';
import { ScoreBar } from './ScoreBar';
import { scoreClass, scoreColorVar } from '../lib/score';

interface Props {
  readonly strategyFit: StrategyFit;
}

const BUCKET_LABEL = {
  above: 'เหนือ benchmark',
  on: 'เท่า benchmark',
  below: 'ต่ำกว่า benchmark',
} as const;

const BUCKET_COLOR_VAR = {
  above: 'var(--color-success)',
  on: 'var(--color-info)',
  below: 'var(--color-warning)',
} as const;

export function StrategyFitPanel({ strategyFit }: Props) {
  const positioningCls = scoreClass(strategyFit.positioning_score);
  const whitespaceCls = scoreClass(strategyFit.whitespace_capture);
  const ba = strategyFit.benchmark_alignment;
  const bucketColor = BUCKET_COLOR_VAR[ba.vs_benchmark];

  return (
    <section
      aria-label="Strategy fit"
      className="rounded-md p-4 border"
      style={{
        background: 'var(--color-bg-elevated)',
        borderColor: 'var(--color-border-faint)',
      }}
    >
      <header
        className="flex items-center justify-between mb-3 pb-3 border-b"
        style={{ borderColor: 'var(--color-border-faint)' }}
      >
        <h4 className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-3 font-medium inline-flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
          Strategy fit
        </h4>
        <span
          className="font-mono text-[9.5px] tracking-[0.10em] uppercase px-1.5 py-0.5 rounded-pill"
          style={{
            background: 'color-mix(in oklch, var(--color-accent) 10%, transparent)',
            color: 'var(--color-accent)',
          }}
        >
          per brief
        </span>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <ScoreCell
          icon={<Compass className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />}
          label="Positioning fit"
          value={strategyFit.positioning_score}
          color={scoreColorVar(positioningCls)}
        />
        <ScoreCell
          icon={<Target className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />}
          label="Whitespace capture"
          value={strategyFit.whitespace_capture}
          color={scoreColorVar(whitespaceCls)}
        />
      </div>

      <div className="mt-2 grid gap-2 text-[12px] text-fg-2 leading-relaxed" lang="th">
        <p>
          <span className="text-fg-4">positioning:</span> {strategyFit.positioning_critique}
        </p>
        <p>
          <span className="text-fg-4">whitespace:</span> {strategyFit.whitespace_critique}
        </p>
      </div>

      {strategyFit.jtbd_coverage.length > 0 && (
        <div
          className="mt-3 pt-3 border-t"
          style={{ borderColor: 'var(--color-border-faint)' }}
        >
          <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-fg-3 mb-2">
            JTBD coverage per segment
          </p>
          <ul className="space-y-2.5 list-none p-0">
            {strategyFit.jtbd_coverage.map((item, i) => {
              const cls = scoreClass(item.score);
              return (
                <li key={`${item.segment_name}-${i}`}>
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <span className="text-[12px] text-fg-2 truncate" lang="th">
                      {item.segment_name}
                    </span>
                    <span
                      className="font-mono text-xs font-medium tabular-nums shrink-0"
                      style={{ color: scoreColorVar(cls) }}
                    >
                      {item.score}
                      <span className="text-fg-4 text-[10px] font-normal">/10</span>
                    </span>
                  </div>
                  <ScoreBar value={item.score} size="thin" />
                  {item.gap && item.gap !== '—' && (
                    <p className="text-[11px] text-fg-3 mt-1 leading-relaxed" lang="th">
                      gap: {item.gap}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div
        className="mt-3 pt-3 border-t flex items-start gap-2"
        style={{ borderColor: 'var(--color-border-faint)' }}
      >
        <GaugeIcon
          className="w-3.5 h-3.5 mt-0.5 shrink-0"
          strokeWidth={1.5}
          style={{ color: bucketColor }}
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <p className="text-[12px] text-fg-1 leading-snug">
            <span className="font-mono tabular-nums" style={{ color: bucketColor }}>
              {ba.estimated_ctr_pct.toFixed(2)}% CTR
            </span>
            <span className="text-fg-3"> · {CHANNEL_LABELS[ba.channel]} · </span>
            <span style={{ color: bucketColor }}>{BUCKET_LABEL[ba.vs_benchmark]}</span>
          </p>
          <p className="text-[11px] text-fg-3 mt-0.5 leading-relaxed" lang="th">
            {ba.note}
          </p>
        </div>
      </div>
    </section>
  );
}

function ScoreCell({
  icon,
  label,
  value,
  color,
}: {
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly value: number;
  readonly color: string;
}) {
  return (
    <div
      className="rounded-md p-2.5 border"
      style={{
        background: 'var(--color-bg-sunken)',
        borderColor: 'var(--color-border-faint)',
      }}
    >
      <div className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-fg-3 inline-flex items-center gap-1 mb-1.5">
        {icon}
        {label}
      </div>
      <div
        className="font-mono text-xl font-medium tabular-nums leading-none"
        style={{ color }}
      >
        {value.toFixed(1)}
        <span className="text-fg-4 text-[11px] font-normal">/10</span>
      </div>
      <div className="mt-2">
        <ScoreBar value={value} size="thin" />
      </div>
    </div>
  );
}
