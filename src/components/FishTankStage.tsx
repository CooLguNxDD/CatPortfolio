/**
 * Full-page fish tank stage — thin view over useFishTank controller.
 * Site nav/theme/accent live in App header only (no second tank header).
 *
 * Interaction commands (dive/surface/chrome/focus) are emitted onto the fish
 * bus rather than called as controller methods — see fish/fishBus.ts. Focus
 * itself is owned by HomePage (router `?f=` ↔ store.focus round trip); this
 * component only reads the resolved value off useFishTank for the dossier.
 */

import { useEffect, useRef, useState } from "react"
import { Link } from "@tanstack/react-router"
import { FishTankView } from "@/blocks/FishTank"
import { FishDossier } from "@/components/fish/FishDossier"
import { FishFlatGrid } from "@/components/fish/FishFlatGrid"
import { FishTankChrome } from "@/components/fish/FishTankChrome"
import { SonarMiniMap } from "@/components/fish/SonarMiniMap"
import { DepthScrubber } from "@/components/fish/DepthScrubber"
import { ChatPanel } from "@/components/chat/ChatPanel"
import { useFishTank } from "@/hooks/useFishTank"
import { fishBus } from "@/fish/fishBus"
import { useChatStore } from "@/store"
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
  const [askOpen, setAskOpen] = useState(false)

  useEffect(() => {
    function onAskToggle() {
      setAskOpen((prev) => !prev)
    }
    function onAskOpen(payload?: { prompt?: string } | void) {
      setAskOpen(true)
      if (payload && typeof payload === "object" && payload.prompt) {
        useChatStore.getState().setPendingPrompt(payload.prompt)
      }
    }
    function onAskClose() {
      setAskOpen(false)
    }
    fishBus.on("ask:toggle", onAskToggle)
    fishBus.on("ask:open", onAskOpen)
    fishBus.on("ask:close", onAskClose)
    return () => {
      fishBus.off("ask:toggle", onAskToggle)
      fishBus.off("ask:open", onAskOpen)
      fishBus.off("ask:close", onAskClose)
    }
  }, [])

  // Element focused when the dossier opened, so Escape hands focus back
  // instead of dropping keyboard users at the top of the document.
  const dossierOpenerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!tank.focusedSlug) {
      dossierOpenerRef.current = null
      return
    }
    if (dossierOpenerRef.current) return
    const active = document.activeElement
    dossierOpenerRef.current =
      active instanceof HTMLElement && active !== document.body ? active : null
  }, [tank.focusedSlug])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return
      if (askOpen) {
        setAskOpen(false)
        return
      }
      if (tank.focusedSlug) {
        const opener = dossierOpenerRef.current
        dossierOpenerRef.current = null
        fishBus.emit("fish:release")
        if (opener && document.contains(opener)) opener.focus()
        return
      }
      if (tank.tankScene === "tank") fishBus.emit("tank:surface")
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [askOpen, tank.focusedSlug, tank.tankScene])

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
          <SonarMiniMap fish={tank.fish} />
          <DepthScrubber />
        </>
      )}

      <FishDossier
        fish={tank.focusedFish}
        index={tank.focusedIndex}
        total={tank.fish.length}
        onClose={() => fishBus.emit("fish:release")}
      />

      {askOpen ? (
        <aside
          className="ft-ask-dock glass"
          aria-label="Ask Agent"
        >
          <div className="flex items-center justify-between border-b border-(--hairline) px-3 py-2">
            <span className="text-xs font-mono font-bold text-(--amber) flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-(--neon) animate-pulse" />
              Ask Tank Agent · Live Patch
            </span>
            <button
              type="button"
              className="ft-chip-btn text-xs px-2 py-0.5"
              onClick={() => setAskOpen(false)}
              title="Close Ask Panel (Esc)"
            >
              ✕ Close
            </button>
          </div>
          <div className="p-2 overflow-y-auto max-h-[calc(100svh-190px)]">
            <ChatPanel layout={layout} view="tank" />
          </div>
        </aside>
      ) : null}
    </div>
  )
}
