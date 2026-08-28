/**
 * Lazy-loaded Recharts dispatcher — one chunk for every chart kind.
 */
import { CHART_KIND_REGISTRY } from "./kinds"
import { CHART_KINDS, type ChartKind, type Series } from "./toChartData"

export default function RechartsBody({
  kind,
  series,
  ariaLabel,
}: {
  kind: ChartKind | string
  series: Series[]
  ariaLabel?: string
}) {
  const resolved: ChartKind = (CHART_KINDS as readonly string[]).includes(kind)
    ? (kind as ChartKind)
    : "bar"
  const Body = CHART_KIND_REGISTRY[resolved]
  return <Body series={series} ariaLabel={ariaLabel} />
}
