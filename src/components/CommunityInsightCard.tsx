import { Users, TrendingUp, ShieldCheck, Share2, MessageSquareQuote, AlertCircle } from 'lucide-react';
import type { CommunitySim } from '../lib/schemas';

interface Props {
  readonly sim: CommunitySim;
}

const STANCE_COLOR_VAR: Record<'positive' | 'neutral' | 'negative', string> = {
  positive: '--color-success',
  neutral: '--color-fg-3',
  negative: '--color-danger',
};

const STANCE_LABEL_TH: Record<'positive' | 'neutral' | 'negative', string> = {
  positive: 'บวก',
  neutral: 'กลาง',
  negative: 'ลบ',
};

const MetricChip = ({
  icon,
  label,
  value,
  suffix,
  toneVar,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  suffix?: string;
  toneVar?: string;
}) => (
  <div
    className="flex-1 min-w-[120px] rounded-md border px-3 py-2.5 space-y-1"
    style={{
      background: 'var(--color-bg-sunken)',
      borderColor: 'var(--color-border-faint)',
    }}
  >
    <p
      className="font-mono text-[9.5px] tracking-[0.14em] uppercase text-fg-3 inline-flex items-center gap-1.5"
      lang="th"
    >
      {icon}
      {label}
    </p>
    <p
      className="font-mono text-lg tabular-nums font-medium"
      style={{ color: toneVar ? `var(${toneVar})` : 'var(--color-fg-1)' }}
    >
      {value}
      {suffix && <span className="text-[11px] text-fg-3 ml-1">{suffix}</span>}
    </p>
  </div>
);

export function CommunityInsightCard({ sim }: Props) {
  const { sentiment, click_intent, trust_score, virality_signal, top_objections, representative_quotes, responses_total, config } = sim;

  // For the donut: positive | neutral | negative as a single stacked bar.
  const total = Math.max(1, sentiment.positive + sentiment.neutral + sentiment.negative);
  const segs = [
    { key: 'positive' as const, value: sentiment.positive, color: 'var(--color-success)' },
    { key: 'neutral' as const, value: sentiment.neutral, color: 'var(--color-fg-3)' },
    { key: 'negative' as const, value: sentiment.negative, color: 'var(--color-danger)' },
  ];

  return (
    <section
      className="rounded-md border p-4 space-y-4"
      style={{
        background: 'var(--color-bg-elevated)',
        borderColor: 'var(--color-border-faint)',
        borderLeft: '3px solid var(--color-accent)',
      }}
    >
      {/* Header */}
      <header className="space-y-1">
        <p
          className="font-mono text-[10.5px] tracking-[0.14em] uppercase inline-flex items-center gap-1.5"
          style={{ color: 'var(--color-accent)' }}
          lang="en"
        >
          <Users className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
          Community Deep-Eval
        </p>
        <p className="text-[11px] text-fg-3" lang="th">
          จาก agents <span className="font-medium text-fg-2">{responses_total}</span> ตัว
          {' · '}
          <span className="font-medium text-fg-2">{config.agent_count}</span> agents ×{' '}
          <span className="font-medium text-fg-2">{config.rounds}</span> rounds
          {' · '}
          <span className="font-mono text-[10px] text-fg-4">{sim.sim_id.slice(0, 14)}</span>
        </p>
      </header>

      {/* Sentiment stacked bar */}
      <div className="space-y-2">
        <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-fg-3" lang="th">
          Sentiment distribution
        </p>
        <div
          role="img"
          aria-label={`บวก ${sentiment.positive}% · กลาง ${sentiment.neutral}% · ลบ ${sentiment.negative}%`}
          className="flex h-4 overflow-hidden rounded-pill border"
          style={{
            background: 'var(--color-bg-sunken)',
            borderColor: 'var(--color-border-faint)',
          }}
        >
          {segs.map(seg => (
            <div
              key={seg.key}
              style={{
                width: `${(seg.value / total) * 100}%`,
                background: seg.color,
                transition: 'width 320ms cubic-bezier(0.2, 0.7, 0.2, 1)',
              }}
              title={`${STANCE_LABEL_TH[seg.key]} ${seg.value}%`}
            />
          ))}
        </div>
        <div className="flex justify-between text-[11px] text-fg-3 font-mono tabular-nums" lang="th">
          <span style={{ color: 'var(--color-success)' }}>● บวก {sentiment.positive}%</span>
          <span>● กลาง {sentiment.neutral}%</span>
          <span style={{ color: 'var(--color-danger)' }}>● ลบ {sentiment.negative}%</span>
        </div>
      </div>

      {/* Metric chips */}
      <div className="flex flex-wrap gap-2">
        <MetricChip
          icon={<TrendingUp className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />}
          label="Click intent"
          value={String(click_intent)}
          suffix="%"
          toneVar={click_intent >= 50 ? '--color-success' : click_intent >= 25 ? '--color-warning' : '--color-danger'}
        />
        <MetricChip
          icon={<ShieldCheck className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />}
          label="Trust"
          value={trust_score.toFixed(1)}
          suffix="/ 5"
          toneVar={trust_score >= 3.5 ? '--color-success' : trust_score >= 2.5 ? '--color-warning' : '--color-danger'}
        />
        <MetricChip
          icon={<Share2 className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />}
          label="Virality"
          value={String(virality_signal)}
          suffix="%"
          toneVar={virality_signal >= 40 ? '--color-success' : virality_signal >= 20 ? '--color-warning' : '--color-fg-3'}
        />
      </div>

      {/* Top objections */}
      {top_objections.length > 0 && (
        <div className="space-y-2">
          <p
            className="font-mono text-[10px] tracking-[0.14em] uppercase text-fg-3 inline-flex items-center gap-1.5"
            lang="en"
          >
            <AlertCircle className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
            Top objections
          </p>
          <ul className="space-y-1.5">
            {top_objections.map((o, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-[12.5px] text-fg-2 leading-relaxed"
                lang="th"
              >
                <span
                  className="font-mono text-[10px] tabular-nums shrink-0 mt-0.5"
                  style={{ color: 'var(--color-warning)' }}
                >
                  ×{o.count}
                </span>
                <span>{o.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Representative quotes */}
      {representative_quotes.length > 0 && (
        <div className="space-y-2">
          <p
            className="font-mono text-[10px] tracking-[0.14em] uppercase text-fg-3 inline-flex items-center gap-1.5"
            lang="en"
          >
            <MessageSquareQuote className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
            Voices from the community
          </p>
          <ul className="space-y-2">
            {representative_quotes.map((q, i) => (
              <li
                key={i}
                className="rounded-md border-l-2 pl-3 py-1 text-[12.5px] text-fg-2 leading-relaxed"
                style={{
                  borderColor: `var(${STANCE_COLOR_VAR[q.stance]})`,
                }}
                lang="th"
              >
                <p className="italic">&ldquo;{q.text}&rdquo;</p>
                <p className="text-[10px] text-fg-4 font-mono mt-0.5">
                  — {q.persona} · {STANCE_LABEL_TH[q.stance]}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
