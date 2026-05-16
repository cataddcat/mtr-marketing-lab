import { Microscope } from 'lucide-react';
import type { EnsembleMeta } from '../lib/schemas';

interface Props {
  readonly meta: EnsembleMeta;
}

export function EnsembleBadge({ meta }: Props) {
  const { runs, variance } = meta;
  const unstableCount = variance.unstable_fields.length;
  const stable = unstableCount === 0;

  const toneVar = stable
    ? '--color-success'
    : variance.max_std > 2
      ? '--color-warning'
      : '--color-gold-500';

  const color = `var(${toneVar})`;

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
      lang="th"
      className="inline-flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-pill border"
      style={{
        color,
        background: `color-mix(in oklch, ${color} 12%, transparent)`,
        borderColor: `color-mix(in oklch, ${color} 35%, transparent)`,
      }}
    >
      <Microscope className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
      <span className="font-medium font-mono">{runs} รอบ</span>
      <span className="opacity-60">·</span>
      <span>{label}</span>
    </span>
  );
}
