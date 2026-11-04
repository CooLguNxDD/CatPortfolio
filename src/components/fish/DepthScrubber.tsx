/**
 * Bathymetry timeline — the tank's depth axis read as years.
 *
 * Depth already means age in the tank legend, so the bands come straight from
 * fish/bathymetry.ts; no per-fish year field and no layout schema change.
 * Selecting a band emits `tank:depth`, which the controller turns into a store
 * write and the canvas turns into a camera move; "All years" releases it.
 *
 * `float` is the compact chip strip over the desktop scene; `inline` is the
 * same control inside the Scene controls panel (the only copy on phones).
 */

import { fishBus } from "@/fish/fishBus"
import { bandForDepth, depthBands } from "@/fish/bathymetry"
import { useFishTankStore } from "@/store"
import { cn } from "@/lib/utils"

export interface DepthScrubberProps {
  variant?: "float" | "inline"
}

/** Compact timeline chips, one per bathymetric band plus "All years". */
export function DepthScrubber({ variant = "float" }: DepthScrubberProps) {
  const depthFocus = useFishTankStore((s) => s.depthFocus)
  // depthBands() is a pure, cheap static-array build — no useMemo needed.
  const bands = depthBands()
  const activeZone = depthFocus == null ? null : bandForDepth(depthFocus).zone

  return (
    <div
      className={cn(
        "ft-timeline",
        variant === "float" ? "ft-bathymetry" : "ft-timeline--inline",
      )}
      role="group"
      aria-label="Dive by year"
    >
      {variant === "float" ? (
        <span className="ft-timeline-label" aria-hidden="true">
          Timeline
        </span>
      ) : null}
      <button
        type="button"
        className={cn("ft-bathy-stop", depthFocus == null && "is-on")}
        aria-pressed={depthFocus == null}
        onClick={() => fishBus.emit("tank:depth", null)}
        title="Free dive · every year"
      >
        All years
      </button>
      {bands.map((band) => {
        const active = activeZone === band.zone
        return (
          <button
            key={band.zone}
            type="button"
            className={cn("ft-bathy-stop", active && "is-on")}
            aria-pressed={active}
            aria-label={`${band.year} · ${band.label}`}
            onClick={() =>
              fishBus.emit(
                "tank:depth",
                active ? null : { depth01: (band.from + band.to) / 2 },
              )
            }
            title={`${band.label} · ${band.blurb}`}
          >
            {band.year}
          </button>
        )
      })}
    </div>
  )
}
