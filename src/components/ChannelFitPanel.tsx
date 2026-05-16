import { Sparkles } from 'lucide-react';
import { CHANNEL_LABELS, type ChannelFit } from '../lib/schemas';
import { ScoreBar } from './ScoreBar';
import { scoreClass, scoreColorVar } from '../lib/score';

interface Props {
  readonly channelFit: ChannelFit;
}

export function ChannelFitPanel({ channelFit }: Props) {
  return (
    <section
      aria-label="ช่องทางที่เหมาะ"
      className="rounded-md p-4 border"
      style={{
        background: 'var(--color-bg-elevated)',
        borderColor: 'var(--color-border-faint)',
      }}
    >
      <header className="flex items-center justify-between mb-3 pb-3 border-b" style={{ borderColor: 'var(--color-border-faint)' }}>
        <h4 className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-fg-3 font-medium">
          ช่องทางที่เหมาะ
        </h4>
        <span
          className="font-mono text-[10px] tracking-[0.08em] uppercase inline-flex items-center gap-1"
          style={{ color: 'var(--color-accent)' }}
        >
          <Sparkles className="w-2.5 h-2.5" strokeWidth={1.5} aria-hidden="true" />
          {CHANNEL_LABELS[channelFit.best]}
        </span>
      </header>
      <ul className="space-y-2.5 list-none p-0">
        {channelFit.ranked.map((item) => {
          const isBest = item.channel === channelFit.best;
          const cls = scoreClass(item.score);
          return (
            <li key={item.channel}>
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <span
                  className="text-[12px]"
                  style={{
                    color: isBest ? 'var(--color-accent)' : 'var(--color-fg-2)',
                    fontWeight: isBest ? 500 : 400,
                  }}
                >
                  {CHANNEL_LABELS[item.channel]}
                  {isBest && <span className="ml-1 text-[9px]">★</span>}
                </span>
                <span
                  className="font-mono text-xs font-medium tabular-nums"
                  style={{ color: scoreColorVar(cls) }}
                >
                  {item.score}<span className="text-fg-4 text-[10px] font-normal">/10</span>
                </span>
              </div>
              <ScoreBar value={item.score} size="thin" />
            </li>
          );
        })}
      </ul>
      <p
        className="text-[12px] text-fg-2 leading-relaxed mt-3 pt-3 border-t"
        style={{ borderColor: 'var(--color-border-faint)' }}
        lang="th"
      >
        {channelFit.reasoning}
      </p>
    </section>
  );
}
