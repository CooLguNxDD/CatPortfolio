/** Shared scale helpers for hand-rolled SVG charts (no recharts/d3). */

export type Point = { x: string | number; y: number };
export type Series = { name: string; points: Point[] };

export function flatYs(series: Series[]): number[] {
  return series.flatMap((s) => s.points.map((p) => Number(p.y) || 0));
}

export function yDomain(series: Series[]): { min: number; max: number } {
  const ys = flatYs(series);
  if (!ys.length) return { min: 0, max: 1 };
  const min = Math.min(0, ...ys);
  const max = Math.max(...ys, 1);
  return { min, max: max === min ? min + 1 : max };
}

export function xLabels(series: Series[]): string[] {
  const first = series[0]?.points ?? [];
  return first.map((p) => String(p.x));
}

export const CHART_COLORS = [
  "var(--amber)",
  "var(--neon)",
  "var(--cyan)",
  "var(--pink)",
  "var(--peach)",
];
