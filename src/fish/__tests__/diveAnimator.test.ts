import { describe, expect, it, vi, afterEach } from "vitest"
import { createFishBus } from "../fishBus"
import { createDiveAnimator } from "../diveAnimator"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("diveAnimator (no rAF in this vitest env — see CLAUDE.md)", () => {
  it("settles instantly and emits exactly the target progress once", () => {
    const bus = createFishBus()
    const progressEvents: number[] = []
    bus.on("tank:progress", (v) => progressEvents.push(v))
    const onArrive = vi.fn()

    const animator = createDiveAnimator(bus)
    animator.animateTo(1, 1100, onArrive)

    expect(progressEvents).toEqual([1])
    expect(onArrive).toHaveBeenCalledTimes(1)
    expect(animator.progress()).toBe(1)
  })

  it("a near-zero delta skips straight to target without an extra emit", () => {
    const bus = createFishBus()
    const progressEvents: number[] = []
    bus.on("tank:progress", (v) => progressEvents.push(v))
    const animator = createDiveAnimator(bus)

    animator.animateTo(1, 1100)
    animator.animateTo(1, 1100) // already at target
    expect(progressEvents).toEqual([1, 1])
  })
})

describe("diveAnimator (rAF stubbed — exercises the smoothstep ramp)", () => {
  it("ramps progress across frames via smoothstep and fires onArrive once at raw=1", () => {
    const queue: FrameRequestCallback[] = []
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      queue.push(cb)
      return queue.length
    })
    vi.stubGlobal("cancelAnimationFrame", vi.fn())

    const bus = createFishBus()
    const progressEvents: number[] = []
    bus.on("tank:progress", (v) => progressEvents.push(v))
    const onArrive = vi.fn()

    const animator = createDiveAnimator(bus)
    animator.animateTo(1, 1000, onArrive)
    expect(queue).toHaveLength(1)

    queue.shift()!(0) // t=0 → raw=0 → smoothstep(0)=0
    expect(progressEvents[0]).toBeCloseTo(0)
    expect(onArrive).not.toHaveBeenCalled()
    expect(queue).toHaveLength(1)

    queue.shift()!(500) // t=500 → raw=0.5 → smoothstep(0.5)=0.5
    expect(progressEvents[1]).toBeCloseTo(0.5)
    expect(onArrive).not.toHaveBeenCalled()

    queue.shift()!(1000) // t=1000 → raw=1 → settles, fires onArrive
    expect(progressEvents[2]).toBeCloseTo(1)
    expect(onArrive).toHaveBeenCalledTimes(1)
    expect(animator.progress()).toBeCloseTo(1)
  })

  it("cancel() calls cancelAnimationFrame with the in-flight handle", () => {
    const cancelSpy = vi.fn()
    vi.stubGlobal("requestAnimationFrame", () => 42)
    vi.stubGlobal("cancelAnimationFrame", cancelSpy)

    const bus = createFishBus()
    const animator = createDiveAnimator(bus)
    animator.animateTo(1, 1000)
    animator.cancel()

    expect(cancelSpy).toHaveBeenCalledWith(42)
  })
})
