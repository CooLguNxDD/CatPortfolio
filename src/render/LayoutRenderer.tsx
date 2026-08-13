/**
 * LayoutRenderer — schema-driven block tree + Open Design matrix chrome.
 *
 * When `meta.dag.levels` is present:
 *   - horizontal level bands
 *   - viewport-aligned scroll lighting (useLayoutDag)
 *   - sticky minimap + persona + tech filter
 * Otherwise: simple stagger (+ optional 12-col span grid).
 */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
} from "react";
import { motion, useReducedMotion } from "motion/react";
import type { Layout } from "@/content/schema";
import { REGISTRY } from "./registry";
import type { Block, BlockType } from "./registry";
import { BlockErrorBoundary } from "./BlockErrorBoundary";
import {
  useLayoutTheme,
  type LayoutThemeMode,
} from "@/hooks/useLayoutTheme";
import { useLayoutDag } from "@/hooks/useLayoutDag";
import { AgenticHeader } from "@/components/AgenticHeader";
import { SourceCitations } from "@/components/SourceCitations";
import { cn } from "@/lib/utils";
import "@/styles/matrix.css";

type Persona = "recruiter" | "architect" | "exec";

function renderBlock(
  block: Block,
  i: number,
  reduced: boolean | null,
  opts?: {
    style?: CSSProperties;
    isCurrent?: boolean;
    matrix?: boolean;
  },
) {
  const Comp = REGISTRY[block.type as BlockType] as
    | ComponentType<Block["props"]>
    | undefined;
  if (!Comp) {
    if (import.meta.env.DEV) {
      console.warn(
        `[LayoutRenderer] Unknown block type "${block.type}" (id=${block.id}) — skipped`,
      );
    }
    return null;
  }

  const shell = (
    <BlockErrorBoundary blockId={block.id}>
      <Comp {...block.props} />
    </BlockErrorBoundary>
  );

  if (opts?.matrix) {
    return (
      <section
        key={block.id}
        id={`block-${block.id}`}
        data-block-id={block.id}
        data-dag-id={block.id}
        style={opts.style}
        className={cn("min-w-0 h-full", opts.isCurrent && "is-current")}
      >
        {shell}
      </section>
    );
  }

  return (
    <motion.section
      key={block.id}
      id={`block-${block.id}`}
      data-block-id={block.id}
      style={opts?.style}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
      className="min-w-0"
    >
      {shell}
    </motion.section>
  );
}

