import { describe, expect, it } from "vitest"

import { resolveCircadianPhase, resolveTankThemePalette } from "../fishTankTokens"
import { applyCircadian } from "../fishTankCircadian"

describe("resolveCircadianPhase", () => {
  it("follows the local clock in auto mode", () => {
    expect(resolveCircadianPhase(new Date(2026, 7, 10, 13, 0), "auto")).toBe("day")
    expect(resolveCircadianPhase(new Date(2026, 7, 10, 23, 0), "auto")).toBe("night")
    expect(resolveCircadianPhase(new Date(2026, 7, 10, 4, 0), "auto")).toBe("night")
  })

  it("respects an explicit override at any hour", () => {
    expect(resolveCircadianPhase(new Date(2026, 7, 10, 13, 0), "night")).toBe("night")
    expect(resolveCircadianPhase(new Date(2026, 7, 10, 2, 0), "day")).toBe("day")
  })

  it("defaults to auto", () => {
    const noon = new Date(2026, 7, 10, 12, 0)
    expect(resolveCircadianPhase(noon)).toBe("day")
  })
})

describe("palette absorption coefficients", () => {
  it("attenuates red fastest and blue slowest", () => {
    const [r, g, b] = resolveTankThemePalette().sigma
    expect(r).toBeGreaterThan(g)
    expect(g).toBeGreaterThan(b)
  })
})

describe("applyCircadian", () => {
  it("leaves the daylight palette alone apart from the stamp", () => {
    const base = resolveTankThemePalette()
    const day = applyCircadian(base, "day")
    expect(day.phase).toBe("day")
    expect(day.faunaTimeScale).toBe(1)
    expect(day.water).toBe(base.water)
    expect(day.keyIntensity).toBe(base.keyIntensity)
  })

  it("dims the key light and slows the fauna at night", () => {
    const base = resolveTankThemePalette()
    const night = applyCircadian(base, "night")
    expect(night.phase).toBe("night")
    expect(night.faunaTimeScale).toBeLessThan(1)
    expect(night.keyIntensity).toBeLessThan(base.keyIntensity)
    expect(night.ambientIntensity).toBeLessThan(base.ambientIntensity)
    expect(night.rayStrength).toBeLessThan(base.rayStrength)
  })

  it("thickens the water so less light reaches the bed", () => {
    const base = resolveTankThemePalette()
    const night = applyCircadian(base, "night")
    expect(night.fogDensity).toBeGreaterThan(base.fogDensity)
    for (let i = 0; i < 3; i++) {
      expect(night.sigma[i]).toBeGreaterThan(base.sigma[i])
    }
  })
})
