/**
 * Fish tank transient UI slice (react-app-guide: non-persisted client state).
 *
 * Ownership:
 *   - URL `?v=` / `?f=` → shareable route state (TanStack Router)
 *   - scene / filter / bake dimming → this slice (resets on reload)
 *   - fish[] payloads → derived from layout (Query / bake / compile)
 */

import type { StateCreator } from "zustand"

/** Surface (cat on rim) vs submerged tank. */
export type FishTankScene = "surface" | "tank"

/** 3D WebGL layer vs flat DOM index (within tank home mode). */
export type FishTankChrome = "3d" | "flat"

export interface FishTankSlice {
  scene: FishTankScene
  /** 0 = surface, 1 = fully submerged (drives camera lerp). */
  stageProgress: number
  chrome: FishTankChrome
  /** Search box text (not URL — ephemeral). */
  query: string
  /** Domain chip filter, or null = all. */
  domain: string | null
  /**
   * Local focus override when parent does not own URL `?f=`.
   * Stage prefers route `focusedSlug` when provided.
   */
  localFocus: string | null
  /** Simulated bake: dim non-highlights + show curation chip. */
  bakeActive: boolean
  /** Cleared curation hides the bake label without touching layout. */
  curationDismissed: boolean

  setScene: (scene: FishTankScene) => void
  dive: () => void
  surface: () => void
  setChrome: (chrome: FishTankChrome) => void
  setQuery: (query: string) => void
  setDomain: (domain: string | null) => void
  toggleDomain: (domain: string) => void
  setLocalFocus: (slug: string | null) => void
  applyBake: (active?: boolean) => void
  clearBake: () => void
  dismissCuration: () => void
  /** Full reset when leaving tank mode / unmounting stage. */
  resetFishTankUi: () => void
}

const DEFAULTS: Pick<
  FishTankSlice,
  | "scene"
  | "stageProgress"
  | "chrome"
  | "query"
  | "domain"
  | "localFocus"
  | "bakeActive"
  | "curationDismissed"
> = {
  scene: "surface",
  stageProgress: 0,
  chrome: "3d",
  query: "",
  domain: null,
  localFocus: null,
  bakeActive: false,
  curationDismissed: false,
}

/** Smooth-step easing: 0→1 input, eased 0→1 output. */
function smoothstep(t: number): number {
  const x = Math.max(0, Math.min(1, t))
  return x * x * (3 - 2 * x)
}

/** Creates the fish-tank transient UI slice. */
export const createFishTankSlice: StateCreator<FishTankSlice> = (set, get) => {
  /** Shared rAF handle — cancel before starting a new transition. */
  let rafHandle = 0

  /**
   * Animate stageProgress from its current value toward `target` over `durationMs`.
   * Uses smoothstep so the motion has a cinematic ease-in/ease-out feel.
   */
  function animateTo(target: 0 | 1, durationMs: number) {
    cancelAnimationFrame(rafHandle)
    const startVal = get().stageProgress
    const delta = target - startVal
    if (Math.abs(delta) < 0.002) {
      set({ stageProgress: target })
      return
    }
    let startTime: number | null = null

    function tick(now: number) {
      if (!startTime) startTime = now
      const raw = Math.min((now - startTime) / durationMs, 1)
      const eased = smoothstep(raw)
      const progress = startVal + delta * eased
      set({ stageProgress: progress })
      if (raw < 1) rafHandle = requestAnimationFrame(tick)
    }

    rafHandle = requestAnimationFrame(tick)
  }

  return {
    ...DEFAULTS,

    setScene: (scene) => {
      set({ scene, localFocus: scene === "surface" ? null : get().localFocus })
      animateTo(scene === "tank" ? 1 : 0, scene === "tank" ? 1100 : 750)
    },

    dive: () => {
      // Set scene label immediately so chrome / FishTankStage key logic fires.
      set({ scene: "tank" })
      animateTo(1, 1100)
    },

    surface: () => {
      // Scene label + focus reset immediately — chrome hides ↑ Surface right away.
      set({ scene: "surface", localFocus: null })
      animateTo(0, 750)
    },

    setChrome: (chrome) => set({ chrome }),

    setQuery: (query) => set({ query }),

    setDomain: (domain) => set({ domain }),

    toggleDomain: (domain) => {
      const cur = get().domain
      set({ domain: cur === domain ? null : domain })
    },

    setLocalFocus: (slug) => set({ localFocus: slug }),

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
      cancelAnimationFrame(rafHandle)
      set({ ...DEFAULTS })
    },
  }
}
