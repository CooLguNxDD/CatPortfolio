/**
 * Subsea cyber-sonar — circular radar HUD over the canvas.
 *
 * Contacts arrive on the bus at ~10 Hz (`tank:sonar`, emitted by
 * FishTankCanvas) and are written straight onto SVG element refs, so a moving
 * shoal never re-renders React. Only the specimen list identity does, which
 * changes with the layout — the same discipline FishTankChrome uses for `--t`.
 *
 * Clicking a blip emits `fish:pick`, reusing the existing focus path
 * (bus → useFishTank → store → canvas), so sonar navigation and clicking a fish
 * in 3D are literally the same code path.
 */

import { useEffect, useMemo, useRef } from "react"

import { fishBus, type SonarContact } from "@/fish/fishBus"
import { blipToPixels } from "@/fish/sonarProjection"
import { SPECIES_FALLBACK_HEX } from "@/blocks/fishTankTokens"
import { useFishTankStore } from "@/store"
import type { DomainIdType } from "@/content/schema"
import type { FishSpecimenInput } from "@/blocks/fishTankLayout"

export interface SonarMiniMapProps {
  fish: FishSpecimenInput[]
}

const SIZE = 132
const PADDING = 10

function speciesHex(species: string): string {
  return SPECIES_FALLBACK_HEX[species as DomainIdType] || SPECIES_FALLBACK_HEX.platform
}

/** Circular radar of every specimen, camera-relative. */
export function SonarMiniMap({ fish }: SonarMiniMapProps) {
  const open = useFishTankStore((s) => s.sonarOpen)
  const toggleSonar = useFishTankStore((s) => s.toggleSonar)
  const blipRefs = useRef(new Map<string, SVGCircleElement>())
  const sweepRef = useRef<SVGLineElement | null>(null)

  // Element per specimen — stable across contact updates.
  const slugs = useMemo(() => fish.map((f) => f.slug), [fish])

  useEffect(() => {
    if (!open) return
    function onSonar(contacts: SonarContact[]) {
      for (const contact of contacts) {
        const el = blipRefs.current.get(contact.slug)
        if (!el) continue
        const { cx, cy } = blipToPixels(contact, SIZE, PADDING)
        el.setAttribute("cx", String(cx))
        el.setAttribute("cy", String(cy))
        // Deeper contacts read smaller and dimmer, like a real depth sounder.
        el.setAttribute("r", String(2.2 + (1 - contact.depth01) * 2))
        el.setAttribute("opacity", String(0.25 + contact.lit * 0.75))
      }
    }
    fishBus.on("tank:sonar", onSonar)
    return () => fishBus.off("tank:sonar", onSonar)
  }, [open, slugs])

  // Sweep hand — CSS animation would restart on every React commit, so it is
  // driven off the same rAF budget as the rest of the HUD.
  useEffect(() => {
    if (!open) return
    let raf = 0
    const start = performance.now()
    const spin = () => {
      raf = requestAnimationFrame(spin)
      const line = sweepRef.current
      if (!line) return
      const angle = ((performance.now() - start) / 1000) * 60
      line.setAttribute("transform", `rotate(${angle} ${SIZE / 2} ${SIZE / 2})`)
    }
    spin()
    return () => cancelAnimationFrame(raf)
  }, [open])

  if (!fish.length) return null

  return (
    <div className="ft-sonar" data-open={open ? "true" : "false"}>
      <button
        type="button"
        className="ft-sonar-toggle"
        onClick={() => toggleSonar()}
        aria-expanded={open}
        title={open ? "Hide sonar" : "Show sonar"}
      >
        ◎ Sonar
      </button>
      {open ? (
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="ft-sonar-disc"
          role="group"
          aria-label="Specimen sonar"
        >
          <circle cx={SIZE / 2} cy={SIZE / 2} r={SIZE / 2 - 2} className="ft-sonar-ring" />
          <circle cx={SIZE / 2} cy={SIZE / 2} r={SIZE / 3.2} className="ft-sonar-ring" />
          <circle cx={SIZE / 2} cy={SIZE / 2} r={SIZE / 6} className="ft-sonar-ring" />
          <line
            ref={sweepRef}
            x1={SIZE / 2}
            y1={SIZE / 2}
            x2={SIZE / 2}
            y2={PADDING}
            className="ft-sonar-sweep"
          />
          {fish.map((f) => (
            // <circle role="button"> is poorly supported by some older
            // screen readers — wrap it in a <g> so the interactive role and
            // keyboard handling sit on an element assistive tech expects,
            // and leave the circle itself purely presentational.
            <g
              key={f.slug}
              role="button"
              tabIndex={0}
              aria-label={f.title}
              className="ft-sonar-blip"
              onClick={() => fishBus.emit("fish:pick", { slug: f.slug })}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  fishBus.emit("fish:pick", { slug: f.slug })
                }
              }}
            >
              <circle
                ref={(el) => {
                  if (el) blipRefs.current.set(f.slug, el)
                  else blipRefs.current.delete(f.slug)
                }}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={3}
                fill={speciesHex(f.species)}
                className="ft-sonar-blip"
              >
                <title>{f.title}</title>
              </circle>
            </g>
          ))}
        </svg>
      ) : null}
    </div>
  )
}
