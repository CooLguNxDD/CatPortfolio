/**
 * Full-page fish tank stage — thin view over useFishTank controller.
 * Site nav/theme/accent live in App header only (no second tank header).
 */

import { useEffect, useState } from "react"
import { Link } from "@tanstack/react-router"
import { FishTankView } from "@/blocks/FishTank"
import { FishDossier } from "@/components/fish/FishDossier"
import { FishFlatGrid } from "@/components/fish/FishFlatGrid"
import { FishTankChrome } from "@/components/fish/FishTankChrome"
import { useFishTank } from "@/hooks/useFishTank"
import type { Layout } from "@/content/schema"
import type { DemoSearch } from "@/router"
import { cn } from "@/lib/utils"
import "@/styles/fish-tank.css"

export interface FishTankStageProps {
  layout: Layout
  focusedSlug?: string | null
  onFocusChange?: (slug: string | null) => void
  demoSearch?: DemoSearch
  className?: string
}

/** Immersive aquarium stage composed from modular chrome + canvas. */
export function FishTankStage({
  layout,
  focusedSlug = null,
  onFocusChange,
  demoSearch = {},
  className,
}: FishTankStageProps) {
  const tank = useFishTank({
    layout,
    routeFocus: focusedSlug,
    onRouteFocusChange: onFocusChange,
  })
  // Screen position of the locked fish — the dossier docks beside it.
  const [anchor, setAnchor] = useState<
    { x: number; y: number; r: number; w: number; h: number } | null
  >(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return
      if (tank.focusedSlug) {
        tank.focusFish(null)
        return
      }
      if (tank.tankScene === "tank") tank.surface()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [tank.focusedSlug, tank.tankScene, tank.focusFish, tank.surface])

  useEffect(() => {
    if (tank.chrome !== "3d") return
    function onWheel(e: WheelEvent) {
      if (tank.tankScene === "surface" && e.deltaY > 0) {
        e.preventDefault()
        tank.dive()
      }
    }
    window.addEventListener("wheel", onWheel, { passive: false })
    return () => window.removeEventListener("wheel", onWheel)
  }, [tank.chrome, tank.tankScene, tank.dive])

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
          onClick={() => tank.setChrome("3d")}
        >
          3D
        </button>
        <button
          type="button"
          className={cn("ft-chip-btn", tank.chrome === "flat" && "is-on")}
          aria-pressed={tank.chrome === "flat"}
          onClick={() => tank.setChrome("flat")}
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
          onSelect={(slug) => tank.focusFish(slug)}
        />
      ) : (
        <>
          <div className="ft-canvas-host">
            <FishTankView
              fish={tank.fish}
              immersive
              focusedSlug={tank.focusedSlug}
              highlightSlugs={tank.scene.highlightSlugs}
              onFocusChange={tank.focusFish}
              stageProgress={tank.stageProgress}
              litFactor={tank.litFactor}
              onFocusAnchor={setAnchor}
              className="relative h-full w-full min-h-[min(70vh,720px)]"
            />
          </div>
          <FishTankChrome
            stageProgress={tank.stageProgress}
            tankScene={tank.tankScene}
            litCount={tank.litCount}
            total={tank.fish.length}
            query={tank.query}
            domain={tank.domain}
            domains={tank.domains}
            curationLabel={tank.curationLabel}
            onQuery={tank.setQuery}
            onToggleDomain={tank.toggleDomain}
            onDive={tank.dive}
            onSurface={tank.surface}
            onDismissCuration={tank.dismissCuration}
            onBake={tank.applyBake}
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
        anchor={tank.chrome === "3d" ? anchor : null}
        onClose={() => tank.focusFish(null)}
      />
    </div>
  )
}
