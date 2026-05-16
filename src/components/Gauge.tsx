import { scoreClass, scoreColorVar } from '../lib/score';

interface Props {
  value: number;         // 0..10
  size?: number;         // px
  label?: string;        // e.g. "/10"
}

/**
 * 270° arc gauge with center number. Used for the panel verdict score.
 * Arc color follows the scoreClass; glow halo via drop-shadow.
 */
export function Gauge({ value, size = 170, label = '/10' }: Props) {
  const cls = scoreClass(value);
  const color = scoreColorVar(cls);

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 12;
  const startA = 135;
  const endA = 405;
  const sweep = endA - startA;
  const valA = startA + (Math.max(0, Math.min(10, value)) / 10) * sweep;

  const polar = (a: number): [number, number] => {
    const rad = ((a - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  };
  const arc = (a1: number, a2: number) => {
    const [x1, y1] = polar(a1);
    const [x2, y2] = polar(a2);
    const large = a2 - a1 > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`Score ${value.toFixed(1)} of 10`}
    >
      <path d={arc(startA, endA)} fill="none" stroke="var(--color-bg-sunken)" strokeWidth={10} strokeLinecap="round" />
      <path d={arc(startA, endA)} fill="none" stroke="var(--color-border)" strokeWidth={1} />

      {value > 0 && (
        <path
          d={arc(startA, valA)}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      )}

      <text
        x={cx}
        y={cy + 2}
        textAnchor="middle"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: size * 0.32,
          fontWeight: 500,
          letterSpacing: '-0.02em',
          fill: 'var(--color-fg-1)',
        }}
      >
        {value.toFixed(1)}
      </text>
      <text
        x={cx}
        y={cy + size * 0.18}
        textAnchor="middle"
        style={{ fontFamily: 'var(--font-mono)', fontSize: size * 0.08, fill: 'var(--color-fg-3)' }}
      >
        {label}
      </text>
    </svg>
  );
}

export function MiniGauge({ value, size = 88 }: { value: number; size?: number }) {
  const cls = scoreClass(value);
  const color = scoreColorVar(cls);

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 6;
  const startA = 135;
  const endA = 405;
  const sweep = endA - startA;
  const valA = startA + (Math.max(0, Math.min(10, value)) / 10) * sweep;

  const polar = (a: number): [number, number] => {
    const rad = ((a - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  };
  const arc = (a1: number, a2: number) => {
    const [x1, y1] = polar(a1);
    const [x2, y2] = polar(a2);
    const large = a2 - a1 > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Score ${value > 0 ? value.toFixed(1) : 'not scored'}`}>
      <path d={arc(startA, endA)} fill="none" stroke="var(--color-bg-sunken)" strokeWidth={6} strokeLinecap="round" />
      {value > 0 && (
        <path
          d={arc(startA, valA)}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${color})` }}
        />
      )}
      <text
        x={cx}
        y={cy + 5}
        textAnchor="middle"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: size * 0.34,
          fontWeight: 500,
          fill: 'var(--color-fg-1)',
        }}
      >
        {value > 0 ? value.toFixed(1) : '—'}
      </text>
    </svg>
  );
}
