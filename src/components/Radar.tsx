import { scoreClass, scoreColorVar } from '../lib/score';

interface Props {
  values: number[];                          // 0..10 per axis
  labels: { name: string }[];                // same length as values
  size?: number;
  max?: number;
}

/**
 * N-axis radar chart. Polygon stroke + fill color follow the *average*
 * score across all axes; individual dots pick up each axis' own band so
 * a low-scoring persona still shows red even on a "Strong" overall ad.
 */
export function Radar({ values, labels, size = 240, max = 10 }: Props) {
  const n = values.length;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 36;

  const axisAngle = (i: number) => (i / n) * 2 * Math.PI - Math.PI / 2;
  const point = (i: number, val: number): [number, number] => {
    const a = axisAngle(i);
    const d = (val / max) * r;
    return [cx + d * Math.cos(a), cy + d * Math.sin(a)];
  };
  const labelPos = (i: number): [number, number] => {
    const a = axisAngle(i);
    const d = r + 18;
    return [cx + d * Math.cos(a), cy + d * Math.sin(a)];
  };

  const rings = [0.25, 0.5, 0.75, 1].map((f) =>
    Array.from({ length: n }, (_, i) => {
      const a = axisAngle(i);
      const d = f * r;
      return `${cx + d * Math.cos(a)},${cy + d * Math.sin(a)}`;
    }).join(' ')
  );

  const valPoints = values.map((v, i) => point(i, v).join(',')).join(' ');
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const polyColor = scoreColorVar(scoreClass(avg));

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Persona radar">
      {rings.map((pts, idx) => (
        <polygon
          key={idx}
          points={pts}
          fill="none"
          stroke="var(--color-border-faint)"
          strokeWidth={idx === rings.length - 1 ? 1 : 0.5}
        />
      ))}
      {Array.from({ length: n }, (_, i) => {
        const [x, y] = point(i, max);
        return (
          <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--color-border-faint)" strokeWidth={0.5} />
        );
      })}
      <polygon
        points={valPoints}
        fill={polyColor}
        fillOpacity={0.15}
        stroke={polyColor}
        strokeWidth={1.5}
        style={{ filter: `drop-shadow(0 0 6px ${polyColor})` }}
      />
      {values.map((v, i) => {
        const [x, y] = point(i, v);
        const c = scoreColorVar(scoreClass(v));
        return <circle key={i} cx={x} cy={y} r={3} fill={c} stroke="var(--color-bg)" strokeWidth={1} />;
      })}
      {labels.map((lbl, i) => {
        const [x, y] = labelPos(i);
        const a = axisAngle(i);
        const anchor: 'start' | 'middle' | 'end' =
          Math.abs(Math.cos(a)) < 0.3 ? 'middle' : Math.cos(a) > 0 ? 'start' : 'end';
        return (
          <g key={i}>
            <text x={x} y={y - 4} textAnchor={anchor} style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fill: 'var(--color-fg-2)' }}>
              {lbl.name}
            </text>
            <text x={x} y={y + 8} textAnchor={anchor} style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500, fill: 'var(--color-fg-1)' }}>
              {values[i].toFixed(1)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
