import type { PropsOf } from "@/render/registry";
import { BarChart, DonutChart, LineChart, RadarChart } from "./charts/ChartSvg";
import type { Series } from "./charts/scale";

/** Data-viz block — hand-rolled SVG, themed via CSS vars. */
export function Chart(props: PropsOf<"chart">) {
  const series = (props.series ?? []) as Series[];
  const body = (() => {
    switch (props.kind) {
      case "line":
        return <LineChart series={series} />;
      case "area":
        return <LineChart series={series} area />;
      case "donut":
        return <DonutChart series={series} />;
      case "radar":
        return <RadarChart series={series} />;
      case "bar":
      default:
        return <BarChart series={series} />;
    }
  })();

  return (
    <section className="rounded-[var(--radius-lg)] border border-(--hairline) bg-(--card) p-[var(--pad-card)]">
      {props.title ? (
        <h3 className="mb-2 text-sm font-medium text-(--fg)">{props.title}</h3>
      ) : null}
      {body}
      {props.caption || props.unit ? (
        <p className="mt-2 text-xs text-(--fg-subtle)">
          {props.caption}
          {props.unit ? ` (${props.unit})` : ""}
        </p>
      ) : null}
    </section>
  );
}
