import type { PropsOf } from "@/render/registry";
import type { CompositeNodeType } from "@/content/schema";
import { Metric } from "./primitives/Metric";
import { Sparkline } from "./primitives/Sparkline";
import { BadgeCloud } from "./primitives/BadgeCloud";
import { Quote } from "./primitives/Quote";
import { Progress } from "./primitives/Progress";
import { Divider } from "./primitives/Divider";
import { IconTile } from "./primitives/IconTile";
import { MarkdownText } from "./primitives/MarkdownText";
import { BarChart, DonutChart, LineChart, RadarChart } from "./charts/ChartSvg";
import type { Series } from "./charts/scale";
import { cn } from "@/lib/utils";

function containerClass(kind: string, cols?: number, gap?: string): string {
  const g = gap === "sm" ? "gap-2" : gap === "lg" ? "gap-6" : "gap-4";
  if (kind === "stack") return cn("flex flex-col", g);
  if (kind === "split") return cn("grid grid-cols-1 md:grid-cols-2", g);
  const c = Math.min(4, Math.max(1, cols ?? 2));
  const colMap: Record<number, string> = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-2 lg:grid-cols-4",
  };
  return cn("grid", colMap[c], g);
}

function Leaf({ node }: { node: CompositeNodeType }) {
  const n = node as CompositeNodeType & Record<string, unknown>;
  switch (n.kind) {
    case "metric":
      return (
        <Metric
          label={typeof n.label === "string" ? n.label : undefined}
          value={typeof n.value === "string" ? n.value : String(n.value ?? "")}
          delta={typeof n.delta === "string" ? n.delta : undefined}
        />
      );
    case "sparkline":
      return (
        <Sparkline
          points={Array.isArray(n.points) ? (n.points as number[]) : []}
        />
      );
    case "badgeCloud":
      return (
        <BadgeCloud
          items={Array.isArray(n.items) ? (n.items as string[]) : []}
        />
      );
    case "quote":
      return (
        <Quote
          text={typeof n.text === "string" ? n.text : undefined}
          cite={typeof n.cite === "string" ? n.cite : undefined}
        />
      );
    case "progress":
      return (
        <Progress
          value={typeof n.value === "number" ? n.value : Number(n.value) || 0}
          label={typeof n.label === "string" ? n.label : undefined}
        />
      );
    case "divider":
      return <Divider />;
    case "icon":
      return (
        <IconTile
          icon={typeof n.icon === "string" ? n.icon : undefined}
          label={typeof n.label === "string" ? n.label : undefined}
        />
      );
    case "image":
      return typeof n.src === "string" ? (
        <img
          src={n.src}
          alt={typeof n.alt === "string" ? n.alt : ""}
          className="max-h-48 rounded-[var(--radius)] border border-(--hairline) object-cover"
        />
      ) : null;
    case "text":
      return (
        <MarkdownText
          markdown={
            typeof n.markdown === "string"
              ? n.markdown
              : typeof n.text === "string"
                ? n.text
                : ""
          }
        />
      );
    case "chart": {
      const series = (Array.isArray(n.series) ? n.series : []) as Series[];
      const kind = typeof n.chartKind === "string" ? n.chartKind : "bar";
      if (kind === "line") return <LineChart series={series} />;
      if (kind === "area") return <LineChart series={series} area />;
      if (kind === "donut") return <DonutChart series={series} />;
      if (kind === "radar") return <RadarChart series={series} />;
      return <BarChart series={series} />;
    }
    default:
      return null;
  }
}

function NodeView({ node }: { node: CompositeNodeType }) {
  if (node.kind === "grid" || node.kind === "stack" || node.kind === "split") {
    const cols = typeof (node as { cols?: number }).cols === "number"
      ? (node as { cols?: number }).cols
      : undefined;
    const gap = typeof (node as { gap?: string }).gap === "string"
      ? (node as { gap?: string }).gap
      : undefined;
    return (
      <div className={containerClass(node.kind, cols, gap)}>
        {(node.children ?? []).map((child, i) => (
          <NodeView key={i} node={child} />
        ))}
      </div>
    );
  }
  return <Leaf node={node} />;
}

/** Recursive composite block renderer. */
export function Composite(props: PropsOf<"composite">) {
  const layout = props.layout;
  return (
    <section className="rounded-[var(--radius-lg)] border border-(--hairline) bg-(--card) p-[var(--pad-card)]">
      {props.title ? (
        <h3 className="mb-3 text-sm font-medium text-(--fg)">{props.title}</h3>
      ) : null}
      <div
        className={containerClass(
          layout.kind,
          layout.cols,
          layout.gap,
        )}
      >
        {(props.children ?? []).map((child, i) => (
          <NodeView key={i} node={child as CompositeNodeType} />
        ))}
      </div>
    </section>
  );
}
