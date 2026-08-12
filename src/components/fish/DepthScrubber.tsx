/**
 * Abyssal bathymetry scrubber — the tank's vertical axis as a timeline.
 *
 * Depth already means age in the tank legend, so the bands come straight from
 * fish/bathymetry.ts; no per-fish year field and no layout schema change.
 * Selecting a band emits `tank:depth`, which the controller turns into a store
 * write and the canvas turns into a camera move.
 */

import { fishBus } from "@/fish/fishBus"
import { bandForDepth, depthBands } from "@/fish/bathymetry"
import { useFishTankStore } from "@/store"
import { cn } from "@/lib/utils"

/** Vertical depth rail with one stop per bathymetric band. */
export function DepthScrubber() {
  const depthFocus = useFishTankStore((s) => s.depthFocus)
  // depthBands() is a pure, cheap static-array build — no useMemo needed.
  const bands = depthBands()
  const activeZone = depthFocus == null ? null : bandForDepth(depthFocus).zone

  return (
    <div className="ft-bathymetry" role="group" aria-label="Dive by year">
      {bands.map((band) => {
        const active = activeZone === band.zone
        return (
          <button
            key={band.zone}
            type="button"
            className={cn("ft-bathy-stop", active && "is-on")}
            aria-pressed={active}
            onClick={() =>
              fishBus.emit(
                "tank:depth",
                active ? null : { depth01: (band.from + band.to) / 2 },
              )
            }
            title={`${band.label} · ${band.blurb}`}
          >
            <span className="ft-bathy-year">{band.year}</span>
            <span className="ft-bathy-label">{band.label}</span>
          </button>
        )
      })}
      {depthFocus != null ? (
        <button
          type="button"
          className="ft-bathy-clear"
          onClick={() => fishBus.emit("tank:depth", null)}
        >
          free dive
        </button>
      ) : null}
    </div>
  )
}
