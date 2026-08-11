/**
 * Per-fish behaviour state machine (pure, DOM-free, three-free).
 *
 * The tank's swim model is a closed parametric orbit (`computeFishPose`), and
 * boids steering is applied as a small offset on top of it — capped at
 * `maxForce * 3.5` ≈ 2.3 world units in a tank 76 wide. That is enough to make
 * a shoal breathe, but a fish can never *leave* its orbit, so feeding only
 * connected when a pellet happened to fall through a fish's path.
 *
 * This machine adds the missing intent layer: it decides *what a fish wants* —
 * its orbit, or a pellet. Turning that want into motion is `fishLocomotion.ts`,
 * which accelerates an owned position/velocity toward the target under a speed
 * and turn-rate limit. Splitting the two is deliberate: intent may switch in a
 * single frame, momentum never does, so a fish that finishes a meal has to swim
 * back to its path instead of snapping onto it.
 *
 * Sibling of `fish/tankMachine.ts` (scene-level states); this one is per
 * specimen and runs every frame.
 */

import type { Vec3 } from "@/blocks/fishTankLayout"

export type FishBehavior =
  /** Riding the parametric orbit — the resting state. */
  | "cruise"
  /** Committed to a pellet — the orbit is abandoned until this resolves. */
  | "hunt"
  /** Within biting range; dash + mouth reach. */
  | "feed"
  /** Just ate (or gave up) — ignores food while it drifts back to the orbit. */
  | "sated"
  /** Locked by the dossier: the camera owns this fish, behaviour is suspended. */
  | "focused"

export interface FishBehaviorState {
  state: FishBehavior
  /**
   * Commitment 0..1 — how fully the fish has given itself to the chase.
   * No longer blends position (the body integrates); it drives presentation:
   * boids weighting, glow, and how hard the shoal term is suppressed.
   */
  commit: number
  /** Seconds spent in the current state — drives the timeouts below. */
  elapsed: number
  /** Pellet being pursued, or null. */
  targetId: string | null
}

/** Nearest active pellet as seen by one fish this frame. */
export interface SensedFood {
  id: string
  position: Vec3
  /** Distance from the fish, world units. */
  distance: number
}

export interface FishBehaviorInput {
  /** Frame delta, seconds. Clamped internally so a tab-restore cannot warp fish. */
  dt: number
  focused: boolean
  /** Nearest active pellet, or null when nothing is in the water. */
  food: SensedFood | null
  /** The canvas' own mouth-overlap test fired this frame. */
  ate: boolean
}

/** Commit to a pellet inside this radius. Matches `fishBoids.foodSenseDist`. */
export const SENSE_DIST = 28
/**
 * Give up past this radius. Wider than `SENSE_DIST` so a fish tracking a
 * sinking pellet at the edge of its range does not flicker hunt/cruise.
 */
export const RELEASE_DIST = 34
/** Inside this radius the fish is committing to a bite. */
export const BITE_DIST = 3.2
/** Abandon a pellet that stays unreachable — e.g. one resting below the swim band. */
export const HUNT_TIMEOUT = 6
/** Cooldown after eating or giving up, so one pellet does not hold the shoal. */
export const SATED_SECONDS = 2.5
/** Commit ramps in over this long. */
const COMMIT_RISE = 0.45
/** …and decays over this long, so the return to orbit is gentler than the dash. */
const COMMIT_FALL = 0.9
/** A frame longer than this is a tab restore, not a slow frame. */
const MAX_DT = 0.1

export function createFishBehavior(): FishBehaviorState {
  return { state: "cruise", commit: 0, elapsed: 0, targetId: null }
}

/** Swim-clock multiplier: a hunting fish beats faster, a sated one coasts. */
export function behaviorTimeScale(state: FishBehavior): number {
  switch (state) {
    case "hunt":
      return 1.35
    case "feed":
      return 1.6
    case "sated":
      return 0.85
    default:
      return 1
  }
}

/**
 * Advance one fish. Returns a **new** state object — callers keep it in a map
 * keyed by slug, so the machine itself stays free of identity concerns.
 */
