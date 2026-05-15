import { Swords, Trophy, Equal, Lightbulb } from 'lucide-react';
import type { CompetitorComparison, Winner } from '../lib/schemas';

interface Props {
  readonly comparison: CompetitorComparison;
}

const WINNER_META: Record<
  Winner,
  { label: string; tone: string; icon: typeof Trophy; pillBg: string }
> = {
  ours: {
    label: 'เราชนะ',
    tone: 'text-green-300',
    icon: Trophy,
    pillBg: 'bg-green-900/30 border-green-700/50',
  },
  theirs: {
    label: 'คู่แข่งชนะ',
    tone: 'text-orange-300',
    icon: Trophy,
    pillBg: 'bg-orange-900/30 border-orange-700/50',
  },
  tie: {
    label: 'เสมอ',
    tone: 'text-gray-300',
    icon: Equal,
    pillBg: 'bg-gray-800/60 border-gray-600',
  },
};

export function CompetitorPanel({ comparison }: Props) {
  const meta = WINNER_META[comparison.winner];
  const Icon = meta.icon;

  return (
    <section
      aria-label="เปรียบเทียบกับ ad คู่แข่ง"
      className="bg-black/30 border border-gray-700 rounded-lg p-3 space-y-3"
    >
      <header className="flex items-center justify-between gap-2">
        <h4 className="text-[11px] uppercase tracking-wide text-gray-500 inline-flex items-center gap-1.5">
          <Swords className="w-3 h-3" aria-hidden="true" />
          เทียบ ad คู่แข่ง
        </h4>
        <span
          className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border ${meta.pillBg} ${meta.tone}`}
        >
          <Icon className="w-3 h-3" aria-hidden="true" />
          {meta.label}
          <span className="opacity-60">·</span>
          <span className="tabular-nums">margin {comparison.margin}/10</span>
        </span>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Side
          label="ของเราเด่นกว่า"
          items={comparison.ours_strengths}
          tone="text-green-200"
          dotColor="bg-green-500/60"
        />
        <Side
          label="คู่แข่งเด่นกว่า"
          items={comparison.theirs_strengths}
          tone="text-orange-200"
          dotColor="bg-orange-400/60"
        />
      </div>

      <div className="pt-2 border-t border-gray-800 flex items-start gap-2">
        <Lightbulb className="w-3.5 h-3.5 mt-0.5 shrink-0 text-hermes" aria-hidden="true" />
        <p className="text-xs text-gray-200 leading-relaxed">
          <span className="text-gray-500">ลองปรับ:</span> {comparison.recommendation}
        </p>
      </div>
    </section>
  );
}

interface SideProps {
  readonly label: string;
  readonly items: readonly string[];
  readonly tone: string;
  readonly dotColor: string;
}

function Side({ label, items, tone, dotColor }: SideProps) {
  if (items.length === 0) {
    return (
      <div className="text-[11px] text-gray-600 italic">— ไม่มีข้อมูล —</div>
    );
  }
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1.5">{label}</p>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className={`text-[12px] leading-relaxed flex items-start gap-1.5 ${tone}`}>
            <span className={`w-1 h-1 rounded-full mt-1.5 shrink-0 ${dotColor}`} aria-hidden="true" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
