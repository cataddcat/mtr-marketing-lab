import { Microscope } from 'lucide-react';
import type { EnsembleMeta } from '../lib/schemas';

interface Props {
  readonly meta: EnsembleMeta;
}

export function EnsembleBadge({ meta }: Props) {
  const { runs, variance } = meta;
  const unstableCount = variance.unstable_fields.length;
  const stable = unstableCount === 0;

  const tone = stable
    ? 'border-green-700/40 text-green-300 bg-green-900/20'
    : variance.max_std > 2
      ? 'border-orange-700/50 text-orange-200 bg-orange-900/20'
      : 'border-amber-700/40 text-amber-200 bg-amber-900/15';

  const label = stable
    ? 'คะแนนนิ่ง'
    : variance.max_std > 2
      ? `คะแนนกระจาย (${unstableCount} ฟิลด์)`
      : `คะแนนเริ่มคุม (${unstableCount} ฟิลด์)`;

  const tooltip = stable
    ? `วิเคราะห์ ${runs} รอบ — std สูงสุด ${variance.max_std.toFixed(1)}, ทุก field สอดคล้องกัน`
    : `วิเคราะห์ ${runs} รอบ — std สูงสุด ${variance.max_std.toFixed(1)}\nฟิลด์ที่กระจาย: ${variance.unstable_fields.join(', ')}`;

  return (
    <span
      title={tooltip}
      className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full border ${tone}`}
    >
      <Microscope className="w-3 h-3" aria-hidden="true" />
      <span className="font-medium">{runs} รอบ</span>
      <span className="opacity-60">·</span>
      <span>{label}</span>
    </span>
  );
}
