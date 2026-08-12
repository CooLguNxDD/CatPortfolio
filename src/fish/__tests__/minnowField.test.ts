import { describe, expect, it } from "vitest"

import { buildMinnowAttributes } from "../minnowField"
import { SWIM_Y_MAX, SWIM_Y_MIN, TANK_HALF_D, TANK_HALF_W } from "@/blocks/fishTankLayout"

describe("buildMinnowAttributes", () => {
  it("is deterministic for the same count and seed", () => {
    const a = buildMinnowAttributes(64, "commit-minnows")
    const b = buildMinnowAttributes(64, "commit-minnows")
    expect(Array.from(a.phase)).toEqual(Array.from(b.phase))
    expect(Array.from(a.orbit)).toEqual(Array.from(b.orbit))
    expect(Array.from(a.paletteIndex)).toEqual(Array.from(b.paletteIndex))
  })

  it("varies with the seed", () => {
    const a = buildMinnowAttributes(32, "seed-a")
    const b = buildMinnowAttributes(32, "seed-b")
    expect(Array.from(a.orbit)).not.toEqual(Array.from(b.orbit))
  })

  it("allocates one entry per instance and four orbit floats", () => {
    const attrs = buildMinnowAttributes(17, "x")
    expect(attrs.count).toBe(17)
    expect(attrs.speed).toHaveLength(17)
    expect(attrs.orbit).toHaveLength(17 * 4)
  })

  it("keeps every minnow inside the usable swim band", () => {
    const attrs = buildMinnowAttributes(200, "bounds")
    for (const y of attrs.depth) {
      expect(y).toBeGreaterThanOrEqual(SWIM_Y_MIN)
      expect(y).toBeLessThanOrEqual(SWIM_Y_MAX)
    }
  })

  it("keeps orbit centres and radii within a tank-scaled envelope", () => {
    const attrs = buildMinnowAttributes(200, "envelope")
    for (let i = 0; i < attrs.count; i++) {
      expect(Math.abs(attrs.orbit[i * 4])).toBeLessThanOrEqual(TANK_HALF_W)
      expect(Math.abs(attrs.orbit[i * 4 + 1])).toBeLessThanOrEqual(TANK_HALF_D)
      expect(attrs.orbit[i * 4 + 2]).toBeGreaterThan(0)
      expect(attrs.orbit[i * 4 + 3]).toBeGreaterThan(0)
    }
  })

  it("keeps palette indices inside the supplied palette", () => {
    const attrs = buildMinnowAttributes(120, "palette", 3)
    for (const idx of attrs.paletteIndex) {
      expect(idx).toBeLessThan(3)
    }
  })

  it("tolerates a zero or garbage count", () => {
    expect(buildMinnowAttributes(0, "z").count).toBe(0)
    expect(buildMinnowAttributes(Number.NaN, "z").count).toBe(0)
  })
})
