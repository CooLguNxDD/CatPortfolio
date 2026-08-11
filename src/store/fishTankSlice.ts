/**
 * Fish tank transient UI slice (react-app-guide: non-persisted client state).
 *
 * Ownership:
 *   - URL `?v=` / `?f=` → shareable route state (TanStack Router)
 *   - discrete scene state / filter / bake dimming → this slice (resets on reload)
 *   - 60fps dive progress → fish/diveAnimator, bus-only (never touches this store)
 *   - fish[] payloads → derived from layout (Query / bake / compile)
 *
 * Commands arrive here from `useFishTank`'s bus subscription (see
 * fish/fishBus.ts) rather than being called directly by components — chrome
 * and the stage emit intent onto the bus, this slice is the reducer.
 */

import type { StateCreator } from "zustand"

import { fishBus } from "@/fish/fishBus"
import { createDiveAnimator } from "@/fish/diveAnimator"
import { DIVE_DURATION_MS, SURFACE_DURATION_MS } from "@/blocks/fishTankLayout"
import { next, type TankState } from "@/fish/tankMachine"

/** Legacy two-bucket scene label — derived from TankState, see tankMachine.deriveScene. */
export type FishTankScene = "surface" | "tank"

/** 3D WebGL layer vs flat DOM index (within tank home mode). */
export type FishTankChrome = "3d" | "flat"

export interface FishTankSlice {
  state: TankState
  chrome: FishTankChrome
  /** Search box text (not URL — ephemeral). */
  query: string
  /** Domain chip filter, or null = all. */
  domain: string | null
  /**
   * Canonical resolved focus slug. Written unconditionally by the router sync
   * effect (HomePage owns `?f=`) or by the bus command handler for callers
   * with no router (inline registry block) — see useFishTank.ts.
   */
  focus: string | null
  /** Simulated bake: dim non-highlights + show curation chip. */
  bakeActive: boolean
  /** Cleared curation hides the bake label without touching layout. */
  curationDismissed: boolean

  dive: () => void
  surface: () => void
  setChrome: (chrome: FishTankChrome) => void
  setQuery: (query: string) => void
  setDomain: (domain: string | null) => void
  toggleDomain: (domain: string) => void
  /** Unconditional — router is the authority; see tankMachine.ts header. */
  setFocus: (slug: string | null) => void
  applyBake: (active?: boolean) => void
  clearBake: () => void
  dismissCuration: () => void
  /** Full reset when leaving tank mode / unmounting stage. */
  resetFishTankUi: () => void
}

const DEFAULTS: Pick<
  FishTankSlice,
  | "state"
  | "chrome"
  | "query"
  | "domain"
  | "focus"
  | "bakeActive"
  | "curationDismissed"
> = {
  state: "surface",
  chrome: "3d",
  query: "",
  domain: null,
  focus: null,
  bakeActive: false,
  curationDismissed: false,
}

/** Creates the fish-tank transient UI slice. */
export const createFishTankSlice: StateCreator<FishTankSlice> = (set, get) => {
  const animator = createDiveAnimator(fishBus)

  /** Animate to a target progress, then apply the machine's `arrive` event. */
  function runTransition(target: 0 | 1, durationMs: number) {
    animator.animateTo(target, durationMs, () => {
      const arrived = next(get().state, "arrive")
      if (arrived) set({ state: arrived })
    })
  }

  return {
    ...DEFAULTS,

    dive: () => {
      const target = next(get().state, "dive")
      if (!target) return
      set({ state: target })
      runTransition(1, DIVE_DURATION_MS)
    },

    surface: () => {
      const target = next(get().state, "surface")
      if (!target) return
      set({ state: target, focus: null })
      runTransition(0, SURFACE_DURATION_MS)
    },

    setChrome: (chrome) => set({ chrome }),

    setQuery: (query) => set({ query }),

    setDomain: (domain) => set({ domain }),

    toggleDomain: (domain) => {
      const cur = get().domain
      set({ domain: cur === domain ? null : domain })
    },

    setFocus: (slug) => {
      set({ focus: slug })
      const cur = get().state
      const target = slug ? next(cur, "focus") : next(cur, "release")
      if (target) set({ state: target })
    },

    applyBake: (active = true) =>
      set({
        bakeActive: active,
        curationDismissed: active ? false : get().curationDismissed,
      }),

    clearBake: () =>
      set({
        bakeActive: false,
        curationDismissed: true,
      }),

    dismissCuration: () =>
      set({
        curationDismissed: true,
        bakeActive: false,
      }),

    resetFishTankUi: () => {
      animator.cancel()
      set({ ...DEFAULTS })
    },
  }
}

export { deriveScene } from "@/fish/tankMachine"
export type { TankState } from "@/fish/tankMachine"
