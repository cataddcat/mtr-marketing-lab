import { scoreClass } from '../lib/score';

interface Props {
  value: number; // 0..10
}

/**
 * 10-cell segmented level meter. Clearer than a thin bar for integer-feeling
 * scores like the Judge's structure breakdown (Hook / Body / CTA).
 */
export function LevelMeter({ value }: Props) {
  const cls = scoreClass(value);
  const on = Math.round(Math.max(0, Math.min(10, value)));
  const fillColor = ({
    bad: 'var(--color-danger)',
    warn: 'var(--color-warning)',
    ok: 'var(--color-info)',
    good: 'var(--color-success)',
    great: 'var(--color-great)',
  } as const)[cls ?? 'ok'];

  return (
    <div
      className="grid grid-cols-10 gap-[2px]"
      style={{ height: 10 }}
      aria-label={`Level ${on}/10`}
    >
      {Array.from({ length: 10 }, (_, i) => {
        const lit = i < on;
        return (
          <span
            key={i}
            className="block rounded-[1px] border"
            style={{
              background: lit ? fillColor : 'var(--color-bg-sunken)',
              borderColor: lit ? fillColor : 'var(--color-border-faint)',
            }}
          />
        );
      })}
    </div>
  );
}
