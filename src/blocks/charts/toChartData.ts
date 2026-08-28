/**
 * Layout series[] → Recharts rows + ChartConfig (name → --chart-(i%5)).
 */
import type { ChartConfig } from "@/components/ui/chart"

export type Point = { x: string | number; y: number; name?: string }
export type Series = { name: string; points: Point[] }

export const CHART_KINDS = ["bar", "line", "area", "donut", "radar"] as const
export type ChartKind = (typeof CHART_KINDS)[number]

export type ChartBodyProps = {
  series: Series[]
  ariaLabel?: string
}

export const CHART_TOKENS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const

/** CSS-safe config key from a series/point name. */
export function seriesKey(name: string, i: number): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
  const base = slug || `s${i}`
  return /^\d/.test(base) ? `s-${base}` : base
}

/** Cartesian rows: one object per x-label with a key per series. */
export function seriesToRows(series: Series[]): Record<string, string | number>[] {
  const labels = series[0]?.points.map((p) => String(p.x)) ?? []
  return labels.map((label, i) => {
    const row: Record<string, string | number> = { label }
    series.forEach((s, si) => {
      row[seriesKey(s.name, si)] = Number(s.points[i]?.y) || 0
    })
    return row
  })
}

/** ChartConfig palette from series names, cycling --chart-1..5. */
export function seriesToChartConfig(series: Series[]): ChartConfig {
  const config: ChartConfig = {}
  series.forEach((s, i) => {
    config[seriesKey(s.name, i)] = {
      label: s.name,
      color: CHART_TOKENS[i % CHART_TOKENS.length],
    }
  })
  return config
}

/** Donut slices from the first series' points (y = value, x/name = slice). */
export function donutRows(series: Series[]): { name: string; key: string; value: number }[] {
  const values = series[0]?.points ?? []
  return values.map((p, i) => {
    const name = String(p.name ?? p.x)
    return { name, key: seriesKey(name, i), value: Number(p.y) || 0 }
  })
}

/** ChartConfig for donut slices (one color per point). */
export function donutChartConfig(series: Series[]): ChartConfig {
  const config: ChartConfig = {}
  donutRows(series).forEach((row, i) => {
    config[row.key] = {
      label: row.name,
      color: CHART_TOKENS[i % CHART_TOKENS.length],
    }
  })
  return config
}
