import type { PropsOf } from "@/render/registry";
import { BarChart, DonutChart, LineChart, RadarChart } from "./charts/ChartSvg";
import type { Series } from "./charts/scale";
import { useLayoutStore } from "@/store";
import { sceneFromLayout } from "@/fish/sceneFromLayout";
import { matchFishByName } from "@/fish/matchFish";
import { dispatchFishFocus } from "@/fish/fishBus";
import { useMemo } from "react";

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
      <ChartFishHits series={series} />
      {props.caption || props.unit ? (
        <p className="mt-2 text-xs text-(--fg-subtle)">
          {props.caption}
          {props.unit ? ` (${props.unit})` : ""}
        </p>
      ) : null}
    </section>
  );
}

function namesFromSeries(series: Series[]): string[] {
  const out: string[] = [];
  for (const s of series) {
    if (s.name) out.push(s.name);
    for (const p of s.points) {
      const named = (p as { name?: unknown }).name;
      if (typeof named === "string" && named.trim()) out.push(named);
      if (typeof p.x === "string" && p.x.trim()) out.push(p.x);
    }
  }
  return out;
}

/** Name-matched fish focus — rendered only when a specimen resolves. */
function ChartFishHits({ series }: { series: Series[] }) {
  const layout = useLayoutStore((s) => s.workingLayout);
  const fish = useMemo(
    () => (layout ? sceneFromLayout(layout).fish : []),
    [layout],
  );
  const hits = useMemo(() => {
    const seen = new Set<string>();
    const resolved: { slug: string; label: string }[] = [];
    for (const name of new Set(namesFromSeries(series))) {
      const match = matchFishByName(fish, name);
      if (!match || seen.has(match.slug)) continue;
      seen.add(match.slug);
      resolved.push({ slug: match.slug, label: match.title });
    }
    return resolved;
  }, [series, fish]);

  if (!hits.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {hits.map((h) => (
        <button
          key={h.slug}
          type="button"
          data-slug={h.slug}
          title={`Focus ${h.label} in the tank`}
          onClick={() => dispatchFishFocus(h.slug)}
          className="rounded-full border border-(--border) bg-(--bg-elevated) px-2.5 py-0.5 text-[11px] font-mono text-(--fg-muted) hover:border-(--amber) hover:text-(--amber) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--amber)"
        >
          {h.label}
        </button>
      ))}
    </div>
  );
}
