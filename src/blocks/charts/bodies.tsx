/**
 * Recharts kind bodies — colors come from ChartConfig --color-<key>.
 */
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  XAxis,
  YAxis,
} from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { ChartBodyProps } from "./toChartData"
import {
  donutChartConfig,
  donutRows,
  seriesKey,
  seriesToChartConfig,
  seriesToRows,
} from "./toChartData"

const boxClass = "aspect-auto h-auto min-h-[160px] w-full max-w-md"

export function BarBody({ series, ariaLabel }: ChartBodyProps) {
  const rows = seriesToRows(series)
  const config = seriesToChartConfig(series)
  const keys = series.map((s, i) => seriesKey(s.name, i))
  return (
    <ChartContainer
      config={config}
      className={boxClass}
      role="img"
      aria-label={ariaLabel ?? "Bar chart"}
    >
      <BarChart data={rows} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={9} />
        <YAxis hide />
        <ChartTooltip content={<ChartTooltipContent />} />
        {keys.map((key) => (
          <Bar key={key} dataKey={key} fill={`var(--color-${key})`} radius={4} />
        ))}
      </BarChart>
    </ChartContainer>
  )
}

export function LineBody({ series, ariaLabel }: ChartBodyProps) {
  const rows = seriesToRows(series)
  const config = seriesToChartConfig(series)
  const keys = series.map((s, i) => seriesKey(s.name, i))
  return (
    <ChartContainer
      config={config}
      className={boxClass}
      role="img"
      aria-label={ariaLabel ?? "Line chart"}
    >
      <LineChart data={rows} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={9} />
        <YAxis hide />
        <ChartTooltip content={<ChartTooltipContent />} />
        {keys.map((key) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={`var(--color-${key})`}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ChartContainer>
  )
}

export function AreaBody({ series, ariaLabel }: ChartBodyProps) {
  const rows = seriesToRows(series)
  const config = seriesToChartConfig(series)
  const keys = series.map((s, i) => seriesKey(s.name, i))
  return (
    <ChartContainer
      config={config}
      className={boxClass}
      role="img"
      aria-label={ariaLabel ?? "Area chart"}
    >
      <AreaChart data={rows} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={9} />
        <YAxis hide />
        <ChartTooltip content={<ChartTooltipContent />} />
        {keys.map((key) => (
          <Area
            key={key}
            type="monotone"
            dataKey={key}
            fill={`var(--color-${key})`}
            stroke={`var(--color-${key})`}
            fillOpacity={0.2}
            strokeWidth={2}
          />
        ))}
      </AreaChart>
    </ChartContainer>
  )
}

export function DonutBody({ series, ariaLabel }: ChartBodyProps) {
  const rows = donutRows(series)
  const config = donutChartConfig(series)
  return (
    <ChartContainer
      config={config}
      className={boxClass}
      role="img"
      aria-label={ariaLabel ?? "Donut chart"}
    >
      <PieChart accessibilityLayer>
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Pie data={rows} dataKey="value" nameKey="key" innerRadius={40} outerRadius={64} strokeWidth={2}>
          {rows.map((row) => (
            <Cell key={row.key} fill={`var(--color-${row.key})`} />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  )
}

export function RadarBody({ series, ariaLabel }: ChartBodyProps) {
  const rows = seriesToRows(series)
  const config = seriesToChartConfig(series)
  const keys = series.map((s, i) => seriesKey(s.name, i))
  return (
    <ChartContainer
      config={config}
      className={boxClass}
      role="img"
      aria-label={ariaLabel ?? "Radar chart"}
    >
      <RadarChart data={rows} accessibilityLayer>
        <PolarGrid />
        <PolarAngleAxis dataKey="label" tick={{ fontSize: 9 }} />
        <PolarRadiusAxis tick={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        {keys.map((key) => (
          <Radar
            key={key}
            dataKey={key}
            fill={`var(--color-${key})`}
            fillOpacity={0.2}
            stroke={`var(--color-${key})`}
            strokeWidth={1.5}
          />
        ))}
      </RadarChart>
    </ChartContainer>
  )
}
