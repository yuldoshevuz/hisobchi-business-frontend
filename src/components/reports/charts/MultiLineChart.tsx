import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { colorForIndex } from './chart-colors';

export interface ChartSeries {
  key: string;
  label: string;
  values: number[];
  color?: string;
  isOther?: boolean;
}

interface MultiLineChartProps {
  /** Equal-spaced x-axis labels — one per data point. */
  xLabels: string[];
  series: ChartSeries[];
  /** CSS height for the chart canvas. Default 200. */
  height?: number;
  /** Number of horizontal grid lines (4 = 0/25/50/75/100% of max). */
  gridLines?: number;
}

const PADDING = { top: 12, right: 12, bottom: 24, left: 44 } as const;
const X_TICK_TARGET = 6; // ~6 visible x labels regardless of point count

/**
 * Lightweight area-plus-line multi-series chart, modeled after the screenshot
 * reference. Each series is plotted with a smooth path + low-opacity fill so
 * overlapping categories stay readable. We intentionally don't smooth (Bezier
 * tension) — for daily transaction data, exact peaks are more useful than a
 * pretty curve.
 *
 * Data normalisation:
 *   • All series share the same length (= xLabels.length); the backend
 *     pre-zeroes missing days so the client doesn't have to align indices.
 *   • Y-scale is shared across series to keep relative magnitudes obvious.
 */
export function MultiLineChart({
  xLabels,
  series,
  height = 200,
  gridLines = 4,
}: MultiLineChartProps): React.ReactElement {
  const width = 600; // viewBox; SVG scales to container width via preserveAspectRatio
  const innerWidth = width - PADDING.left - PADDING.right;
  const innerHeight = height - PADDING.top - PADDING.bottom;

  const flatValues = useMemo(
    () => series.flatMap((s) => s.values),
    [series],
  );
  const max = useMemo(() => {
    const m = Math.max(0, ...flatValues);
    if (m === 0) return 1;
    // Round up to the next "nice" tick so the y-axis labels look tidy.
    return niceCeil(m);
  }, [flatValues]);

  const xCount = Math.max(1, xLabels.length);
  const xStep = innerWidth / Math.max(1, xCount - 1);
  const xVisibleEvery = Math.max(1, Math.ceil(xCount / X_TICK_TARGET));

  const yTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let i = 0; i <= gridLines; i += 1) {
      ticks.push((max * i) / gridLines);
    }
    return ticks;
  }, [max, gridLines]);

  function xCoord(i: number): number {
    return PADDING.left + i * xStep;
  }
  function yCoord(value: number): number {
    return PADDING.top + innerHeight - (value / max) * innerHeight;
  }

  const seriesWithColor = series.map((s, i) => ({
    ...s,
    color: s.color ?? colorForIndex(i, s.isOther),
  }));

  return (
    <div className="w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="block w-full"
        style={{ height }}
      >
        {/* y-grid */}
        {yTicks.map((tick, i) => {
          const y = yCoord(tick);
          return (
            <g key={`grid-${i}`}>
              <line
                x1={PADDING.left}
                x2={width - PADDING.right}
                y1={y}
                y2={y}
                stroke="var(--color-border)"
                strokeDasharray={i === 0 ? undefined : '4 4'}
                strokeWidth={1}
              />
              <text
                x={PADDING.left - 6}
                y={y + 4}
                fontSize={11}
                fill="var(--color-text-secondary, #6b7280)"
                textAnchor="end"
              >
                {formatTick(tick)}
              </text>
            </g>
          );
        })}

        {/* x-axis labels (subset) */}
        {xLabels.map((label, i) => {
          if (i % xVisibleEvery !== 0 && i !== xLabels.length - 1) return null;
          return (
            <text
              key={`x-${i}`}
              x={xCoord(i)}
              y={height - 6}
              fontSize={11}
              fill="var(--color-text-secondary, #6b7280)"
              textAnchor="middle"
            >
              {label}
            </text>
          );
        })}

        {/* series */}
        {seriesWithColor.map((s) => {
          const path = pathFor(s.values, xCoord, yCoord);
          const area = areaFor(s.values, xCoord, yCoord, height - PADDING.bottom);
          return (
            <g key={s.key}>
              <path d={area} fill={s.color} fillOpacity={0.12} />
              <path
                d={path}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </g>
          );
        })}
      </svg>

      {/* legend */}
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px]">
        {seriesWithColor.map((s) => (
          <div key={`legend-${s.key}`} className="flex items-center gap-1.5">
            <span
              className={cn(
                'inline-block h-2.5 w-2.5 shrink-0 rounded-full',
              )}
              style={{ backgroundColor: s.color }}
            />
            <span className="truncate text-foreground">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function pathFor(
  values: number[],
  xCoord: (i: number) => number,
  yCoord: (v: number) => number,
): string {
  if (values.length === 0) return '';
  const parts: string[] = [];
  for (let i = 0; i < values.length; i += 1) {
    const v = values[i] ?? 0;
    parts.push(`${i === 0 ? 'M' : 'L'} ${xCoord(i)} ${yCoord(v)}`);
  }
  return parts.join(' ');
}

function areaFor(
  values: number[],
  xCoord: (i: number) => number,
  yCoord: (v: number) => number,
  baseY: number,
): string {
  if (values.length === 0) return '';
  const parts: string[] = [];
  parts.push(`M ${xCoord(0)} ${baseY}`);
  for (let i = 0; i < values.length; i += 1) {
    parts.push(`L ${xCoord(i)} ${yCoord(values[i] ?? 0)}`);
  }
  parts.push(`L ${xCoord(values.length - 1)} ${baseY} Z`);
  return parts.join(' ');
}

/**
 * Rounds up to a "nice" tick — 1 / 2 / 5 × 10^n. Avoids the awkward
 * "y-axis goes to 1,392,217" that you'd get from raw `max(...)`. Bumps to
 * the next clean step (2M in that example) so the chart feels designed.
 */
function niceCeil(value: number): number {
  if (value <= 0) return 1;
  const exponent = Math.floor(Math.log10(value));
  const base = Math.pow(10, exponent);
  const fraction = value / base;
  let nice: number;
  if (fraction <= 1) nice = 1;
  else if (fraction <= 2) nice = 2;
  else if (fraction <= 5) nice = 5;
  else nice = 10;
  return nice * base;
}

function formatTick(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(0)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toString();
}
