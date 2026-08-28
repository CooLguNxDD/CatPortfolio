/**
 * Chart kind registry — adding a Zod kind without a renderer fails the kinds test.
 */
import type { ComponentType } from "react"
import type { ChartBodyProps, ChartKind } from "./toChartData"
import { AreaBody, BarBody, DonutBody, LineBody, RadarBody } from "./bodies"

export const CHART_KIND_REGISTRY: Record<ChartKind, ComponentType<ChartBodyProps>> = {
  bar: BarBody,
  line: LineBody,
  area: AreaBody,
  donut: DonutBody,
  radar: RadarBody,
}
