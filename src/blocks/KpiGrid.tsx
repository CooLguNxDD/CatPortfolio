import type { PropsOf } from "@/render/registry";
import { Metric } from "./primitives/Metric";
import { Sparkline } from "./primitives/Sparkline";

/** Richer KPI grid with optional sparklines. */
export function KpiGrid(props: PropsOf<"kpiGrid">) {
  const items = props.items ?? [];
  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {items.map((item, i) => (
        <div key={`${item.label}-${i}`} className="space-y-1">
          <Metric label={item.label} value={item.value} delta={item.delta} />
          {item.spark?.length ? (
            <div className="px-1">
              <Sparkline points={item.spark} />
            </div>
          ) : null}
        </div>
      ))}
    </section>
  );
}
