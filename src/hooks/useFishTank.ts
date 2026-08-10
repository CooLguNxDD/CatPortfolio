/**
 * Fish tank controller hook — composes layout model + transient store.
 * Views stay presentational; all filter/scene math lives here or in pure helpers.
 */

import { useCallback, useEffect, useMemo } from "react"
import { useShallow } from "zustand/react/shallow"
import type { Layout } from "@/content/schema"
import {
  domainsInSchool,
  filterFish,
  fishLitFactor,
  matchesFish,
  normalizeQuery,
  type FishFilter,
} from "@/fish/matchFish"
import {
  findFishBySlug,
  fishIndexOf,
  sceneFromLayout,
  type FishSceneConfig,
} from "@/fish/sceneFromLayout"
import { useFishTankStore } from "@/store"
import type { FishSpecimenInput } from "@/blocks/fishTankLayout"

export interface UseFishTankOptions {
  layout: Layout | null | undefined
  /** Shareable route focus (`?f=`) — wins over local store focus. */
  routeFocus?: string | null
  /** When route focus changes externally, keep store localFocus in sync for release. */
  onRouteFocusChange?: (slug: string | null) => void
}

export interface FishTankController {
  scene: FishSceneConfig
  fish: FishSpecimenInput[]
  filtered: FishSpecimenInput[]
  litCount: number
  domains: string[]
  filter: FishFilter
  query: string
  domain: string | null
  chrome: "3d" | "flat"
  tankScene: "surface" | "tank"
  stageProgress: number
  bakeActive: boolean
  curationLabel: string | null
  focusedSlug: string | null
  focusedFish: FishSpecimenInput | null
  focusedIndex: number
  setQuery: (q: string) => void
  setDomain: (d: string | null) => void
  toggleDomain: (d: string) => void
  setChrome: (c: "3d" | "flat") => void
  dive: () => void
  surface: () => void
  setScene: (s: "surface" | "tank") => void
  focusFish: (slug: string | null) => void
  applyBake: () => void
  clearBake: () => void
  dismissCuration: () => void
  isLit: (f: FishSpecimenInput) => boolean
  litFactor: (f: FishSpecimenInput) => number
}

/** Controller for stage + block chrome. */
export function useFishTank({
  layout,
  routeFocus = null,
  onRouteFocusChange,
}: UseFishTankOptions): FishTankController {
  const scene = useMemo(() => sceneFromLayout(layout), [layout])

  const ui = useFishTankStore(
    useShallow((s) => ({
      tankScene: s.scene,
      stageProgress: s.stageProgress,
      chrome: s.chrome,
      query: s.query,
      domain: s.domain,
      localFocus: s.localFocus,
      bakeActive: s.bakeActive,
      curationDismissed: s.curationDismissed,
      setScene: s.setScene,
      dive: s.dive,
      surface: s.surface,
      setChrome: s.setChrome,
      setQuery: s.setQuery,
      setDomain: s.setDomain,
      toggleDomain: s.toggleDomain,
      setLocalFocus: s.setLocalFocus,
      applyBake: s.applyBake,
      clearBake: s.clearBake,
      dismissCuration: s.dismissCuration,
      resetFishTankUi: s.resetFishTankUi,
    })),
  )

  // Reset transient UI when layout identity changes (new bake / home).
  useEffect(() => {
    return () => {
      ui.resetFishTankUi()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- unmount cleanup only
  }, [])

  const focusedSlug = routeFocus ?? ui.localFocus

  const filter: FishFilter = useMemo(
    () => ({
      query: ui.query,
      domain: ui.domain,
      highlightSlugs: scene.highlightSlugs,
      bakeActive: ui.bakeActive || scene.highlightSlugs.length > 0,
    }),
    [ui.query, ui.domain, scene.highlightSlugs, ui.bakeActive],
  )

  // When layout already has highlights (WelTel default), treat as soft bake for dimming.
  const effectiveBake =
    ui.bakeActive ||
    (scene.highlightSlugs.length > 0 && !ui.curationDismissed)

  const filterWithBake: FishFilter = useMemo(
    () => ({
      ...filter,
      bakeActive: effectiveBake && scene.highlightSlugs.length > 0,
    }),
    [filter, effectiveBake, scene.highlightSlugs.length],
  )

  const filtered = useMemo(
    () => filterFish(scene.fish, filterWithBake),
    [scene.fish, filterWithBake],
  )

  const litCount = useMemo(
    () =>
      scene.fish.filter((f) => matchesFish(f, { query: ui.query, domain: ui.domain }))
        .length,
    [scene.fish, ui.query, ui.domain],
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

  const curationLabel =
    ui.curationDismissed
      ? null
      : scene.curationLabel ||
        (ui.bakeActive ? "Bake highlight active" : null)

  const focusFish = useCallback(
    (slug: string | null) => {
      if (onRouteFocusChange) {
        onRouteFocusChange(slug)
        return
      }
      ui.setLocalFocus(slug)
    },
    [onRouteFocusChange, ui.setLocalFocus],
  )

  const surface = useCallback(() => {
    focusFish(null)
    ui.surface()
  }, [focusFish, ui.surface])

  const applyBake = useCallback(() => ui.applyBake(true), [ui.applyBake])

  const isLit = useCallback(
    (f: FishSpecimenInput) =>
      matchesFish(f, { query: ui.query, domain: ui.domain }),
    [ui.query, ui.domain],
  )

  const litFactor = useCallback(
    (f: FishSpecimenInput) => fishLitFactor(f, filterWithBake, focusedSlug),
    [filterWithBake, focusedSlug],
  )

  return {
    scene,
    fish: scene.fish,
    filtered,
    litCount,
    domains,
    filter: filterWithBake,
    query: ui.query,
    domain: ui.domain,
    chrome: ui.chrome,
    tankScene: ui.tankScene,
    stageProgress: ui.stageProgress,
    bakeActive: effectiveBake,
    curationLabel,
    focusedSlug,
    focusedFish,
    focusedIndex,
    setQuery: ui.setQuery,
    setDomain: ui.setDomain,
    toggleDomain: ui.toggleDomain,
    setChrome: ui.setChrome,
    dive: ui.dive,
    surface,
    setScene: ui.setScene,
    focusFish,
    applyBake,
    clearBake: ui.clearBake,
    dismissCuration: ui.dismissCuration,
    isLit,
    litFactor,
  }
}

export { normalizeQuery, sceneFromLayout }
