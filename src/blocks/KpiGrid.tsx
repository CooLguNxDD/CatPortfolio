import type { CSSProperties } from "react";
import type { PropsOf } from "@/render/registry";
import { Sparkline } from "./primitives/Sparkline";
import { cn } from "@/lib/utils";

const KPI_ACCENTS = [
  "var(--accent-devops, var(--neon))",
  "var(--accent-ai, var(--amber))",
  "var(--accent-mobile, var(--pink))",
  "var(--accent-platform, var(--cyan))",
] as const;

/** Richer KPI grid — OD matrix tile chrome + sparklines. */
export function KpiGrid(props: PropsOf<"kpiGrid">) {
  const items = props.items ?? [];
  return (
    <section
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4",
      )}
    >
      {items.map((item, i) => {
        const style = {
          ["--card-accent" as string]: KPI_ACCENTS[i % KPI_ACCENTS.length],
        } as CSSProperties;
        return (
        <div
          key={`${item.label}-${i}`}
          className="mx-kpi"
          style={style}
        >
          <div className="kpi-label">{item.label}</div>
          <div className="kpi-value">{item.value}</div>
          {item.delta ? <div className="kpi-delta">{item.delta}</div> : null}
          {item.spark?.length ? (
            <div className="mt-2">
              <Sparkline points={item.spark} />
            </div>
          ) : null}
        </div>
        );
      })}
    </section>
  );
}
