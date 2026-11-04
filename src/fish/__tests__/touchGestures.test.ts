import { describe, expect, it } from "vitest"
import { isDoubleTap, pinchRadius, pointerDistance } from "../touchGestures"

describe("pinchRadius", () => {
  it("spreading fingers zooms in (smaller radius)", () => {
    expect(pinchRadius(40, 100, 200, 10, 80)).toBe(20)
  })

  it("pinching fingers together zooms out", () => {
    expect(pinchRadius(40, 200, 100, 10, 120)).toBe(80)
  })

  it("clamps to the orbit limits", () => {
    expect(pinchRadius(40, 100, 1000, 24, 80)).toBe(24)
    expect(pinchRadius(40, 1000, 100, 24, 80)).toBe(80)
  })

  it("keeps the start radius for a degenerate gesture", () => {
    expect(pinchRadius(40, 0, 100, 24, 80)).toBe(40)
    expect(pinchRadius(40, 100, Number.NaN, 24, 80)).toBe(40)
  })
})

describe("isDoubleTap", () => {
  const first = { x: 100, y: 100, t: 1000 }

  it("accepts a quick second tap in the same spot", () => {
    expect(isDoubleTap(first, { x: 110, y: 104, t: 1200 })).toBe(true)
  })

  it("rejects a slow second tap", () => {
    expect(isDoubleTap(first, { x: 100, y: 100, t: 1500 })).toBe(false)
  })

  it("rejects a second tap far away", () => {
    expect(isDoubleTap(first, { x: 200, y: 100, t: 1100 })).toBe(false)
  })

  it("needs a previous tap", () => {
    expect(isDoubleTap(null, first)).toBe(false)
  })

  it("measures distance", () => {
    expect(pointerDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
  })
})
