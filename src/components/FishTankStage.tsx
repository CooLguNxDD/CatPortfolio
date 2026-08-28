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
import { ShortcutsModal } from "@/components/fish/ShortcutsModal"
import { ChatPanel } from "@/components/chat/ChatPanel"
import { useFishTank } from "@/hooks/useFishTank"
import { useTankHotkeys } from "@/hooks/useTankHotkeys"
import { useFocusTrap } from "@/hooks/useFocusTrap"
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
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const askDockRef = useRef<HTMLElement | null>(null)

  useFocusTrap(askOpen, askDockRef)

  const handlePrev = () => {
    if (!tank.fish.length || !tank.focusedSlug) return
    const curIdx = tank.fish.findIndex((f) => f.slug === tank.focusedSlug)
    if (curIdx === -1) return
    const prevIdx = (curIdx - 1 + tank.fish.length) % tank.fish.length
    const prevSlug = tank.fish[prevIdx]?.slug
    if (prevSlug) {
      fishBus.emit("fish:pick", { slug: prevSlug })
    }
  }

  const handleNext = () => {
    if (!tank.fish.length || !tank.focusedSlug) return
    const curIdx = tank.fish.findIndex((f) => f.slug === tank.focusedSlug)
    if (curIdx === -1) return
    const nextIdx = (curIdx + 1) % tank.fish.length
    const nextSlug = tank.fish[nextIdx]?.slug
    if (nextSlug) {
      fishBus.emit("fish:pick", { slug: nextSlug })
    }
  }

  useTankHotkeys({
    enabled: tank.chrome === "3d" && !shortcutsOpen,
    domains: tank.domains,
    onPrevSpecimen: tank.focusedSlug ? handlePrev : undefined,
    onNextSpecimen: tank.focusedSlug ? handleNext : undefined,
  })

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
    function onShortcutsToggle() {
      setShortcutsOpen((prev) => !prev)
    }
    fishBus.on("ask:toggle", onAskToggle)
    fishBus.on("ask:open", onAskOpen)
    fishBus.on("ask:close", onAskClose)
    fishBus.on("shortcuts:toggle", onShortcutsToggle)
    return () => {
      fishBus.off("ask:toggle", onAskToggle)
      fishBus.off("ask:open", onAskOpen)
      fishBus.off("ask:close", onAskClose)
      fishBus.off("shortcuts:toggle", onShortcutsToggle)
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
      if (shortcutsOpen) {
        setShortcutsOpen(false)
        return
      }
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
  }, [shortcutsOpen, askOpen, tank.focusedSlug, tank.tankScene])

  useEffect(() => {
    if (tank.chrome !== "3d") return
    const stage = stageRef.current
    if (!stage) return
    let lastWheelTime = 0

    // Ask dock / dossier / shortcuts live inside #fish-tank. Ignore their
    // scroll so a surfaced wheel over the overlay does not start a dive.
    function isOverlayScroll(e: Event): boolean {
      const t = e.target
      return t instanceof Element && Boolean(
        t.closest(".ft-ask-dock, .ft-modal, .ft-shortcuts-backdrop"),
      )
    }

    function onWheel(e: WheelEvent) {
      if (isOverlayScroll(e)) return
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
      if (isOverlayScroll(e)) return
      if (e.touches.length === 1) {
        touchStartY = e.touches[0].clientY
      }
    }
    function onTouchEnd(e: TouchEvent) {
      if (isOverlayScroll(e)) return
      if (e.changedTouches.length === 1) {
        const touchEndY = e.changedTouches[0].clientY
        const diff = touchStartY - touchEndY // positive = swipe up / scroll down
        if (canDiveOnScroll(tank.tankState) && diff > 40) {
          fishBus.emit("tank:dive")
        }
      }
    }

    stage.addEventListener("wheel", onWheel, { passive: false })
    stage.addEventListener("touchstart", onTouchStart, { passive: true })
    stage.addEventListener("touchend", onTouchEnd, { passive: true })
    return () => {
      stage.removeEventListener("wheel", onWheel)
      stage.removeEventListener("touchstart", onTouchStart)
      stage.removeEventListener("touchend", onTouchEnd)
    }
  }, [tank.chrome, tank.tankState])

  return (
    <div
      ref={stageRef}
      id="fish-tank"
      className={cn("ft-stage", className)}
      data-view={tank.chrome}
      data-fishtank-stage={tank.tankScene}
      data-fishtank-chrome={tank.chrome}
    >
      {/* Floating view toggles — not a second sticky header */}
      <div className="ft-top-actions">
        {tank.tankScene === "tank" ? (
          <button
            type="button"
            className="ft-surface-pill"
            onClick={() => fishBus.emit("tank:surface")}
            title="Back to the surface (Esc)"
          >
            ↑ Surface
          </button>
        ) : null}
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
      </div>

      {tank.chrome === "flat" ? (
        <FishFlatGrid
          fish={tank.fish}
          highlightSlugs={tank.scene.highlightSlugs}
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
        onPrev={handlePrev}
        onNext={handleNext}
        onClose={() => fishBus.emit("fish:release")}
      />

      <ShortcutsModal
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />

      {askOpen ? (
        <aside
          ref={askDockRef}
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
          <div className="p-2 overflow-y-auto max-h-[calc(100svh-190px)]" data-ask-panel>
            <ChatPanel layout={layout} view="tank" />
          </div>
        </aside>
      ) : null}
    </div>
  )
}
