/**
 * Pure scene state machine for the fish tank (no React, no three).
 *
 * Replaces scattered guards (`stageRef.current < 0.95`, `scene === "surface"`,
 * a `prevProg` crossing check) with one transition table + named predicates.
 *
 * Two kinds of gate, both sourced from here:
 *  - Coarse, discrete gates (`canFocus`, `canDiveOnScroll`, `deriveScene`) act
 *    on the zustand-held `TankState`, which flips synchronously on intent
 *    (`dive()`/`surface()`), before the animation finishes — this matches the
 *    legacy binary `scene` flag's timing exactly.
 *  - Precise, continuous gates (`isSubmerged`, `isAtSurface`) act on the raw
 *    0..1 dive-lerp progress the canvas reads off the bus every frame — this
 *    matches the legacy `stageRef.current < 0.95` canvas-local checks, which
 *    unlock slightly before the transition animation visually completes.
 */

export type TankState = "surface" | "diving" | "tank" | "focused" | "rising"

export type TankEvent = "dive" | "surface" | "arrive" | "focus" | "release"

/** Progress ≥ this counts as "submerged" (canvas interaction unlocks here). */
export const SUBMERGED_THRESHOLD = 0.95
/** Progress ≤ this counts as "at the rim" (camera reset point). */
export const SURFACE_THRESHOLD = 0.05

const MACHINE: Record<TankState, Partial<Record<TankEvent, TankState>>> = {
  surface: { dive: "diving" },
  diving: { arrive: "tank", surface: "rising" },
  tank: { focus: "focused", surface: "rising", dive: "diving" },
  focused: { release: "tank", surface: "rising", focus: "focused" },
  rising: { arrive: "surface", dive: "diving" },
}

/** Next state for a legal transition, or null if the event is illegal here. */
export function next(state: TankState, event: TankEvent): TankState | null {
  return MACHINE[state][event] ?? null
}

/**
 * Focus is only legal once intent has left the surface — mirrors the legacy
 * `scene === "surface"` guard, which blocked focus during "surface" and
 * "rising" (scene flips to "surface" the instant `surface()` is called).
 */
export function canFocus(state: TankState): boolean {
  return state !== "surface" && state !== "rising"
}

/**
 * Scroll/swipe-to-dive is legal from the surface AND while rising — the
 * legacy scene flag flipped to "surface" immediately on `surface()`, so a
 * user could already re-trigger a dive mid-rise.
 */
export function canDiveOnScroll(state: TankState): boolean {
  return state === "surface" || state === "rising"
}

/** Legacy two-bucket scene label, for CSS/debug attributes and Escape-key gating. */
export function deriveScene(state: TankState): "surface" | "tank" {
  return state === "surface" || state === "rising" ? "surface" : "tank"
}

/** True once past the crossing point used to reset the surface camera rig. */
export function isAtSurface(progress: number): boolean {
  return progress <= SURFACE_THRESHOLD
}

/** True once past the crossing point used to unlock canvas interaction. */
export function isSubmerged(progress: number): boolean {
  return progress >= SUBMERGED_THRESHOLD
}
