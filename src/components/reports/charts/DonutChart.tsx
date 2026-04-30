import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/format';
import { colorForIndex } from './chart-colors';

export interface DonutSlice {
  key: string;
  label: string;
  value: number;
  color?: string;
  /** Marks "Boshqalar" so it picks up the muted slate color. */
  isOther?: boolean;
}

interface DonutChartProps {
  slices: DonutSlice[];
  /** Currency code displayed in the center label and the tooltip. */
  currency: string;
  /**
   * Optional title shown in the center when no slice is hovered. When a slice
   * is active, the center swaps to that slice's name + amount.
   */
  centerLabel?: string;
  /** Diameter in CSS px. Default 220. */
  size?: number;
}

const STROKE_WIDTH_RATIO = 0.22; // donut "thickness"
const HOVER_LIFT = 6; // outward radial offset for the active slice

/**
 * Lightweight SVG donut. Built from scratch instead of pulling in a chart
 * library — the data shape is small, the visual is fixed, and we want
 * pixel-perfect control over the brand palette + tap interactions on
 * Telegram WebApp's resource-constrained webview.
 *
 * Behaviour:
 *   • Click a slice → it lifts outward and the center label swaps to the
 *     slice's name + value. Click again to dismiss.
 *   • Hover does the same on desktop (mouseenter/leave).
 *   • Total ≤ 0 (e.g. all zeros) renders an empty muted ring with the title.
 */
export function DonutChart({
  slices,
  currency,
  centerLabel = 'Jami',
  size = 220,
}: DonutChartProps): React.ReactElement {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const total = useMemo(
    () => slices.reduce((sum, s) => sum + Math.max(0, s.value), 0),
    [slices],
  );

  const radius = size / 2;
  const strokeWidth = size * STROKE_WIDTH_RATIO;
  const innerRadius = radius - strokeWidth;
  const cx = radius;
  const cy = radius;

  const arcs = useMemo(() => {
    if (total <= 0) return [] as Array<DonutSlice & { startAngle: number; endAngle: number; color: string }>;
    let cursor = -Math.PI / 2; // start at 12 o'clock
    return slices
      .filter((s) => s.value > 0)
      .map((s, i) => {
        const fraction = s.value / total;
        const start = cursor;
        const end = cursor + fraction * Math.PI * 2;
        cursor = end;
        return {
          ...s,
          startAngle: start,
          endAngle: end,
          color: s.color ?? colorForIndex(i, s.isOther),
        };
      });
  }, [slices, total]);

  const active = arcs.find((a) => a.key === activeKey) ?? null;

  return (
    <div className="flex justify-center" style={{ width: size, height: size }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        role="img"
        aria-label="Donut chart"
      >
        {arcs.length === 0 ? (
          <circle
            cx={cx}
            cy={cy}
            r={radius - strokeWidth / 2}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth={strokeWidth}
          />
        ) : (
          arcs.map((arc) => {
            const lifted = active?.key === arc.key;
            const lift = lifted ? HOVER_LIFT : 0;
            const midAngle = (arc.startAngle + arc.endAngle) / 2;
            const dx = Math.cos(midAngle) * lift;
            const dy = Math.sin(midAngle) * lift;
            const path = describeArc(
              cx + dx,
              cy + dy,
              radius - strokeWidth / 2,
              arc.startAngle,
              arc.endAngle,
            );
            const fraction = arc.value / total;
            const showLabel = fraction >= 0.04;
            return (
              <g key={arc.key}>
                <path
                  d={path}
                  fill="none"
                  stroke={arc.color}
                  strokeWidth={strokeWidth}
                  strokeLinecap="butt"
                  className={cn(
                    'cursor-pointer transition-opacity',
                    active && active.key !== arc.key
                      ? 'opacity-50'
                      : 'opacity-100',
                  )}
                  onMouseEnter={() => setActiveKey(arc.key)}
                  onMouseLeave={() =>
                    setActiveKey((prev) => (prev === arc.key ? null : prev))
                  }
                  onClick={() =>
                    setActiveKey((prev) => (prev === arc.key ? null : arc.key))
                  }
                />
                {showLabel ? (
                  <SliceLabel
                    cx={cx + dx}
                    cy={cy + dy}
                    angle={midAngle}
                    radius={radius - strokeWidth / 2}
                    text={`${Math.round(fraction * 100)}%`}
                  />
                ) : null}
              </g>
            );
          })
        )}

        {/* Center label */}
        <foreignObject
          x={0}
          y={cy - innerRadius * 0.6}
          width={size}
          height={innerRadius * 1.2}
        >
          <div className="flex h-full flex-col items-center justify-center px-2 text-center">
            <span className="text-[11px] font-medium text-muted-foreground">
              {active ? active.label : centerLabel}
            </span>
            <span className="mt-0.5 text-[16px] font-bold tabular-nums text-foreground">
              {formatMoney(active?.value ?? total)}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {currency}
            </span>
          </div>
        </foreignObject>
      </svg>
    </div>
  );
}

interface SliceLabelProps {
  cx: number;
  cy: number;
  angle: number;
  radius: number;
  text: string;
}

function SliceLabel({
  cx,
  cy,
  angle,
  radius,
  text,
}: SliceLabelProps): React.ReactElement {
  const labelRadius = radius * 0.78;
  const x = cx + Math.cos(angle) * labelRadius;
  const y = cy + Math.sin(angle) * labelRadius;
  return (
    <text
      x={x}
      y={y}
      fill="white"
      fontSize={12}
      fontWeight={600}
      textAnchor="middle"
      dominantBaseline="middle"
      style={{ pointerEvents: 'none' }}
    >
      {text}
    </text>
  );
}

/**
 * SVG arc path generator. Standard "polar to cartesian + sweep flag" trick —
 * `d3-shape` would be a single line but it brings 30 KB of dependencies for
 * one function. Inlining keeps the bundle small.
 */
function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
): string {
  // Avoid the degenerate "full circle" case — SVG won't draw an arc whose
  // start and end points are identical, so split into two halves.
  const sweep = endAngle - startAngle;
  if (sweep >= Math.PI * 2 - 0.0001) {
    const mid = startAngle + Math.PI;
    return [
      describeArc(cx, cy, radius, startAngle, mid),
      describeArc(cx, cy, radius, mid, endAngle),
    ].join(' ');
  }
  const startX = cx + Math.cos(startAngle) * radius;
  const startY = cy + Math.sin(startAngle) * radius;
  const endX = cx + Math.cos(endAngle) * radius;
  const endY = cy + Math.sin(endAngle) * radius;
  const largeArc = sweep > Math.PI ? 1 : 0;
  return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}`;
}
