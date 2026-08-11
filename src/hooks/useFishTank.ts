/**
 * Fish tank controller — wires the interaction bus to the zustand store once,
 * and exposes read-only derived view data. Components no longer call setters
 * on this controller; they `fishBus.emit(...)` directly (see fish/fishBus.ts)
 * — this hook is the single reducer translating those commands into store
 * writes, plus the `scene`/`domains`/`curationLabel` math that isn't part of
 * the store (it's derived from the layout, not interaction state).
 *
 * Focus (`?f=`) is NOT handled here — HomePage owns the router round trip
 * and syncs `store.focus` directly (see routes/HomePage.tsx), since this
 * hook has no router access and only ever has one caller (FishTankStage).
 */

import { useEffect, useMemo } from "react"
import type { Layout } from "@/content/schema"
import { domainsInSchool, matchesFish } from "@/fish/matchFish"
import { findFishBySlug, fishIndexOf, sceneFromLayout, type FishSceneConfig } from "@/fish/sceneFromLayout"
import { fishBus } from "@/fish/fishBus"
import { deriveScene, type TankState } from "@/fish/tankMachine"
import { useFishTankStore } from "@/store"
import type { FishTankChrome as ChromeMode } from "@/store/fishTankSlice"
import type { FishSpecimenInput } from "@/blocks/fishTankLayout"

export interface FishTankController {
  scene: FishSceneConfig
  fish: FishSpecimenInput[]
  litCount: number
  domains: string[]
  chrome: ChromeMode
  tankState: TankState
  tankScene: "surface" | "tank"
  bakeActive: boolean
  curationLabel: string | null
  focusedSlug: string | null
  focusedFish: FishSpecimenInput | null
  focusedIndex: number
}

/** Wires bus commands → store once, then exposes derived read-only view data. */
export function useFishTank(layout: Layout | null | undefined): FishTankController {
  const scene = useMemo(() => sceneFromLayout(layout), [layout])

  const tankState = useFishTankStore((s) => s.state)
  const chrome = useFishTankStore((s) => s.chrome)
  const query = useFishTankStore((s) => s.query)
  const domain = useFishTankStore((s) => s.domain)
  const focusedSlug = useFishTankStore((s) => s.focus)
  const bakeActive = useFishTankStore((s) => s.bakeActive)
  const curationDismissed = useFishTankStore((s) => s.curationDismissed)

  // Command handler: every chrome/canvas control emits intent onto the bus
  // (never calls a setter directly) — this is the one place that applies it.
  useEffect(() => {
    const store = useFishTankStore.getState
    function onDive() {
      store().dive()
    }
    function onSurface() {
      store().surface()
    }
    function onChrome(mode: ChromeMode) {
      store().setChrome(mode)
    }
    function onQuery(q: string) {
      store().setQuery(q)
    }
    function onDomain(d: string) {
      store().toggleDomain(d)
    }
    function onBakeApply() {
      store().applyBake()
    }
    function onBakeDismiss() {
      store().dismissCuration()
    }
    function onDepth(payload: { depth01: number } | null) {
      store().setDepthFocus(payload ? payload.depth01 : null)
    }
    function onSonar({ open }: { open: boolean }) {
      store().toggleSonar(open)
    }
    fishBus.on("tank:dive", onDive)
    fishBus.on("tank:surface", onSurface)
    fishBus.on("view:chrome", onChrome)
    fishBus.on("filter:query", onQuery)
    fishBus.on("filter:domain", onDomain)
    fishBus.on("bake:apply", onBakeApply)
    fishBus.on("bake:dismiss", onBakeDismiss)
    fishBus.on("tank:depth", onDepth)
    fishBus.on("view:sonar", onSonar)
    return () => {
      fishBus.off("tank:dive", onDive)
      fishBus.off("tank:surface", onSurface)
      fishBus.off("view:chrome", onChrome)
      fishBus.off("filter:query", onQuery)
      fishBus.off("filter:domain", onDomain)
      fishBus.off("bake:apply", onBakeApply)
      fishBus.off("bake:dismiss", onBakeDismiss)
      fishBus.off("tank:depth", onDepth)
      fishBus.off("view:sonar", onSonar)
    }
  }, [])

  // Reset transient UI when the stage unmounts (new bake / leaving tank mode).
  useEffect(() => {
    return () => {
      useFishTankStore.getState().resetFishTankUi()
    }
  }, [])

  const litCount = useMemo(
    () => scene.fish.filter((f) => matchesFish(f, { query, domain })).length,
    [scene.fish, query, domain],
  )

  const domains = useMemo(() => domainsInSchool(scene.fish), [scene.fish])

  const focusedFish = useMemo(
    () => findFishBySlug(scene.fish, focusedSlug),
    [scene.fish, focusedSlug],
  )

  const focusedIndex = useMemo(
    () => fishIndexOf(scene.fish, focusedSlug),
    [scene.fish, focusedSlug],
  )

  const curationLabel = curationDismissed
    ? null
    : scene.curationLabel || (bakeActive ? "Bake highlight active" : null)

  return {
    scene,
    fish: scene.fish,
    litCount,
    domains,
    chrome,
    tankState,
    tankScene: deriveScene(tankState),
    bakeActive,
    curationLabel,
    focusedSlug,
    focusedFish,
    focusedIndex,
  }
}
