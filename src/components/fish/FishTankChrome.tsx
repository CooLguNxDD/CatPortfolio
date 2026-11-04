/**
 * Fixed HUD layers over the WebGL canvas — surface hero + submerged toolbar.
 *
 * Dive progress (`--t`, `data-off`) is a bus-only 60fps observation, applied
 * directly to DOM refs so a dive never re-renders this component (see
 * fish/fishBus.ts). `query`/`domain` are discrete store state, read via the
 * zustand hook (normal React re-render, but only a handful of times per
 * interaction — not per frame). Every control emits onto the bus rather than
 * taking callback props; the command handler lives in hooks/useFishTank.ts.
 */

import { useEffect, useRef } from "react"
import { useShallow } from "zustand/react/shallow"
import { LayoutGrid, MessageCircle, SlidersHorizontal } from "lucide-react"
import { useFishTankStore } from "@/store"
import { fishBus } from "@/fish/fishBus"
import { createFrameChannel } from "@/fish/frameChannel"
import { DOMAIN_LABEL } from "@/blocks/fishTankTokens"
import { cn } from "@/lib/utils"

export interface FishTankChromeProps {
  litCount: number
  total: number
  domains: string[]
  curationLabel: string | null
  /** Scene controls panel state, for the Controls button's aria-expanded. */
  controlsOpen?: boolean
}

