/**
 * Top banner for agentically curated / scoped GenUI layouts.
 * Shown when layout.meta carries mode, sources, or a curation label.
 */
import type { Layout } from "@/content/schema";

type Meta = Layout["meta"];

function sourceCount(meta: Meta): number {
  return Array.isArray(meta.sources) ? meta.sources.length : 0;
}

/** Determines if the agentic header should be displayed based on layout metadata. */
export function shouldShowAgenticHeader(meta: Meta | undefined | null): boolean {
  if (!meta) return false;
  if (meta.curationLabel) return true;
  if (meta.mode && meta.mode !== "snapshot" && meta.mode !== "template") return true;
  if (sourceCount(meta) > 0) return true;
  if (typeof meta.scopedProjectCount === "number" && meta.scopedProjectCount > 0) {
    return true;
  }
  return false;
}

/** Displays agent metadata and status above the layout. */
export function AgenticHeader({ meta }: { meta: Meta }) {
  if (!shouldShowAgenticHeader(meta)) return null;

  const nSources = sourceCount(meta);
  const scoped =
    typeof meta.scopedProjectCount === "number" ? meta.scopedProjectCount : null;
  const label =
    meta.curationLabel ||
    [
      meta.mode === "scoped" ? "Agentically curated" : meta.mode ? `Mode: ${meta.mode}` : null,
      scoped != null ? `${scoped} project(s) scoped` : null,
      nSources > 0 ? `${nSources} source(s) grounded` : null,
      meta.theme ? `theme ${meta.theme}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

  return (
    <div
      role="status"
      className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-(--amber)/30 bg-(--card) px-4 py-2.5 text-xs font-mono text-(--fg-muted) shadow-[var(--shadow-card)]"
    >
      <span className="text-(--amber)" aria-hidden>
        ✦
      </span>
      <span className="text-(--fg)">{label}</span>
      {nSources > 0 ? (
        <span className="ml-auto text-(--fg-subtle)">
          {nSources} citation{nSources === 1 ? "" : "s"}
        </span>
      ) : null}
    </div>
  );
}
