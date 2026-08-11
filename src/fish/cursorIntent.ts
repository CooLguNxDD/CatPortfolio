/**
 * Pointer intent classifier for trait-driven fish behaviour.
 *
 * Three states drive the boids cursor term (fish/fishBoids.ts):
 *   idle    — cursor present but unremarkable; fish ignore it
 *   curious — cursor has been still long enough that fish investigate
 *   flee    — cursor moved fast; fish scatter
 *
 * DOM-free and stateless apart from the explicit `prev` argument, so the
 * hysteresis is testable without faking pointer events.
 */

export type CursorIntent = "idle" | "curious" | "flee"

export interface CursorSample {
  /** Pointer speed in CSS px per second. */
  pxPerSec: number
  /** Milliseconds since the pointer last moved beyond the idle epsilon. */
  idleMs: number
}

export interface CursorIntentParams {
  /** Speed that triggers a scatter. */
  fleeSpeed?: number
  /** Speed below which an active flee relaxes (hysteresis band). */
  fleeReleaseSpeed?: number
  /** Stillness required before fish grow curious. */
  curiousIdleMs?: number
  /** Movement that breaks curiosity once established. */
  curiousBreakSpeed?: number
}

export const CURSOR_INTENT_DEFAULTS: Required<CursorIntentParams> = {
  fleeSpeed: 1200,
  // Well below fleeSpeed so a cursor hovering near the threshold does not
  // flip state every frame and jitter the whole shoal.
  fleeReleaseSpeed: 450,
  curiousIdleMs: 1500,
  curiousBreakSpeed: 120,
}

/**
 * Classify the current pointer sample. `prev` is the previously returned
 * intent; passing it enables the hysteresis bands (omit for a cold read).
 */
export function classifyCursorIntent(
  sample: CursorSample,
  prev: CursorIntent = "idle",
  params?: CursorIntentParams,
): CursorIntent {
  const cfg = { ...CURSOR_INTENT_DEFAULTS, ...params }
  const speed = Number.isFinite(sample.pxPerSec) ? Math.max(0, sample.pxPerSec) : 0
  const idle = Number.isFinite(sample.idleMs) ? Math.max(0, sample.idleMs) : 0

  if (speed >= cfg.fleeSpeed) return "flee"
  // A flee holds until the pointer genuinely settles.
  if (prev === "flee" && speed > cfg.fleeReleaseSpeed) return "flee"

  if (idle >= cfg.curiousIdleMs) return "curious"
  if (prev === "curious" && speed < cfg.curiousBreakSpeed) return "curious"

  return "idle"
}

/** True on the frame a scatter begins — the canvas uses it to fire one burst. */
export function isFleeOnset(prev: CursorIntent, next: CursorIntent): boolean {
  return next === "flee" && prev !== "flee"
}

/** Running pointer-speed tracker for the canvas pointermove handler. */
export interface CursorTracker {
  /** Feed a pointer position; returns the current intent. */
  sample(x: number, y: number, nowMs: number): CursorIntent
  /** Advance idle time without a move event (called from the frame loop). */
  tick(nowMs: number): CursorIntent
  readonly intent: CursorIntent
}

/** Pointer movement below this (px) counts as stillness, not motion. */
const IDLE_EPSILON_PX = 2

/** Create a tracker seeded at `nowMs`. Pure JS — no DOM listeners of its own. */
export function createCursorTracker(nowMs = 0, params?: CursorIntentParams): CursorTracker {
  let lastX = 0
  let lastY = 0
  let lastMoveAt = nowMs
  let lastSampleAt = nowMs
  let seeded = false
  let intent: CursorIntent = "idle"
  let speed = 0

  function update(now: number): CursorIntent {
    intent = classifyCursorIntent({ pxPerSec: speed, idleMs: now - lastMoveAt }, intent, params)
    return intent
  }

  return {
    sample(x, y, now) {
      const dt = Math.max(1, now - lastSampleAt) / 1000
      lastSampleAt = now
      if (!seeded) {
        seeded = true
        lastX = x
        lastY = y
        lastMoveAt = now
        speed = 0
        return update(now)
      }
      const dist = Math.hypot(x - lastX, y - lastY)
      lastX = x
      lastY = y
      speed = dist / dt
      if (dist > IDLE_EPSILON_PX) lastMoveAt = now
      return update(now)
    },
    tick(now) {
      // Decay speed between move events so a single flick does not pin `flee`.
      const dt = Math.max(0, now - lastSampleAt) / 1000
      if (dt > 0.05) speed = Math.max(0, speed * 0.5)
      return update(now)
    },
    get intent() {
      return intent
    },
  }
}
