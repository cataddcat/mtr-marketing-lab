import { AlertTriangle, FileWarning, ShieldQuestion } from 'lucide-react';

interface Props {
  readonly flags: readonly string[];
}

interface FlagMeta {
  readonly label: string;
  readonly tooltip: string;
  readonly toneVar: string;
  readonly icon: typeof AlertTriangle;
}

// Maps client-side detector output (detectQualityFlags in marketing-agent.ts)
// to human-readable pills. Unknown flag strings render as raw text in a
// neutral pill so future detectors don't need a UI update to surface at all.
const FLAG_META: Record<string, FlagMeta> = {
  'template-pattern': {
    label: 'อาจใช้ template',
    tooltip:
      'คะแนนของทุก persona มี pattern [N, N-1, N-1] เรียงตามมิติเดียวกัน — Judge อาจ default ลด lazy. ลอง Deep eval ดูว่าคะแนนจริงเปลี่ยนไหม',
    toneVar: '--color-warning',
    icon: FileWarning,
  },
  'pleaser-bias': {
    label: 'ไม่มีจุดอ่อนเลย',
    tooltip:
      'ทุก persona ให้คะแนน ≥5 ทุกมิติ — ของจริง ad เกือบทุกตัวมีจุดอ่อนสักที่ Judge อาจเป็น "pleaser" ไม่ critique จริง',
    toneVar: '--color-warning',
    icon: AlertTriangle,
  },
  'low-confidence-panel': {
    label: 'panel ไม่แน่ใจ',
    tooltip:
      'persona ส่วนใหญ่ระบุ confidence=low — ad อาจคลุมเครือ ตีความได้หลายแบบ คะแนนนี้ไม่ควรเป็น decision basis',
    toneVar: '--color-info',
    icon: ShieldQuestion,
  },
};

export function QualityFlagsBadge({ flags }: Props) {
  if (flags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 justify-center" role="status" aria-live="polite">
      {flags.map(flag => {
        const meta = FLAG_META[flag];
        if (!meta) {
          return (
            <span
              key={flag}
              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-pill border font-mono"
              style={{
                color: 'var(--color-fg-3)',
                background: 'var(--color-bg-sunken)',
                borderColor: 'var(--color-border-faint)',
              }}
            >
              {flag}
            </span>
          );
        }
        const color = `var(${meta.toneVar})`;
        const Icon = meta.icon;
        return (
          <span
            key={flag}
            title={meta.tooltip}
            lang="th"
            className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-pill border"
            style={{
              color,
              background: `color-mix(in oklch, ${color} 12%, transparent)`,
              borderColor: `color-mix(in oklch, ${color} 35%, transparent)`,
            }}
          >
            <Icon className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
            <span className="font-medium">{meta.label}</span>
          </span>
        );
      })}
    </div>
  );
}
