/**
 * Specimen analysis panel — docks beside the locked fish like an instrument
 * readout. No full-screen scrim, so the specimen stays visible next to it.
 *
 * Dock position tracks the canvas-local anchor the WebGL loop publishes on
 * `fish:anchor` (see fish/fishBus.ts) — a 60fps-shaped observation while the
 * camera eases onto a freshly-locked specimen.
 */

import { useEffect, useRef, type CSSProperties } from "react"
import type { FishSpecimenInput } from "@/blocks/fishTankLayout"
import {
  DOMAIN_LABEL,
  SPECIES_TOKEN,
  SPECIES_FALLBACK_HEX,
} from "@/blocks/fishTankTokens"
import type { DomainIdType } from "@/content/schema"
import { cn } from "@/lib/utils"
import { fishBus, type FishAnchor } from "@/fish/fishBus"
import { createFrameChannel } from "@/fish/frameChannel"
import { useFocusTrap } from "@/hooks/useFocusTrap"

export interface FishDossierProps {
  fish: FishSpecimenInput | null
  index?: number
  total?: number
  onClose: () => void
  onPrev?: () => void
  onNext?: () => void
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
  onClose,
  onPrev,
  onNext,
  className,
}: FishDossierProps) {
  const open = Boolean(fish)
  const sp = (fish?.species || "platform") as DomainIdType
  const token = SPECIES_TOKEN[sp] || "accent-platform"
  const fallback = SPECIES_FALLBACK_HEX[sp] || "#fbbf24"
  const href = fish ? linkHref(fish.link) : null
  const specimen = String(index).padStart(2, "0")

  const rootRef = useRef<HTMLDivElement | null>(null)
  const sheetRef = useRef<HTMLDivElement | null>(null)
  const leadRef = useRef<HTMLSpanElement | null>(null)

  useFocusTrap(open, sheetRef)

  useEffect(() => {
    const channel = createFrameChannel(fishBus, "fish:anchor", null)
    return channel.subscribe((anchor: FishAnchor | null) => {
      const root = rootRef.current
      const sheet = sheetRef.current
      const lead = leadRef.current
      if (!root || !sheet) return

      const docked = Boolean(anchor) && anchor!.w > DOCK_MIN_W
      root.dataset.docked = docked ? "true" : "false"
      if (!docked || !anchor) {
        sheet.style.removeProperty("left")
        sheet.style.removeProperty("top")
        sheet.style.removeProperty("width")
        delete sheet.dataset.lead
        return
      }

      const clear = anchor.r + GAP
      const fitsRight = anchor.x + clear + PANEL_W + MARGIN <= anchor.w
      const leadSide: "left" | "right" = fitsRight ? "left" : "right"
      const left = fitsRight
        ? Math.min(anchor.w - PANEL_W - MARGIN, Math.max(anchor.x + clear, anchor.w * 0.52))
        : Math.max(MARGIN, anchor.x - clear - PANEL_W)
      const maxTop = Math.max(MARGIN, anchor.h - PANEL_H - MARGIN)
      const top = Math.min(Math.max(MARGIN, anchor.y - PANEL_H / 2), maxTop)

      sheet.style.left = `${left}px`
      sheet.style.top = `${top}px`
      sheet.style.width = `${PANEL_W}px`
      sheet.dataset.lead = leadSide

      if (lead) {
        const leadLeft = fitsRight ? anchor.x + anchor.r : left + PANEL_W
        const leadRight = fitsRight ? left : anchor.x - anchor.r
        lead.dataset.lead = leadSide
        lead.style.left = `${leadLeft}px`
        lead.style.top = `${Math.min(Math.max(top + 26, top + 12), top + PANEL_H - 12)}px`
        lead.style.width = `${Math.max(0, leadRight - leadLeft)}px`
      }
    })
  }, [])

  return (
    <div
      ref={rootRef}
      className={cn("ft-modal", open && "ft-modal--open", className)}
      role="dialog"
      aria-modal={open}
      aria-hidden={!open}
      aria-labelledby="ft-dossier-title"
      data-open={open ? "true" : "false"}
      data-docked="false"
    >
      <span
        ref={leadRef}
        className="ft-lead-line"
        style={{ "--ft-panel-accent": `var(--${token}, ${fallback})` } as CSSProperties}
        aria-hidden
      />
      {fish ? (
        <div
          ref={sheetRef}
          className="ft-sheet glass"
          style={{ "--ft-specimen-accent": `var(--${token}, ${fallback})` } as CSSProperties}
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
          <div className="flex items-center justify-between gap-2">
            <p className="ft-specimen">
              Specimen locked · <span>{specimen}</span>
              {total > 1 ? (
                <span className="ft-dim"> / {String(total).padStart(2, "0")}</span>
              ) : null}
            </p>
            {total > 1 && (onPrev || onNext) ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="ft-nav-btn text-[11px] font-mono px-2 py-0.5 rounded border border-(--hairline) hover:border-(--ft-panel-accent) text-(--fg-muted) hover:text-(--fg) cursor-pointer transition-colors"
                  onClick={onPrev}
                  title="Previous specimen (←)"
                  aria-label="Previous specimen"
                >
                  ‹ Prev
                </button>
                <button
                  type="button"
                  className="ft-nav-btn text-[11px] font-mono px-2 py-0.5 rounded border border-(--hairline) hover:border-(--ft-panel-accent) text-(--fg-muted) hover:text-(--fg) cursor-pointer transition-colors"
                  onClick={onNext}
                  title="Next specimen (→)"
                  aria-label="Next specimen"
                >
                  Next ›
                </button>
              </div>
            ) : null}
          </div>
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
            <span className="ft-ref font-mono text-[10px] tracking-wider">{fish.species.toUpperCase()} // SYS-LOCKED</span>
          </div>
          <h3 id="ft-dossier-title" className="text-xl font-bold tracking-tight">{fish.title}</h3>
          {fish.blurb ? <p className="ft-blurb text-sm leading-relaxed">{fish.blurb}</p> : null}
          {(fish.metrics?.length ?? 0) > 0 ? (
            <>
              <div className="ft-sect flex items-center justify-between text-xs font-mono tracking-widest text-(--fg-muted)">
                <span>KEY IMPACT METRICS</span>
                <span className="h-1 w-1 rounded-full bg-(--accent-amber) animate-pulse" />
              </div>
              <div className="ft-kv grid grid-cols-3 gap-2">
                {fish.metrics!.map((m) => (
                  <div key={`${m.label}-${m.value}`} className="p-2 rounded bg-(--card)/40 border border-(--hairline)/50">
                    <span className="text-[10px] text-(--fg-muted) block truncate">{m.label}</span>
                    <b className="text-base text-(--fg) font-semibold block">{m.value}</b>
                  </div>
                ))}
              </div>
            </>
          ) : null}
          {fish.description ? (
            <>
              <div className="ft-sect text-xs font-mono tracking-widest text-(--fg-muted)">ARCHITECTURE CONTEXT</div>
              <p className="ft-desc text-xs leading-relaxed opacity-90">{fish.description}</p>
            </>
          ) : null}
          {(fish.tags?.length ?? 0) > 0 ? (
            <>
              <div className="ft-sect text-xs font-mono tracking-widest text-(--fg-muted)">DEPLOYED STACK</div>
              <div className="ft-tagrow flex flex-wrap gap-1.5">
                {fish.tags!.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => fishBus.emit("filter:query", t)}
                    title={`Filter by #${t}`}
                    className="ft-tag text-[11px] px-2 py-0.5 rounded-full bg-(--hairline)/40 text-(--fg-muted) border border-(--hairline) hover:border-(--ft-panel-accent) hover:text-(--fg) cursor-pointer transition-colors"
                  >
                    #{t}
                  </button>
                ))}
              </div>
            </>
          ) : null}
          <div className="ft-foot flex items-center justify-between pt-3 border-t border-(--hairline)">
            {href ? (
              <a
                className="ft-btn ft-cta text-xs px-3 py-1.5 rounded-md font-mono"
                href={href}
                target="_blank"
                rel="noopener noreferrer"
              >
                Repository ↗
              </a>
            ) : null}
            <span className="ft-ref font-mono text-[10px] opacity-60">{fish.slug}</span>
          </div>
        </div>
      ) : null}
    </div>
  )
}
