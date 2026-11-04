/**
 * Pure touch-gesture math for the tank canvas: pinch-to-zoom and double-tap.
 * No DOM or three imports — FishTankCanvas feeds it pointer coordinates.
 */

export interface TapSample {
  x: number
  y: number
  /** ms timestamp (performance.now / event.timeStamp). */
  t: number
}

/** Max gap between taps, and max drift between them, for a double-tap. */
export const DOUBLE_TAP_MS = 320
export const DOUBLE_TAP_PX = 32

/** Distance between two touch points (px). */
export function pointerDistance(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/**
 * Orbit radius for a pinch: spreading fingers (dist > startDist) zooms in,
 * i.e. shrinks the radius, proportionally to the spread. Clamped to [min, max];
 * a degenerate gesture (non-positive or non-finite distance) keeps the start radius.
 */
export function pinchRadius(
  startRadius: number,
  startDist: number,
  dist: number,
  min: number,
  max: number,
): number {
  if (!(startDist > 0) || !(dist > 0) || !Number.isFinite(startDist) || !Number.isFinite(dist)) {
    return Math.min(max, Math.max(min, startRadius))
  }
  const next = startRadius * (startDist / dist)
  return Math.min(max, Math.max(min, next))
}

/** True when `next` lands close enough, soon enough, after `prev`. */
export function isDoubleTap(
  prev: TapSample | null,
  next: TapSample,
  maxMs = DOUBLE_TAP_MS,
  maxPx = DOUBLE_TAP_PX,
): boolean {
  if (!prev) return false
  const dt = next.t - prev.t
  if (dt <= 0 || dt > maxMs) return false
  return pointerDistance(prev, next) <= maxPx
}
