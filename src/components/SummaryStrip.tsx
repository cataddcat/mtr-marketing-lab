import type { AdIdea } from '../services/marketing-agent';
import type { AdEvaluation } from '../lib/schemas';
import { MiniGauge } from './Gauge';
import { scoreClass, scoreLabel, scoreColorVar, scoreBgVar } from '../lib/score';

interface Props {
  readonly ads: readonly AdIdea[];
  readonly evaluations: Record<number, AdEvaluation>;
}

export function SummaryStrip({ ads, evaluations }: Props) {
  if (ads.length === 0) return null;
  return (
    <div
      role="list"
      aria-label="Variations at a glance"
      className="grid gap-3 mb-5"
      style={{ gridTemplateColumns: `repeat(${Math.min(ads.length, 3)}, minmax(0, 1fr))` }}
    >
      {ads.map((ad, i) => {
        const s = evaluations[i]?.average_score;
        const cls = s != null ? scoreClass(s) : null;
        return (
          <div
            key={ad.clientId}
            role="listitem"
            className="rounded-md p-4 grid items-center"
            style={{
              gridTemplateColumns: '88px 1fr',
              gap: '16px',
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
            }}
          >
            <MiniGauge value={s ?? 0} />
            <div className="flex flex-col gap-2 min-w-0">
              <span className="font-mono text-[10.5px] tracking-[0.16em] uppercase text-fg-3">
                0{i + 1} · {ad.style}
              </span>
              <span
                className="inline-flex items-center self-start px-2 py-0.5 rounded-pill font-mono text-[10.5px] tracking-[0.08em] uppercase"
                style={{
                  background: scoreBgVar(cls),
                  color: scoreColorVar(cls),
                  border: '1px solid var(--color-border-faint)',
                }}
              >
                {cls ? scoreLabel(s) : 'Not scored'}
              </span>
              <p className="text-[12.5px] leading-snug text-fg-2 line-clamp-2" lang="th">
                {ad.copy.split('\n')[0]}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