/** Fixed HUD layers over the WebGL canvas. */
export function FishTankChrome({
  litCount,
  total,
  domains,
  curationLabel,
  controlsOpen = false,
}: FishTankChromeProps) {
  const { query, domain } = useFishTankStore(
    useShallow((s) => ({
      query: s.query,
      domain: s.domain,
    })),
  )

  const rootRef = useRef<HTMLDivElement | null>(null)
  const surfaceSectionRef = useRef<HTMLElement | null>(null)
  const tankSectionRef = useRef<HTMLElement | null>(null)
  const searchRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const onSearchFocus = () => {
      searchRef.current?.focus()
    }
    fishBus.on("search:focus", onSearchFocus)
    return () => {
      fishBus.off("search:focus", onSearchFocus)
    }
  }, [])

  useEffect(() => {
    const channel = createFrameChannel(
      fishBus,
      "tank:progress",
      useFishTankStore.getState().getProgress(),
    )
    return channel.subscribe((t) => {
      rootRef.current?.style.setProperty("--t", String(t))
      surfaceSectionRef.current?.setAttribute("data-off", t > 0.95 ? "true" : "false")
      tankSectionRef.current?.setAttribute("data-off", t < 0.05 ? "true" : "false")
    })
  }, [])

  return (
    <div id="ui3d" className="ft-ui3d" ref={rootRef} aria-hidden={false}>
      <section ref={surfaceSectionRef} className="ft-scene ft-scene--surface" data-off="false">
        <div className="ft-hero">
          <div className="ft-hero-card glass">
            <span className="ft-eyebrow">
              <i className="ft-pulse" /> Andrew · Agentic AI &amp; DevOps
            </span>
            <h2>Building AI agents and the systems behind them.</h2>
            <p>
              I build AI agents, MCP integrations, and cloud platforms—from
              agent orchestration to Kubernetes, Terraform, and CI/CD. My focus:
              useful automation, reliable deployments, and efficient infrastructure.
            </p>
            <p className="ft-hero-more">
              <b className="text-(--fg)">Explore the work:</b> Each fish is a
              shipped project. Dive in for the architecture, engineering
              decisions, and impact.
            </p>
            <div className="ft-row">
              <button
                type="button"
                className="ft-btn ft-cta"
                onClick={() => fishBus.emit("tank:dive")}
              >
                Dive into the tank ↓
              </button>
              <button
                type="button"
                className="ft-btn"
                onClick={() => fishBus.emit("ask:open")}
                title="Ask about a project — patches the tank live"
              >
                💬 Ask
              </button>
            </div>
          </div>
        </div>
        <div className="ft-scenecue">scroll or Dive to submerge</div>
      </section>

      <section ref={tankSectionRef} className="ft-scene ft-scene--tank" data-off="false">
        <div className="ft-waterline">
          <div className="ft-bar">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="ft-lbl">Aquarium surface rim</div>
                <div className="ft-sub">
                  Depth{" "}
                  <b className="font-mono text-(--fg) font-semibold">submerged</b> ·{" "}
                  <span className="font-medium text-(--fg)">{total} species</span>
                </div>
              </div>
              {curationLabel ? (
                <button
                  type="button"
                  className="ft-chip-btn text-[11px] px-2 py-0.5"
                  onClick={() => fishBus.emit("bake:dismiss")}
                  title="Clear curation filter"
                >
                  clear
                </button>
              ) : null}
            </div>
            {curationLabel ? (
              <div className="text-xs font-mono text-(--amber) flex items-center gap-1.5 border-t border-(--hairline) pt-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-(--amber) shrink-0 animate-pulse" />
                <span className="truncate">{curationLabel}</span>
              </div>
            ) : null}
            <div className="ft-wave ft-hint" />
            <div
              className="ft-sub ft-hint"
              style={{ fontFamily: "var(--ft-mono)", fontSize: 11 }}
            >
              drag orbit · wheel zoom · click fish · dbl-click feed · esc surface
            </div>
          </div>
        </div>

        <div className="ft-tankui">
          <div className="ft-toolbar glass" role="toolbar" aria-label="Aquarium controls">
            <div className="ft-toolbar-row1 flex items-center gap-2 w-full">
              <input
                ref={searchRef}
                type="search"
                id="q"
                className="ft-input flex-1 min-w-[180px]"
                value={query}
                onChange={(e) => fishBus.emit("filter:query", e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && query.trim()) {
                    e.preventDefault()
                    fishBus.emit("ask:open", { prompt: query.trim() })
                  }
                }}
                placeholder="Ask the tank — mcp, kubernetes, planner"
                aria-label="Search projects or ask a question"
              />
              <div className="ft-chips" role="group" aria-label="Domain filter">
                {domains.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={cn("ft-chip", domain === d && "on")}
                    onClick={() => fishBus.emit("filter:domain", d)}
                  >
                    {DOMAIN_LABEL[d] || d}
                  </button>
                ))}
              </div>
              <div className="ft-count shrink-0">
                <b>
                  {litCount}/{total}
                </b>{" "}
                lit
              </div>
            </div>

            <div className="ft-toolbar-row2 flex items-center gap-2 w-full pt-1.5 border-t border-(--hairline)">
              {/* Find work · ask · tune the scene (design review v2). Scene
                  toggles live in the Controls panel, one panel at a time. */}
              <button
                type="button"
                className="ft-dock-btn ft-dock-btn--main ft-dock-btn--primary"
                onClick={() => fishBus.emit("view:chrome", "flat")}
                title="Browse every project as a list"
              >
                <LayoutGrid className="h-4 w-4" aria-hidden />
                <span className="ft-dock-label">Browse projects</span>
              </button>
              <button
                type="button"
                className="ft-dock-btn ft-dock-btn--main"
                onClick={() => fishBus.emit("ask:toggle")}
                title="Ask about a project — patches the tank live"
              >
                <MessageCircle className="h-4 w-4" aria-hidden />
                <span className="ft-dock-label">Ask</span>
              </button>
              <button
                type="button"
                className={cn("ft-dock-btn ft-dock-btn--main", controlsOpen && "on")}
                onClick={() => fishBus.emit("controls:toggle")}
                aria-expanded={controlsOpen}
                title="Lighting, sound, sonar, feeding and timeline"
              >
                <SlidersHorizontal className="h-4 w-4" aria-hidden />
                <span className="ft-dock-label">Controls</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
