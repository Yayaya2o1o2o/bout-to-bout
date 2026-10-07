import { useMemo } from 'react';
import { histogram } from '@/lib/calc';

const fmt = (n: number) => String(Math.round(n));

/** Distribution of simulated waits. Bars inside the likely range are ink, the rest are faint. */
export function Histogram({
  samples,
  low,
  high,
  median,
  bins = 30,
  compact = false,
}: {
  samples: number[];
  low: number;
  high: number;
  median: number;
  bins?: number;
  compact?: boolean;
}) {
  const { counts, min, max } = useMemo(() => histogram(samples, bins), [samples, bins]);
  const peak = Math.max(1, ...counts);
  const W = 600;
  const H = compact ? 120 : 170;
  const bw = W / Math.max(1, counts.length);
  const x = (v: number) => ((v - min) / (max - min)) * W;
  const constant = max - min < 0.6;

  return (
    <figure className="hist">
      <svg viewBox={`0 0 ${W} ${H + 26}`} role="img" aria-label={`Simulated waits from ${fmt(min)} to ${fmt(max)} minutes. Most land between ${fmt(low)} and ${fmt(high)}.`}>
        {counts.map((c, i) => {
          const mid = min + (i + 0.5) * ((max - min) / counts.length);
          const inRange = mid >= low && mid <= high;
          const h = constant ? (i === 0 ? H : 0) : (c / peak) * H;
          return (
            <rect
              key={i}
              x={i * bw + 1.5}
              y={0}
              width={Math.max(1, bw - 3)}
              height={H}
              rx={3}
              className={inRange ? 'bar in' : 'bar'}
              style={{ transform: `scaleY(${Math.max(0.002, h / H)})`, transitionDelay: `${i * 12}ms` }}
            />
          );
        })}
        {!constant && (
          <g className="hist-mid" style={{ transform: `translateX(${x(median)}px)` }}>
            <line x1={0} x2={0} y1={-2} y2={H} />
          </g>
        )}
        <text x={0} y={H + 20} className="hist-axis">
          {fmt(min)} min
        </text>
        <text x={W} y={H + 20} textAnchor="end" className="hist-axis">
          {fmt(max)} min
        </text>
      </svg>
    </figure>
  );
}

export function RangeBar({ low, high, median }: { low: number; high: number; median: number }) {
  const scale = Math.max(10, high * 1.25);
  const pct = (v: number) => `${Math.min(100, (v / scale) * 100)}%`;
  return (
    <div className="range" aria-hidden="true">
      <div className="range-track">
        <div className="range-band" style={{ left: pct(low), width: `calc(${pct(high)} - ${pct(low)})` }} />
        <div className="range-mid" style={{ left: pct(median) }} />
      </div>
      <div className="range-scale num">
        <span>now</span>
        <span>{Math.round(scale)} min</span>
      </div>
    </div>
  );
}

export function Ring({ progress, size = 92 }: { progress: number; size?: number }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="ring" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} className="ring-bg" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        className="ring-fg"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.min(1, Math.max(0, progress)))}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}
