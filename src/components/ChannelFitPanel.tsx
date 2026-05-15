import { Sparkles } from 'lucide-react';
import { CHANNEL_LABELS, type ChannelFit } from '../lib/schemas';

interface Props {
  readonly channelFit: ChannelFit;
}

const barColor = (v: number): string => {
  if (v >= 8) return 'bg-green-500';
  if (v >= 6) return 'bg-hermes';
  return 'bg-gray-500';
};

export function ChannelFitPanel({ channelFit }: Props) {
  return (
    <section
      aria-label="ช่องทางที่เหมาะ"
      className="bg-black/30 border border-gray-700 rounded-lg p-3"
    >
      <header className="flex items-center justify-between mb-2.5">
        <h4 className="text-[11px] uppercase tracking-wide text-gray-500">
          ช่องทางที่เหมาะ
        </h4>
        <span className="text-[10px] text-hermes inline-flex items-center gap-1">
          <Sparkles className="w-2.5 h-2.5" aria-hidden="true" />
          แนะนำ {CHANNEL_LABELS[channelFit.best]}
        </span>
      </header>
      <ul className="space-y-2">
        {channelFit.ranked.map(item => {
          const isBest = item.channel === channelFit.best;
          const pct = Math.max(0, Math.min(10, item.score)) * 10;
          return (
            <li key={item.channel}>
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <span
                  className={`text-[11px] ${
                    isBest ? 'text-hermes font-medium' : 'text-gray-400'
                  }`}
                >
                  {CHANNEL_LABELS[item.channel]}
                  {isBest && <span className="ml-1 text-[9px]">★</span>}
                </span>
                <span className="text-xs font-semibold text-gray-100 tabular-nums">
                  {item.score}<span className="text-gray-600 font-normal">/10</span>
                </span>
              </div>
              <div
                className="h-1 bg-gray-800/80 rounded-full overflow-hidden"
                role="meter"
                aria-valuenow={item.score}
                aria-valuemin={0}
                aria-valuemax={10}
                aria-label={`${CHANNEL_LABELS[item.channel]} ${item.score} of 10`}
              >
                <div
                  className={`h-full ${barColor(item.score)} rounded-full transition-[width] duration-300`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-[11px] text-gray-400 leading-relaxed mt-2.5 pt-2.5 border-t border-gray-800">
        {channelFit.reasoning}
      </p>
    </section>
  );
}
