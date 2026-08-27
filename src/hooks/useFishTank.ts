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
import { useShallow } from "zustand/react/shallow"
import type { Layout } from "@/content/schema"
import { domainsInSchool, matchesFish } from "@/fish/matchFish"
import { findFishBySlug, fishIndexOf, sceneFromLayout, type FishSceneConfig } from "@/fish/sceneFromLayout"
import { fishBus, type FishEvents } from "@/fish/fishBus"
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

  const { tankState, chrome, query, domain, focusedSlug, bakeActive, curationDismissed } = useFishTankStore(
    useShallow((s) => ({
      tankState: s.state,
      chrome: s.chrome,
      query: s.query,
      domain: s.domain,
      focusedSlug: s.focus,
      bakeActive: s.bakeActive,
      curationDismissed: s.curationDismissed,
    })),
  )

  // Command handler: every chrome/canvas control emits intent onto the bus
  // (never calls a setter directly) — this is the one place that applies it.
  // `register` pairs on/off per call (typed per-event via K) so adding a
  // command is one line instead of a new function plus two on/off sites
  // that can drift out of sync.
  useEffect(() => {
    const store = useFishTankStore.getState
    const cleanups: Array<() => void> = []
    function register<K extends keyof FishEvents>(
      type: K,
      handler: (payload: FishEvents[K]) => void,
    ) {
      fishBus.on(type, handler)
      cleanups.push(() => fishBus.off(type, handler))
    }
    register("tank:dive", () => store().dive())
    register("tank:surface", () => store().surface())
    register("view:chrome", (mode) => store().setChrome(mode))
    register("filter:query", (q) => store().setQuery(q))
    register("filter:domain", (d) => store().toggleDomain(d))
    register("bake:apply", () => store().applyBake())
    register("bake:dismiss", () => store().dismissCuration())
    register("tank:depth", (payload) => store().setDepthFocus(payload ? payload.depth01 : null))
    register("view:sonar", ({ open }) => store().toggleSonar(open))
    return () => {
      for (const cleanup of cleanups) cleanup()
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