export function stepFishBehavior(
  prev: FishBehaviorState,
  input: FishBehaviorInput,
): FishBehaviorState {
  const dt = Math.max(0, Math.min(input.dt, MAX_DT))

  // A lock outranks everything: the dossier camera is flying the fish.
  if (input.focused) {
    return {
      state: "focused",
      commit: decay(prev.commit, dt),
      elapsed: prev.state === "focused" ? prev.elapsed + dt : 0,
      targetId: null,
    }
  }

  const food = input.food
  let state = prev.state === "focused" ? "cruise" : prev.state
  let targetId = prev.targetId
  let elapsed = prev.elapsed + dt

  switch (state) {
    case "cruise": {
      if (food && food.distance <= SENSE_DIST) {
        state = "hunt"
        targetId = food.id
        elapsed = 0
      }
      break
    }
    case "hunt": {
      if (input.ate) {
        state = "sated"
        targetId = null
        elapsed = 0
      } else if (!food || food.distance > RELEASE_DIST || elapsed > HUNT_TIMEOUT) {
        // Losing the pellet still costs a cooldown: without it a fish that
        // times out on an unreachable pellet re-commits on the very next frame.
        state = "sated"
        targetId = null
        elapsed = 0
      } else {
        // Re-target freely while hunting — the nearest pellet is the right one,
        // and the sensed food is already the nearest by construction.
        targetId = food.id
        if (food.distance <= BITE_DIST) {
          state = "feed"
          elapsed = 0
        }
      }
      break
    }
    case "feed": {
      if (input.ate || !food || food.distance > RELEASE_DIST) {
        state = "sated"
        targetId = null
        elapsed = 0
      } else {
        targetId = food.id
        if (food.distance > BITE_DIST * 1.6) {
          // Overshot the pellet — back to the approach rather than to cruise.
          state = "hunt"
          elapsed = 0
        }
      }
      break
    }
    case "sated": {
      if (elapsed >= SATED_SECONDS) {
        state = "cruise"
        elapsed = 0
      }
      break
    }
  }

  const pursuing = state === "hunt" || state === "feed"
  return {
    state,
    commit: pursuing ? rise(prev.commit, dt) : decay(prev.commit, dt),
    elapsed,
    targetId,
  }
}

function rise(commit: number, dt: number): number {
  return Math.min(1, commit + dt / COMMIT_RISE)
}

function decay(commit: number, dt: number): number {
  return Math.max(0, commit - dt / COMMIT_FALL)
}

/** True while the fish is committed to a pellet rather than to its orbit. */
export function isPursuing(state: FishBehavior): boolean {
  return state === "hunt" || state === "feed"
}

/**
 * The point the fish wants to be at this frame — the pellet it committed to,
 * or its orbit pose otherwise.
 *
 * This is a *target*, not a position: `fish/fishLocomotion.ts` accelerates the
 * body toward it under a speed and turn-rate limit. That indirection is what
 * removes the teleport — the target may switch from pellet to orbit in one
 * frame, but the body can only swim there.
 */
export function swimTarget(
  behavior: FishBehaviorState,
  orbit: Vec3,
  food: Vec3 | null,
): Vec3 {
  if (food && isPursuing(behavior.state)) return food
  return orbit
}

/**
 * Linearly interpolate from orbit pose to food location based on commit weight.
 */
export function blendTowardFood(
  orbit: Vec3,
  food: Vec3 | null,
  commit: number,
): Vec3 {
  if (!food) return { x: orbit.x, y: orbit.y, z: orbit.z }
  const c = Math.max(0, Math.min(1, commit))
  return {
    x: orbit.x + (food.x - orbit.x) * c,
    y: orbit.y + (food.y - orbit.y) * c,
    z: orbit.z + (food.z - orbit.z) * c,
  }
}

/**
 * Compute heading yaw angle in radians towards target point (+Z forward convention).
 */
export function headingTo(from: Vec3, to: Vec3): number {
  return Math.atan2(to.x - from.x, to.z - from.z)
}
