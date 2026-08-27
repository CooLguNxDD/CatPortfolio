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
import { canFocus, next, type TankState } from "@/fish/tankMachine"

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
  /** Sound synthesizer active state (default false for accessibility). */
  soundEnabled: boolean
  /**
   * Bathymetry lock: depth01 the camera is parked at, or null when free.
   * Depth doubles as the timeline axis — see fish/bathymetry.ts.
   */
  depthFocus: number | null
  /** Sonar mini-map visibility. */
  sonarOpen: boolean
  /**
   * Slug awaiting the dive a surface pick started — `focus` above is set
   * immediately (camera tracks through the descent), applied to `state`
   * once the dive lands. See tankMachine.ts `canFocus`.
   */
  pendingFocus: string | null

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
  toggleSound: (enabled?: boolean) => void
  setDepthFocus: (depth01: number | null) => void
  toggleSonar: (open?: boolean) => void
  dropFood: (pos?: { x?: number; y?: number; z?: number }) => void
  /** Full reset when leaving tank mode / unmounting stage. */
  resetFishTankUi: () => void
  /** Live dive/surface progress (0..1) — imperative only, never select this into React. */
  getProgress: () => number
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
  | "soundEnabled"
  | "depthFocus"
  | "sonarOpen"
  | "pendingFocus"
> = {
  state: "surface",
  chrome: "3d",
  query: "",
  domain: null,
  focus: null,
  bakeActive: false,
  curationDismissed: false,
  soundEnabled: false,
  depthFocus: null,
  sonarOpen: true,
  pendingFocus: null,
}

/** Creates the fish-tank transient UI slice. */
export const createFishTankSlice: StateCreator<FishTankSlice> = (set, get) => {
  const animator = createDiveAnimator(fishBus)

  /** Animate to a target progress, then apply the machine's `arrive` event. */
  function runTransition(target: 0 | 1, durationMs: number) {
    animator.animateTo(target, durationMs, () => {
      const arrived = next(get().state, "arrive")
      if (arrived) set({ state: arrived })

      // Drain a surface-pick's queued focus once the dive lands.
      const pending = get().pendingFocus
      if (!pending) return
      if (get().focus === pending) {
        const focused = next(get().state, "focus")
        set(focused ? { state: focused, pendingFocus: null } : { pendingFocus: null })
      } else {
        set({ pendingFocus: null })
      }
    })
  }

  return {
    ...DEFAULTS,

    dive: () => {
      const target = next(get().state, "dive")
      if (!target) return
      set({ state: target })
      fishBus.emit("audio:fx", { type: "dive" })
      runTransition(1, DIVE_DURATION_MS)
    },

    surface: () => {
      const target = next(get().state, "surface")
      if (!target) return
      set({ state: target, focus: null, pendingFocus: null })
      fishBus.emit("audio:fx", { type: "surface" })
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

      if (!slug) {
        // Release mid-dive drops the queued pick too.
        set({ pendingFocus: null })
        const released = next(cur, "release")
        if (released) set({ state: released })
        return
      }

      if (!canFocus(cur)) {
        // Surface pick: dive first, apply focus on arrival (runTransition
        // drains pendingFocus) — the camera already tracks `focus` while
        // diving.
        set({ pendingFocus: slug })
        get().dive()
        fishBus.emit("audio:fx", { type: "chime" })
        return
      }

      const target = next(cur, "focus")
      if (target) set({ state: target })
      fishBus.emit("audio:fx", { type: "chime" })
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

    toggleSound: (enabled) => {
      const nextVal = enabled !== undefined ? enabled : !get().soundEnabled
      set({ soundEnabled: nextVal })
      fishBus.emit("audio:toggle", { enabled: nextVal })
    },

    setDepthFocus: (depth01) => {
      if (depth01 == null) {
        set({ depthFocus: null })
        return
      }
      const clamped = Number.isFinite(depth01) ? Math.max(0, Math.min(1, depth01)) : 0
      set({ depthFocus: clamped })
      // Scrubbing implies you want to be in the water, not on the rim.
      const target = next(get().state, "dive")
      if (target) {
        set({ state: target })
        runTransition(1, DIVE_DURATION_MS)
      }
    },

    toggleSonar: (open) => {
      const nextVal = open !== undefined ? open : !get().sonarOpen
      set({ sonarOpen: nextVal })
    },

    dropFood: (pos) => {
      fishBus.emit("feed:drop", pos ?? {})
      fishBus.emit("audio:fx", { type: "bubble" })
    },

    resetFishTankUi: () => {
      animator.cancel()
      set({ ...DEFAULTS })
    },

    getProgress: () => animator.progress(),
  }
}

export { deriveScene } from "@/fish/tankMachine"
export type { TankState } from "@/fish/tankMachine"
