/**
 * Two-scene overlay chrome (surface hero + submerged HUD).
 * Presentational — controller supplies labels/counts/handlers.
 */

import { DOMAIN_LABEL } from "@/blocks/fishTankTokens"
import { cn } from "@/lib/utils"

export interface FishTankChromeProps {
  stageProgress: number
  tankScene: "surface" | "tank"
  litCount: number
  total: number
  query: string
  domain: string | null
  domains: string[]
  curationLabel: string | null
  onQuery: (q: string) => void
  onToggleDomain: (d: string) => void
  onDive: () => void
  onSurface: () => void
  onDismissCuration: () => void
  onBake?: () => void
}

/** Fixed HUD layers over the WebGL canvas. */
export function FishTankChrome({
  stageProgress,
  tankScene,
  litCount,
  total,
  query,
  domain,
  domains,
  curationLabel,
  onQuery,
  onToggleDomain,
  onDive,
  onSurface,
  onDismissCuration,
  onBake,
}: FishTankChromeProps) {
  const t = stageProgress
  const surfaceOff = t > 0.95
  const tankOff = t < 0.05

  return (
    <div
      id="ui3d"
      className="ft-ui3d"
      style={{ ["--t" as string]: String(t) }}
      aria-hidden={false}
    >
      <section
        className="ft-scene ft-scene--surface"
        data-off={surfaceOff ? "true" : "false"}
      >
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
              <button type="button" className="ft-btn ft-cta" onClick={onDive}>
                Dive into the tank ↓
              </button>
              <button type="button" className="ft-btn" onClick={onDive}>
                🐾 Tap the surface
              </button>
            </div>
          </div>
        </div>
        <div className="ft-scenecue">scroll or Dive to submerge</div>
      </section>

      <section
        className="ft-scene ft-scene--tank"
        data-off={tankOff ? "true" : "false"}
      >
        <div className="ft-waterline">
          <div className="ft-bar">
            <div>
              <div className="ft-lbl">Aquarium surface rim</div>
              <div className="ft-sub">
                Depth{" "}
                <b className="font-mono text-(--fg)">submerged</b> ·{" "}
                <span>{total} species</span>
              </div>
            </div>
            <div className="ft-wave" />
            <div
              className="ft-sub"
              style={{ fontFamily: "var(--ft-mono)", fontSize: 10 }}
            >
              drag orbit · wheel zoom · click a fish · esc to surface
            </div>
          </div>
        </div>

        <div className="ft-tankui">
          <div className="ft-toolbar glass">
            <input
              type="search"
              className="ft-input"
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder="Ask the tank — mcp, terraform, clinician…"
              aria-label="Search projects"
            />
            <div className="ft-chips" role="group" aria-label="Domain filter">
              {domains.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={cn("ft-chip", domain === d && "on")}
                  onClick={() => onToggleDomain(d)}
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
            {onBake ? (
              <button
                type="button"
                className="ft-chip"
                onClick={onBake}
                title="Simulate a job-specific bake highlight"
              >
                ⚡ Bake
              </button>
            ) : null}
          </div>
        </div>

        {tankScene === "tank" ? (
          <button
            type="button"
            className="ft-btn ft-surface-btn"
            onClick={onSurface}
            title="Back to the surface (Esc)"
          >
            ↑ Surface
          </button>
        ) : null}
      </section>

      {curationLabel ? (
        <div className="ft-curation glass show">
          <b>{curationLabel}</b>
          <button type="button" className="ft-btn" onClick={onDismissCuration}>
            clear
          </button>
        </div>
      ) : null}
    </div>
  )
}
