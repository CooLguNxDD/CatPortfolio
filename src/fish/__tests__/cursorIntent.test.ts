import { describe, expect, it } from "vitest"

import {
  CURSOR_INTENT_DEFAULTS,
  classifyCursorIntent,
  createCursorTracker,
  isFleeOnset,
} from "../cursorIntent"

describe("classifyCursorIntent", () => {
  it("flees above the speed threshold", () => {
    expect(classifyCursorIntent({ pxPerSec: 1400, idleMs: 0 })).toBe("flee")
  })

  it("stays idle for ordinary movement", () => {
    expect(classifyCursorIntent({ pxPerSec: 300, idleMs: 50 })).toBe("idle")
  })

  it("grows curious once the cursor has been still long enough", () => {
    expect(classifyCursorIntent({ pxPerSec: 0, idleMs: 1600 })).toBe("curious")
    expect(classifyCursorIntent({ pxPerSec: 0, idleMs: 1400 })).toBe("idle")
  })

  it("holds a flee through the hysteresis band", () => {
    // 600 px/s is below fleeSpeed but above fleeReleaseSpeed.
    expect(classifyCursorIntent({ pxPerSec: 600, idleMs: 0 }, "flee")).toBe("flee")
    expect(classifyCursorIntent({ pxPerSec: 200, idleMs: 0 }, "flee")).toBe("idle")
  })

  it("holds curiosity until the cursor really moves", () => {
    expect(classifyCursorIntent({ pxPerSec: 60, idleMs: 10 }, "curious")).toBe("curious")
    expect(classifyCursorIntent({ pxPerSec: 400, idleMs: 10 }, "curious")).toBe("idle")
  })

  it("treats non-finite samples as still", () => {
    expect(classifyCursorIntent({ pxPerSec: Number.NaN, idleMs: Number.NaN })).toBe("idle")
  })

  it("honours overridden thresholds", () => {
    expect(
      classifyCursorIntent({ pxPerSec: 500, idleMs: 0 }, "idle", { fleeSpeed: 400 }),
    ).toBe("flee")
    expect(CURSOR_INTENT_DEFAULTS.fleeSpeed).toBe(1200)
  })
})

describe("isFleeOnset", () => {
  it("fires only on the transition into flee", () => {
    expect(isFleeOnset("idle", "flee")).toBe(true)
    expect(isFleeOnset("flee", "flee")).toBe(false)
    expect(isFleeOnset("flee", "idle")).toBe(false)
  })
})

describe("createCursorTracker", () => {
  it("reports flee after a fast flick and relaxes when the pointer settles", () => {
    const tracker = createCursorTracker(0)
    tracker.sample(0, 0, 0)
    // 300px in 100ms = 3000 px/s
    expect(tracker.sample(300, 0, 100)).toBe("flee")

    // No further movement: speed decays, then stillness turns into curiosity.
    tracker.tick(400)
    tracker.tick(900)
    expect(tracker.tick(2000)).toBe("curious")
  })

  it("does not flee on the very first sample", () => {
    const tracker = createCursorTracker(0)
    expect(tracker.sample(900, 900, 16)).toBe("idle")
  })
})
