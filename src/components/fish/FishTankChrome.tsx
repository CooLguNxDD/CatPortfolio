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
import { usePreferencesStore, useFishTankStore } from "@/store"
import { fishBus } from "@/fish/fishBus"
import { createFrameChannel } from "@/fish/frameChannel"
import { deriveScene } from "@/fish/tankMachine"
import { DOMAIN_LABEL } from "@/blocks/fishTankTokens"
import { cn } from "@/lib/utils"

export interface FishTankChromeProps {
  litCount: number
  total: number
  domains: string[]
  curationLabel: string | null
  /** Simulated bake affordance — omitted when the caller has no bake demo. */
  showBake?: boolean
}

/** Fixed HUD layers over the WebGL canvas. */
export function FishTankChrome({
  litCount,
  total,
  domains,
  curationLabel,
  showBake = true,
}: FishTankChromeProps) {
  // These four update together on most interactions — one shallow-compared
  // selector avoids a re-render per field. tankScene stays separate since
  // it derives from s.state via deriveScene, a different shape entirely.
  const { query, domain, soundEnabled, toggleSound, dropFood } = useFishTankStore(
    useShallow((s) => ({
      query: s.query,
      domain: s.domain,
      soundEnabled: s.soundEnabled,
      toggleSound: s.toggleSound,
      dropFood: s.dropFood,
    })),
  )
  const tankScene = useFishTankStore((s) => deriveScene(s.state))
  const circadian = usePreferencesStore((s) => s.circadian)
  const cycleCircadian = usePreferencesStore((s) => s.cycleCircadian)

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
              <i className="ft-pulse" /> Surface deck · Andrew the cat builder
            </span>
            <h2>The cat builds the systems. The tank holds the proof.</h2>
            <p>
              Agentic backends, MCP servers, GOAP planners, multi-tenant
              platforms. Below the waterline every fish is a shipped project.
            </p>
            <p>
              <b className="text-(--fg)">Read the tank:</b> size = scope · depth
              = age · glow = impact · speed = still alive · color = domain · a
              school means it was a team.
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
              <button
                type="button"
                className="ft-btn"
                onClick={() => fishBus.emit("tank:dive")}
              >
                🐾 Tap the surface
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
                  <b className="font-mono text-(--fg)">submerged</b> ·{" "}
                  <span>{total} species</span>
                </div>
              </div>
              {curationLabel ? (
                <button
                  type="button"
                  className="ft-chip-btn text-[10px] px-2 py-0.5"
                  onClick={() => fishBus.emit("bake:dismiss")}
                  title="Clear curation filter"
                >
                  clear
                </button>
              ) : null}
            </div>
            {curationLabel ? (
              <div className="text-[11px] font-mono text-(--amber) flex items-center gap-1.5 border-t border-(--hairline) pt-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-(--amber) shrink-0 animate-pulse" />
                <span className="truncate">{curationLabel}</span>
              </div>
            ) : null}
            <div className="ft-wave" />
            <div
              className="ft-sub"
              style={{ fontFamily: "var(--ft-mono)", fontSize: 10 }}
            >
              drag orbit · wheel zoom · click fish · dbl-click feed · esc surface
            </div>
          </div>
        </div>

        <div className="ft-tankui">
          <div className="ft-toolbar glass" role="toolbar" aria-label="Aquarium controls">
            <input
              ref={searchRef}
              type="search"
              id="q"
              className="ft-input"
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
            <div className="ft-count">
              <b>
                {litCount}/{total}
              </b>{" "}
              lit
            </div>
            <button
              type="button"
              className="ft-dock-btn"
              onClick={() => fishBus.emit("ask:toggle")}
              title="Open Ask — live patch the tank"
            >
              <span className="ft-dock-icon">💬</span>
              <span className="ft-dock-label">Ask</span>
            </button>
            <button
              type="button"
              className="ft-dock-btn"
              onClick={() => dropFood()}
              title="Drop food pellets into the tank (or double-click canvas)"
            >
              <span className="ft-dock-icon">🍲</span>
              <span className="ft-dock-label">Feed</span>
            </button>
            <button
              type="button"
              className={cn("ft-dock-btn", soundEnabled && "on")}
              onClick={() => toggleSound()}
              title="Toggle hydro-acoustic sound synthesizer"
            >
              <span className="ft-dock-icon">
                {soundEnabled ? (
                  <span className="ft-eq" aria-hidden="true">
                    <span className="ft-eq-bar ft-eq-1" />
                    <span className="ft-eq-bar ft-eq-2" />
                    <span className="ft-eq-bar ft-eq-3" />
                  </span>
                ) : (
                  "🔇"
                )}
              </span>
              <span className="ft-dock-label">{soundEnabled ? "Audio" : "Muted"}</span>
            </button>
            <button
              type="button"
              className={cn("ft-dock-btn", circadian !== "auto" && "on")}
              onClick={() => cycleCircadian()}
              title="Day / night cycle (auto follows your local clock)"
            >
              <span className="ft-dock-icon">
                {circadian === "night" ? "🌙" : circadian === "day" ? "☀️" : "🕓"}
              </span>
              <span className="ft-dock-label">
                {circadian === "night" ? "Abyss" : circadian === "day" ? "Lagoon" : "Auto"}
              </span>
            </button>
            {showBake ? (
              <button
                type="button"
                className="ft-dock-btn"
                onClick={() => fishBus.emit("bake:apply")}
                title="Simulate a job-specific bake highlight"
              >
                <span className="ft-dock-icon">⚡</span>
                <span className="ft-dock-label">Bake</span>
              </button>
            ) : null}
            <button
              type="button"
              className="ft-dock-btn"
              onClick={() => fishBus.emit("shortcuts:toggle")}
              title="Keyboard shortcuts (?)"
            >
              <span className="ft-dock-icon">⌨</span>
              <span className="ft-dock-label">Shortcuts</span>
            </button>
          </div>
        </div>

        {tankScene === "tank" ? (
          <button
            type="button"
            className="ft-btn ft-surface-btn"
            onClick={() => fishBus.emit("tank:surface")}
            title="Back to the surface (Esc)"
          >
            ↑ Surface
          </button>
        ) : null}
      </section>
    </div>
  )
}
