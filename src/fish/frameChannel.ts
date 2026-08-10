/**
 * Replay-on-subscribe wrapper for 60fps bus events (mitt has no replay).
 * A subscriber that mounts mid-dive gets the current value immediately
 * instead of waiting for the next emit — e.g. FishTankChrome mounting
 * while a dive is already underway.
 */

import type { FishBus, FishEvents } from "./fishBus"

export interface FrameChannel<T> {
  /** Current value (last emit, or the seed if nothing has emitted yet). */
  get: () => T
  /** Subscribe; fires once immediately with the current value, then on change. */
  subscribe: (cb: (value: T) => void) => () => void
}

/** Wrap one bus event as a replay channel, keyed by its emitted payload type. */
export function createFrameChannel<K extends keyof FishEvents>(
  bus: FishBus,
  type: K,
  seed: FishEvents[K],
): FrameChannel<FishEvents[K]> {
  let current = seed
  const handler = (v: FishEvents[K]) => {
    current = v
  }
  bus.on(type, handler)

  return {
    get: () => current,
    subscribe: (cb) => {
      cb(current)
      bus.on(type, cb)
      return () => bus.off(type, cb)
    },
  }
}
