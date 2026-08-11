/**
 * Owns the dive/surface rAF loop, moved out of the zustand store so the
 * ~60×/s progress value never touches React state (see fishBus.ts).
 * Emits `tank:progress` every frame and calls `onArrive` once the animation
 * settles — the caller (fishTankSlice) applies the machine's `arrive` event.
 */

import type { FishBus } from "./fishBus"

export interface DiveAnimator {
  /** Animate progress toward `target` over `durationMs`; calls `onArrive` at the end. */
  animateTo: (target: 0 | 1, durationMs: number, onArrive?: () => void) => void
  /** Cancel any in-flight animation without emitting a final value. */
  cancel: () => void
  /** Current progress (0..1), for a late-mounting subscriber's seed value. */
  progress: () => number
}

/** Smooth-step easing: 0→1 input, eased 0→1 output. */
function smoothstep(t: number): number {
  const x = Math.max(0, Math.min(1, t))
  return x * x * (3 - 2 * x)
}

/** Creates a dive animator bound to one bus instance. */
export function createDiveAnimator(bus: FishBus): DiveAnimator {
  let current = 0
  let rafHandle = 0

  function emit(value: number) {
    current = value
    bus.emit("tank:progress", value)
  }

  function cancel() {
    if (typeof cancelAnimationFrame !== "undefined") {
      cancelAnimationFrame(rafHandle)
    }
  }

  function animateTo(target: 0 | 1, durationMs: number, onArrive?: () => void) {
    cancel()
    if (typeof requestAnimationFrame === "undefined") {
      emit(target)
      onArrive?.()
      return
    }
    const startVal = current
    const delta = target - startVal
    if (Math.abs(delta) < 0.002) {
      emit(target)
      onArrive?.()
      return
    }
    let startTime: number | null = null

    function tick(now: number) {
      if (startTime === null) startTime = now
      const raw = Math.min((now - startTime) / durationMs, 1)
      emit(startVal + delta * smoothstep(raw))
      if (raw < 1) {
        rafHandle = requestAnimationFrame(tick)
      } else {
        onArrive?.()
      }
    }

    rafHandle = requestAnimationFrame(tick)
  }

  return {
    animateTo,
    cancel,
    progress: () => current,
  }
}
