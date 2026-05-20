import { Users, AlertCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { CommunitySim } from '../lib/schemas';

interface Props {
  readonly sim: CommunitySim;
}

export function CommunityInsightCard({ sim }: Props) {
  const {
    sentiment,
    click_intent,
    trust_score,
    virality_signal,
    top_objections,
    responses_total,
    config,
  } = sim;
  const [statsExpanded, setStatsExpanded] = useState(false);

  // ── Convergence math — the actual signal we trust ──────────────────
  const top1 = top_objections[0];
  const top1Pct = top1 ? Math.round((top1.count / Math.max(1, responses_total)) * 100) : 0;
  const totalObjections = top_objections.reduce((sum, o) => sum + o.count, 0);
  const totalObjectionPct = Math.round((totalObjections / Math.max(1, responses_total)) * 100);
  const sentimentTotal = Math.max(1, sentiment.positive + sentiment.neutral + sentiment.negative);

  // ── Quality warnings ───────────────────────────────────────────────
  const warnings: string[] = [];
  const dominantStance = Math.max(sentiment.positive, sentiment.neutral, sentiment.negative);
  if (dominantStance >= 90) {
    warnings.push(
      'Sentiment กระจุก ≥ 90% ในขั้วเดียว — LLM pleaser bias มากกว่าตลาดจริง · ดู objection เป็นหลัก',
    );
  }
  if (responses_total < 12) {
    warnings.push(
      `Sample เล็ก (${responses_total} responses) — แนะนำ agent_count ≥ 20, rounds ≥ 12`,
    );
  }
  if (click_intent === 100 && responses_total >= 5) {
    warnings.push('Click intent = 100% — LLM ceiling · คนจริงคลิกแค่ 1-3%');
  }
  if (virality_signal === 100 && responses_total >= 5) {
    warnings.push('Virality = 100% — share rate จริงในไทย < 5%');
  }
  if (top_objections.length > 0 && sentiment.positive >= 80 && totalObjectionPct >= 20) {
    warnings.push(`ขัดแย้ง: ${totalObjectionPct}% มี objection แต่ positive ${sentiment.positive}%`);
  }

  return (
    <section
      className="rounded-md border p-3 space-y-3"
      style={{
        background: 'var(--color-bg-elevated)',
        borderColor: 'var(--color-border-faint)',
        borderLeft: '3px solid var(--color-accent)',
      }}
    >
      {/* Header */}
      <header className="space-y-1">
        <div className="flex items-baseline justify-between gap-2 flex-wrap">
          <p
            className="font-mono text-[10px] tracking-[0.14em] uppercase inline-flex items-center gap-1.5"
            style={{ color: 'var(--color-accent)' }}
            lang="en"
          >
            <Users className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
            Community Deep-Eval · Pre-flight smoke test
          </p>
          <p className="text-[9.5px] text-fg-4 font-mono tabular-nums">
            {responses_total} agents · {config.agent_count}×{config.rounds}
          </p>
        </div>
        <p
          className="text-[10.5px] text-fg-3 leading-snug inline-flex items-start gap-1"
          lang="th"
        >
          <Info className="w-2.5 h-2.5 mt-0.5 shrink-0" strokeWidth={1.5} aria-hidden="true" />
          <span>
            ใช้เป็น indicator <b className="text-fg-2">ทิศทาง</b> ก่อนยิง ad — อ่าน objection convergence เป็นหลัก
            · stats เป็น LLM forecast ไม่ใช่ market truth
          </span>
        </p>
      </header>

      {/* Quality warnings */}
      {warnings.length > 0 && (
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
            สัญญาณคุณภาพข้อมูล · {warnings.length}
          </p>
          <ul className="space-y-0.5 text-[11px] leading-snug" lang="th">
            {warnings.map((w, i) => (
              <li key={i} style={{ color: 'var(--color-warning)' }}>• {w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ═══ HERO: Objection convergence — main insight ═══ */}
      {top_objections.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <p
              className="font-mono text-[10px] tracking-[0.14em] uppercase inline-flex items-center gap-1.5"
              style={{ color: 'var(--color-accent)' }}
              lang="en"
            >
              <AlertCircle className="w-2.5 h-2.5" strokeWidth={1.5} aria-hidden="true" />
              Objection convergence
            </p>
            <p className="text-[10px] text-fg-3 font-mono tabular-nums" lang="th">
              {totalObjectionPct}% มี objection
            </p>
          </div>
          <ul className="space-y-0.5">
            {top_objections.map((o, i) => {
              const pct = Math.round((o.count / Math.max(1, responses_total)) * 100);
              const isLeader = i === 0 && pct >= 25;
              return (
                <li
                  key={i}
                  className="rounded px-2 py-1 flex items-baseline gap-2.5"
                  style={{
                    background: isLeader
                      ? 'color-mix(in oklch, var(--color-accent) 8%, transparent)'
                      : 'var(--color-bg-sunken)',
                  }}
                  lang="th"
                >
                  <span
                    className="font-mono text-[12px] tabular-nums font-medium shrink-0"
                    style={{
                      minWidth: '36px',
                      color: isLeader ? 'var(--color-accent)' : 'var(--color-fg-2)',
                    }}
                  >
                    {pct}%
                  </span>
                  <span className="font-mono text-[9.5px] text-fg-4 tabular-nums shrink-0">
                    ×{o.count}
                  </span>
                  <span className="text-[11.5px] text-fg-1 leading-snug flex-1 min-w-0">
                    {o.text}
                  </span>
                </li>
              );
            })}
          </ul>
          {top1 && top1Pct >= 40 && (
            <p
              className="text-[10.5px] leading-snug pl-2"
              style={{ color: 'var(--color-accent)' }}
              lang="th"
            >
              ⚡ Strong convergence ({top1Pct}%) — แก้ประเด็นนี้ใน hook/body ก่อนยิงจริง
            </p>
          )}
        </div>
      )}

      {/* ─── Stats footer · collapsed by default ─── */}
      <div
        className="rounded-md border"
        style={{
          background: 'var(--color-bg-sunken)',
          borderColor: 'var(--color-border-faint)',
        }}
      >
        <button
          type="button"
          onClick={() => setStatsExpanded(prev => !prev)}
          className="w-full px-2.5 py-1.5 flex items-center justify-between gap-2 text-fg-4 hover:text-fg-2 transition-colors"
        >
          <span
            className="font-mono text-[9.5px] tracking-[0.14em] uppercase inline-flex items-center gap-1.5"
            lang="th"
          >
            <Info className="w-2.5 h-2.5" strokeWidth={1.5} aria-hidden="true" />
            LLM stats (forecast เท่านั้น — อย่ายึดเป็น market truth)
          </span>
          {statsExpanded ? (
            <ChevronUp className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
          ) : (
            <ChevronDown className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
          )}
        </button>
        {statsExpanded && (
          <div className="px-2.5 pb-2.5 space-y-2">
            <div className="space-y-1">
              <p className="font-mono text-[9px] tracking-[0.14em] uppercase text-fg-4" lang="th">
                Sentiment
              </p>
              <div
                role="img"
                aria-label={`บวก ${sentiment.positive}% · กลาง ${sentiment.neutral}% · ลบ ${sentiment.negative}%`}
                className="flex h-1.5 overflow-hidden rounded-pill"
                style={{ background: 'var(--color-bg)' }}
              >
                <div style={{ width: `${(sentiment.positive / sentimentTotal) * 100}%`, background: 'var(--color-success)' }} />
                <div style={{ width: `${(sentiment.neutral / sentimentTotal) * 100}%`, background: 'var(--color-fg-3)' }} />
                <div style={{ width: `${(sentiment.negative / sentimentTotal) * 100}%`, background: 'var(--color-danger)' }} />
              </div>
              <div className="flex justify-between text-[9.5px] text-fg-4 font-mono tabular-nums" lang="th">
                <span>บวก {sentiment.positive}</span>
                <span>กลาง {sentiment.neutral}</span>
                <span>ลบ {sentiment.negative}</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <StatChip label="Click" value={`${click_intent}%`} />
              <StatChip label="Trust" value={`${trust_score.toFixed(1)}/5`} />
              <StatChip label="Virality" value={`${virality_signal}%`} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function StatChip({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div
      className="rounded border px-1.5 py-1 text-center"
      style={{
        background: 'var(--color-bg)',
        borderColor: 'var(--color-border-faint)',
      }}
    >
      <p
        className="font-mono text-[8.5px] tracking-[0.12em] uppercase text-fg-4"
        lang="th"
      >
        {label}
      </p>
      <p className="font-mono text-[12px] tabular-nums text-fg-2 mt-0.5">{value}</p>
    </div>
  );
}
