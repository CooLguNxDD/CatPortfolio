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

/** CSS-safe config key from a series/point name. Index is always folded in so duplicate names stay distinct. */
export function seriesKey(name: string, i: number): string {
  const slug = (name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
  const base = slug ? `${slug}-${i}` : `s-${i}`
  return /^\d/.test(base) ? `s-${base}` : base
}

function pointsOf(s: Series | undefined): Point[] {
  return s?.points ?? []
}

function numericOrNull(y: unknown): number | null {
  if (y == null) return null
  const n = Number(y)
  return Number.isNaN(n) ? null : n
}

/** Cartesian rows: labels from the longest series; missing points are `null` (Recharts gap), not 0. */
export function seriesToRows(series: Series[]): Record<string, string | number | null>[] {
  const longest = series.reduce<Point[]>((acc, s) => {
    const pts = pointsOf(s)
    return pts.length > acc.length ? pts : acc
  }, [])
  const labels = longest.map((p) => String(p.x))
  return labels.map((label, i) => {
    const row: Record<string, string | number | null> = { label }
    series.forEach((s, si) => {
      row[seriesKey(s.name ?? "", si)] = numericOrNull(pointsOf(s)[i]?.y)
    })
    return row
  })
}

/** ChartConfig palette from series names, cycling --chart-1..5. */
export function seriesToChartConfig(series: Series[]): ChartConfig {
  const config: ChartConfig = {}
  series.forEach((s, i) => {
    config[seriesKey(s.name ?? "", i)] = {
      label: s.name ?? `Series ${i + 1}`,
      color: CHART_TOKENS[i % CHART_TOKENS.length],
    }
  })
  return config
}

/** Donut slices from the first series' points (y = value, x/name = slice). */
export function donutRows(series: Series[]): { name: string; key: string; value: number }[] {
  const values = pointsOf(series[0])
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
