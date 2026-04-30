/**
 * Brand-friendly categorical palette used across reports charts. Tuned to
 * stay legible on both the light card background and the muted grid lines.
 * Picked manually rather than generated so the first 4-5 categories — the
 * ones users see first — get the highest-contrast hues.
 */
export const CHART_COLORS: readonly string[] = [
  '#22c55e', // primary green
  '#f59e0b', // amber
  '#f97316', // orange
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#ef4444', // red
  '#06b6d4', // cyan
  '#a16207', // earth brown
  '#0ea5e9', // sky
  '#6b7280', // slate (fallback for "Boshqalar")
];

/**
 * Stable color assignment by index — different categories on the same
 * chart get distinct hues; "Boshqalar" (the rolled-up tail bucket) always
 * lands on the last slate shade so the rest-of-the-pack reads as muted.
 */
export function colorForIndex(index: number, isOther = false): string {
  if (isOther) return CHART_COLORS[CHART_COLORS.length - 1]!;
  return CHART_COLORS[index % (CHART_COLORS.length - 1)]!;
}
