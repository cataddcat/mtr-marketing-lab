import { scoreClass, scoreColorVar } from '../lib/score';

interface Props {
  value: number;            // 0..10
  size?: 'thin' | 'base' | 'thick';
}

/**
 * Horizontal score bar — fill width = value/10, fill color from scoreClass.
 * Tailwind v4: token-driven via inline CSS. No utility-class soup.
 */
export function ScoreBar({ value, size = 'base' }: Props) {
  const cls = scoreClass(value);
  const color = scoreColorVar(cls);
  const pct = Math.max(0, Math.min(100, (value / 10) * 100));
  const h = size === 'thin' ? 4 : size === 'thick' ? 10 : 6;

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={10}
      className="overflow-hidden rounded-pill border"
      style={{
        height: h,
        background: 'var(--color-bg-sunken)',
        borderColor: 'var(--color-border-faint)',
      }}
    >
      <div
        className="h-full rounded-pill"
        style={{
          width: `${pct}%`,
          background: color,
          boxShadow: cls ? `0 0 8px color-mix(in oklch, ${color} 40%, transparent)` : 'none',
          transition: 'width 320ms cubic-bezier(0.2, 0.7, 0.2, 1)',
        }}
      />
    </div>
  );
}
