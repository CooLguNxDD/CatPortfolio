/**
 * Specimen analysis panel — docks beside the locked fish like an instrument
 * readout. No full-screen scrim, so the specimen stays visible next to it.
 */

import type { CSSProperties } from "react"
import type { FishSpecimenInput } from "@/blocks/fishTankLayout"
import {
  DOMAIN_LABEL,
  SPECIES_TOKEN,
  SPECIES_FALLBACK_HEX,
} from "@/blocks/fishTankTokens"
import type { DomainIdType } from "@/content/schema"
import { cn } from "@/lib/utils"

export interface FishDossierProps {
  fish: FishSpecimenInput | null
  index?: number
  total?: number
  /**
   * Canvas-local screen position of the locked fish. When present the panel
   * docks to the right of the specimen (analysis-readout style); when absent it
   * falls back to the fixed rail (flat view, narrow viewports).
   */
  anchor?: { x: number; y: number; r: number; w: number; h: number } | null
  onClose: () => void
  className?: string
}

/** Panel geometry — kept here so the clamp and the CSS agree. */
const PANEL_W = 520
const PANEL_H = 760
/** Clearance between the specimen's silhouette edge and the panel. */
const GAP = 40
const MARGIN = 16
/** Below this canvas width the panel reverts to the full-height rail. */
const DOCK_MIN_W = 900

function domainLabel(species: string): string {
  return DOMAIN_LABEL[species] || species
}

function linkHref(link: FishSpecimenInput["link"]): string | null {
  if (!link) return null
  if (typeof link === "string") return link
  return link.href || null
}

/** Right-rail specimen readout when a fish is caught. */
export function FishDossier({
  fish,
  index = 1,
  total = 1,
  anchor = null,
  onClose,
  className,
}: FishDossierProps) {
  const open = Boolean(fish)
  const sp = (fish?.species || "platform") as DomainIdType
  const token = SPECIES_TOKEN[sp] || "accent-platform"
  const fallback = SPECIES_FALLBACK_HEX[sp] || "#fbbf24"
  const href = fish ? linkHref(fish.link) : null
  const specimen = String(index).padStart(2, "0")

  // Dock right of the specimen, flipping to its left when there is no room.
  // All maths in canvas-local space — the panel is positioned inside the same
  // box the anchor came from, so clamping against `window` would be wrong.
  const docked = Boolean(anchor) && (anchor?.w ?? 0) > DOCK_MIN_W
  let dockStyle: CSSProperties | undefined
  let leadStyle: CSSProperties | undefined
  let leadSide: "left" | "right" = "left"
  if (docked && anchor) {
    // Clear the specimen's own silhouette, not just its centre point.
    const clear = anchor.r + GAP
    const fitsRight = anchor.x + clear + PANEL_W + MARGIN <= anchor.w
    leadSide = fitsRight ? "left" : "right"
    const left = fitsRight
      ? anchor.x + clear
      : Math.max(MARGIN, anchor.x - clear - PANEL_W)
    // Vertically centre on the specimen, clamped inside the canvas box.
    const maxTop = Math.max(MARGIN, anchor.h - PANEL_H - MARGIN)
    const top = Math.min(Math.max(MARGIN, anchor.y - PANEL_H / 2), maxTop)
    dockStyle = { left, top, width: PANEL_W }
    // The connector is a sibling of the panel, not a child: inside the panel it
    // sat outside the padding box and forced a horizontal scrollbar.
    const leadLeft = fitsRight ? anchor.x + anchor.r : left + PANEL_W
    const leadRight = fitsRight ? left : anchor.x - anchor.r
    leadStyle = {
      left: leadLeft,
      top: Math.min(Math.max(top + 26, top + 12), top + PANEL_H - 12),
      width: Math.max(0, leadRight - leadLeft),
    }
  }

  return (
    <div
      className={cn("ft-modal", open && "ft-modal--open", className)}
      role="dialog"
      aria-modal={open}
      aria-hidden={!open}
      aria-labelledby="ft-dossier-title"
      data-open={open ? "true" : "false"}
      data-docked={docked ? "true" : "false"}
    >
      {fish && docked ? (
        <span
          className="ft-lead"
          data-lead={leadSide}
          style={
            {
              ...leadStyle,
              "--ft-panel-accent": `var(--${token}, ${fallback})`,
            } as CSSProperties
          }
          aria-hidden
        />
      ) : null}
      {fish ? (
        <div
          className="ft-sheet glass"
          style={
            {
              ...dockStyle,
              "--ft-specimen-accent": `var(--${token}, ${fallback})`,
            } as CSSProperties
          }
          data-lead={leadSide}
        >
          <div className="ft-scanline" aria-hidden />
          <span className="ft-corner ft-corner--tl" aria-hidden />
          <span className="ft-corner ft-corner--tr" aria-hidden />
          <span className="ft-corner ft-corner--bl" aria-hidden />
          <span className="ft-corner ft-corner--br" aria-hidden />
          <button
            type="button"
            className="ft-btn ft-close"
            onClick={onClose}
            aria-label="Release fish"
          >
            Release ✕
          </button>
          <p className="ft-specimen">
            Specimen locked · <span>{specimen}</span>
            {total > 1 ? (
              <span className="ft-dim"> / {String(total).padStart(2, "0")}</span>
            ) : null}
          </p>
          <div className="ft-badge-row">
            <span
              className="ft-badge"
              style={{
                color: `var(--${token}, ${fallback})`,
                borderColor: `color-mix(in oklab, var(--${token}, ${fallback}) 50%, transparent)`,
              }}
            >
              {domainLabel(fish.species)}
            </span>
            <span className="ft-ref">{fish.species}</span>
          </div>
          <h3 id="ft-dossier-title">{fish.title}</h3>
          {fish.blurb ? <p className="ft-blurb">{fish.blurb}</p> : null}
          {(fish.metrics?.length ?? 0) > 0 ? (
            <>
              <div className="ft-sect">Key impact metrics</div>
              <div className="ft-kv">
                {fish.metrics!.map((m) => (
                  <div key={`${m.label}-${m.value}`}>
                    <span>{m.label}</span>
                    <b>{m.value}</b>
                  </div>
                ))}
              </div>
            </>
          ) : null}
          {fish.description ? (
            <>
              <div className="ft-sect">Architecture context</div>
              <p className="ft-desc">{fish.description}</p>
            </>
          ) : null}
          {(fish.tags?.length ?? 0) > 0 ? (
            <>
              <div className="ft-sect">Stack</div>
              <div className="ft-tagrow">
                {fish.tags!.map((t) => (
                  <span key={t} className="ft-tag">
                    {t}
                  </span>
                ))}
              </div>
            </>
          ) : null}
          <div className="ft-foot">
            {href ? (
              <a
                className="ft-btn ft-cta"
                href={href}
                target="_blank"
                rel="noopener noreferrer"
              >
                Repository ↗
              </a>
            ) : null}
            <span className="ft-ref">{fish.slug}</span>
          </div>
        </div>
      ) : null}
    </div>
  )
}
