/**
 * Full-page fish tank stage — thin view over useFishTank controller.
 * Site nav/theme/accent live in App header only (no second tank header).
 *
 * Interaction commands (dive/surface/chrome/focus) are emitted onto the fish
 * bus rather than called as controller methods — see fish/fishBus.ts. Focus
 * itself is owned by HomePage (router `?f=` ↔ store.focus round trip); this
 * component only reads the resolved value off useFishTank for the dossier.
 */

import { useEffect } from "react"
import { Link } from "@tanstack/react-router"
import { FishTankView } from "@/blocks/FishTank"
import { FishDossier } from "@/components/fish/FishDossier"
import { FishFlatGrid } from "@/components/fish/FishFlatGrid"
import { FishTankChrome } from "@/components/fish/FishTankChrome"
import { useFishTank } from "@/hooks/useFishTank"
import { fishBus } from "@/fish/fishBus"
import { canDiveOnScroll } from "@/fish/tankMachine"
import type { Layout } from "@/content/schema"
import type { DemoSearch } from "@/router"
import { cn } from "@/lib/utils"
import "@/styles/fish-tank.css"

export interface FishTankStageProps {
  layout: Layout
  demoSearch?: DemoSearch
  className?: string
}

/** Immersive aquarium stage composed from modular chrome + canvas. */
export function FishTankStage({
  layout,
  demoSearch = {},
  className,
}: FishTankStageProps) {
  const tank = useFishTank(layout)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return
      if (tank.focusedSlug) {
        fishBus.emit("fish:release")
        return
      }
      if (tank.tankScene === "tank") fishBus.emit("tank:surface")
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [tank.focusedSlug, tank.tankScene])

  useEffect(() => {
    if (tank.chrome !== "3d") return
    let lastWheelTime = 0

    function onWheel(e: WheelEvent) {
      const now = performance.now()
      if (now - lastWheelTime < 250) return

      // On surface, scrolling down triggers the dive into the tank.
      // In the underwater scene, wheel events are handled exclusively by the 3D canvas for zoom in/out.
      if (canDiveOnScroll(tank.tankState) && e.deltaY > 10) {
        lastWheelTime = now
        e.preventDefault()
        fishBus.emit("tank:dive")
      }
    }

    let touchStartY = 0
    function onTouchStart(e: TouchEvent) {
      if (e.touches.length === 1) {
        touchStartY = e.touches[0].clientY
      }
    }
    function onTouchEnd(e: TouchEvent) {
      if (e.changedTouches.length === 1) {
        const touchEndY = e.changedTouches[0].clientY
        const diff = touchStartY - touchEndY // positive = swipe up / scroll down
        if (canDiveOnScroll(tank.tankState) && diff > 40) {
          fishBus.emit("tank:dive")
        }
      }
    }

    window.addEventListener("wheel", onWheel, { passive: false })
    window.addEventListener("touchstart", onTouchStart, { passive: true })
    window.addEventListener("touchend", onTouchEnd, { passive: true })
    return () => {
      window.removeEventListener("wheel", onWheel)
      window.removeEventListener("touchstart", onTouchStart)
      window.removeEventListener("touchend", onTouchEnd)
    }
  }, [tank.chrome, tank.tankState])

  if (!tank.fish.length) return null

  return (
    <div
      className={cn("ft-stage", className)}
      data-view={tank.chrome}
      data-fishtank-stage={tank.tankScene}
      data-fishtank-chrome={tank.chrome}
    >
      {/* Floating view toggles — not a second sticky header */}
      <div
        className="ft-view-pills"
        role="group"
        aria-label="Tank view"
      >
        <button
          type="button"
          className={cn("ft-chip-btn", tank.chrome === "3d" && "is-on")}
          aria-pressed={tank.chrome === "3d"}
          onClick={() => fishBus.emit("view:chrome", "3d")}
        >
          3D
        </button>
        <button
          type="button"
          className={cn("ft-chip-btn", tank.chrome === "flat" && "is-on")}
          aria-pressed={tank.chrome === "flat"}
          onClick={() => fishBus.emit("view:chrome", "flat")}
        >
          Flat
        </button>
        <Link
          to="/"
          search={{ ...demoSearch, v: "text" }}
          className="ft-chip-btn no-underline"
        >
          Text
        </Link>
      </div>

      {tank.chrome === "flat" ? (
        <FishFlatGrid
          fish={tank.fish}
          curationLabel={tank.curationLabel ?? undefined}
          onSelect={(slug) => fishBus.emit("fish:pick", { slug })}
        />
      ) : (
        <>
          <div className="ft-canvas-host">
            <FishTankView
              fish={tank.fish}
              immersive
              highlightSlugs={tank.scene.highlightSlugs}
              className="relative h-full w-full min-h-[min(70vh,720px)]"
            />
          </div>
          <FishTankChrome
            litCount={tank.litCount}
            total={tank.fish.length}
            domains={tank.domains}
            curationLabel={tank.curationLabel}
          />
          <div className="ft-depthmarks" aria-hidden>
            <div>▸ Surface · shipped now</div>
            <div>▸ Mid water · last year</div>
            <div>▸ Deep bed · archived</div>
          </div>
        </>
      )}

      <FishDossier
        fish={tank.focusedFish}
        index={tank.focusedIndex}
        total={tank.fish.length}
        onClose={() => fishBus.emit("fish:release")}
      />
    </div>
  )
}