function MatrixLevels({
  layout,
  reduced,
}: {
  layout: Layout;
  reduced: boolean | null;
}) {
  const { levels, progress, activeIdx, litLevels, jumpToLevel } =
    useLayoutDag(layout);
  const [persona, setPersona] = useState<Persona>("recruiter");
  const [tech, setTech] = useState<string | null>(null);

  const byId = useMemo(
    () => new Map(layout.blocks.map((b) => [b.id, b])),
    [layout.blocks],
  );
  const used = new Set<string>();
  let anim = 0;

  const techTags = useMemo(() => {
    const set = new Set<string>();
    for (const b of layout.blocks) {
      if (b.type !== "card") continue;
      const bag =
        (b.props as { tech?: string; tags?: string[] }).tech ||
        ((b.props as { tags?: string[] }).tags || []).join(" ");
      for (const t of bag.split(/\s+/)) {
        if (t) set.add(t.replace(/[^A-Za-z0-9.+#-]/g, ""));
      }
    }
    // Prefer OD defaults if present
    const preferred = [
      "MCP",
      "EKS",
      "Terraform",
      "React-Native",
      "GraphQL",
      "pgvector",
    ];
    const ordered = preferred.filter((p) =>
      [...set].some((s) => s.toLowerCase() === p.toLowerCase() || s.includes(p)),
    );
    return ordered.length ? ordered : [...set].slice(0, 8);
  }, [layout.blocks]);

  const toggleTech = (t: string) => {
    setTech((prev) => (prev === t ? null : t));
  };

  return (
    <div className="matrix-home" data-persona={persona}>
      <div className="matrix-page">
        {/* Sticky OD shell: minimap + persona + tech filter */}
        <div className="matrix-sticky-chrome">
          <div className="dag-minimap" aria-label="Story level minimap">
            <div className="dag-minimap-title">
              Story levels ·{" "}
              <span className="dag-t">{Math.round(progress * 100)}%</span> ·{" "}
              <span className="dag-level-label">
                {levels[activeIdx]?.label ?? "—"}
              </span>
            </div>
            <div className="dag-progress" aria-hidden>
              <i style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
            <div className="dag-minimap-nodes">
              {levels.map((lvl, i) => (
                <button
                  key={`dot-${lvl.level}`}
                  type="button"
                  className={cn(
                    "dag-dot",
                    litLevels.has(i) && "is-lit",
                    i === activeIdx && "is-current",
                  )}
                  data-dag-level-jump={lvl.level}
                  aria-current={i === activeIdx ? "true" : undefined}
                  onClick={() => jumpToLevel(lvl.level)}
                >
                  L{lvl.level} {lvl.label}
                </button>
              ))}
            </div>
          </div>

          <nav className="persona-bar" aria-label="Visitor persona">
            {(
              [
                ["recruiter", "⏱ Recruiter TL;DR"],
                ["architect", "🛠 Staff Architect"],
                ["exec", "💼 Exec ROI"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={cn("persona-btn", persona === id && "is-active")}
                data-persona={id}
                aria-pressed={persona === id}
                onClick={() => setPersona(id)}
              >
                {label}
              </button>
            ))}
          </nav>

          {techTags.length > 0 ? (
            <div className="tech-filter" aria-label="Tech stack filter">
              {techTags.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={cn("tech-tag", tech === t && "is-active")}
                  data-tech={t}
                  aria-pressed={tech === t}
                  onClick={() => toggleTech(t)}
                >
                  #{t}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div
          className={cn(
            "dag-levels",
            tech && "is-tech-filtering",
          )}
          id="bento"
        >
          {levels.map((lvl, i) => {
            const nodes = lvl.nodes
              .map((id) => byId.get(id))
              .filter((b): b is Block => Boolean(b));
            for (const n of nodes) used.add(n.id);
            // Explicit level.cols wins (e.g. deep-dive cols:1); else pack peers.
            const cols = Math.min(
              4,
              Math.max(
                1,
                typeof lvl.cols === "number" ? lvl.cols : nodes.length || 1,
              ),
            );
            const lit = litLevels.has(i);
            const current = i === activeIdx;
            const isLastBand = i === levels.length - 1;

            // Tech filter: mark match on cards with data-tech
            const nodeShell = nodes.map((block, ni) => {
              const el = renderBlock(block, anim++, reduced, {
                matrix: true,
                isCurrent: current && ni === 0,
              });
              if (!tech || !el) return el;
              // Wrap to apply tech-match class based on block props
              const p = block.props as { tech?: string; tags?: string[] };
              const bag = (
                p.tech ||
                (p.tags || []).join(" ") ||
                ""
              ).toLowerCase();
              const match =
                bag.includes(tech.toLowerCase()) ||
                bag.replace(/[\s_]/g, "-").includes(tech.toLowerCase());
              return (
                <div
                  key={`wrap-${block.id}`}
                  data-tech={p.tech || (p.tags || []).join(" ")}
                  className={cn(match && "tech-match", "min-w-0 h-full")}
                >
                  {el}
                </div>
              );
            });

            return (
              <section
                key={`lvl-${lvl.level}-${lvl.label}`}
                className={cn(
                  "dag-level",
                  lit && "is-lit",
                  current && "is-current",
                  isLastBand && "is-last-band",
                )}
                data-dag-level={lvl.level}
              >
                <div className="dag-level-meta">
                  <span className="lvl-idx">L{lvl.level}</span>
                  <span>{lvl.label}</span>
                </div>
                <div className={cn("dag-level-nodes", `cols-${cols}`)}>
                  {nodeShell}
                </div>
              </section>
            );
          })}

          {layout.blocks
            .filter((b) => !used.has(b.id))
            .map((block) => (
              <section
                key={`orphan-${block.id}`}
                className="dag-level is-lit"
                data-dag-level="rest"
              >
                <div className="dag-level-nodes cols-1">
                  {renderBlock(block, anim++, reduced, { matrix: true })}
                </div>
              </section>
            ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Show the visitor *what* changed after an ask patch.
 *
 * `meta.patchedBlockIds` has been stamped by the backend for a while and read
 * by nobody — without it a surgical patch is indistinguishable from a page
 * flash. Scrolls the first patched block into view and pulses each one.
 */
function usePatchHighlight(
  patchedIds: string[] | undefined,
  reduced: boolean | null,
) {
  const seen = useRef<string>("");
  useEffect(() => {
    const ids = patchedIds ?? [];
    const key = ids.join(",");
    // Re-render with the same patch set must not re-pulse.
    if (!ids.length || key === seen.current) return;
    seen.current = key;

    const nodes = ids
      .map((id) => document.querySelector<HTMLElement>(`[data-block-id="${CSS.escape(id)}"]`))
      .filter((n): n is HTMLElement => Boolean(n));
    if (!nodes.length) return;

    nodes[0].scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      block: "center",
    });
    for (const node of nodes) node.classList.add("is-patched");
    const timer = window.setTimeout(() => {
      for (const node of nodes) node.classList.remove("is-patched");
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [patchedIds, reduced]);
}

export function LayoutRenderer({
  layout,
  themeMode = "auto",
}: {
  layout: Layout;
  themeMode?: LayoutThemeMode;
}) {
  const reduced = useReducedMotion();
  useLayoutTheme(layout, { mode: themeMode });

  usePatchHighlight(layout.meta.patchedBlockIds, reduced);

  const hasDag = Boolean(layout.meta.dag?.levels?.length);

  const usesGrid =
    !hasDag &&
    layout.blocks.some(
      (b) => b.layout && (b.layout.span != null || b.layout.order != null),
    );

  return (
    <div
      className={cn(
        "w-full",
        hasDag && "layout-canvas layout-canvas--matrix",
        usesGrid && "layout-canvas layout-canvas--grid",
        !hasDag && !usesGrid && "layout-canvas layout-canvas--stack space-y-6",
      )}
      data-layout-canvas={hasDag ? "matrix" : usesGrid ? "grid" : "stack"}
    >
      <AgenticHeader meta={layout.meta} />
      {hasDag ? (
        <MatrixLevels layout={layout} reduced={reduced} />
      ) : (
        <div
          className={cn(
            usesGrid && "grid grid-cols-12 gap-4 auto-rows-min",
            !usesGrid && "flex flex-col gap-6",
          )}
        >
          {layout.blocks.map((block, i) => {
            const span = block.layout?.span;
            const order = block.layout?.order;
            const style: CSSProperties = {};
            if (usesGrid) {
              style.gridColumn = span
                ? `span ${Math.min(12, Math.max(1, span))} / span ${Math.min(12, Math.max(1, span))}`
                : "span 12 / span 12";
              if (order != null) style.order = order;
            }
            return renderBlock(block, i, reduced, { style });
          })}
        </div>
      )}
      <SourceCitations sources={layout.meta.sources} />
    </div>
  );
}
