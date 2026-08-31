import { afterEach, describe, expect, it, vi } from "vitest"

import { resolveCircadianPhase, resolveTankThemePalette } from "../fishTankTokens"
import { applyCircadian } from "../fishTankCircadian"

/**
 * Force resolveTankThemePalette's light/dark read for one test. Tests run in
 * the node environment (no jsdom), so `readCssToken` normally hits its
 * `typeof document === "undefined"` fallback — stub both `document` and
 * `getComputedStyle` to exercise the real light/dark branch instead.
 */
function stubSurface(bgOklch: string) {
  vi.stubGlobal("document", { documentElement: {} })
  vi.stubGlobal(
    "getComputedStyle",
    () => ({ getPropertyValue: (name: string) => (name === "--bg" ? bgOklch : "") }) as CSSStyleDeclaration,
  )
}
const LIGHT_BG = "oklch(0.958 0.006 265)"
const DARK_BG = "oklch(0.243 0.030 284)"

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

  it("does not darken a light-theme palette at night", () => {
    stubSurface(LIGHT_BG)
    const base = resolveTankThemePalette()
    expect(base.light).toBe(true)
    const night = applyCircadian(base, "night")
    expect(night.phase).toBe("day")
    expect(night.water).toBe(base.water)
    expect(night.keyIntensity).toBe(base.keyIntensity)
    vi.unstubAllGlobals()
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

  it("leaves the sky untouched — it's keyed by theme, not the clock", () => {
    // No auto sun cycle for the sky: a baked layout's sky stays whatever the
    // theme says regardless of the ☀️/🌙/🕓 chip.
    const base = resolveTankThemePalette()
    const day = applyCircadian(base, "day")
    const night = applyCircadian(base, "night")
    for (const key of ["skyTop", "skyHorizon", "sunColor", "sunSize", "starDensity", "cloudStrength"] as const) {
      expect(day[key]).toBe(base[key])
      expect(night[key]).toBe(base[key])
    }
  })
})

describe("sky by theme mode", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("gives a light theme a sunny sky with no stars", () => {
    stubSurface(LIGHT_BG)
    const palette = resolveTankThemePalette()
    expect(palette.light).toBe(true)
    expect(palette.starDensity).toBe(0)
    expect(palette.cloudStrength).toBeGreaterThan(0)
  })

  it("gives a dark theme a star field with no clouds", () => {
    stubSurface(DARK_BG)
    const palette = resolveTankThemePalette()
    expect(palette.light).toBe(false)
    expect(palette.starDensity).toBeGreaterThan(0)
    expect(palette.cloudStrength).toBe(0)
  })

  it("shrinks the sun into a smaller, paler moon disc for dark themes", () => {
    stubSurface(LIGHT_BG)
    const day = resolveTankThemePalette()
    stubSurface(DARK_BG)
    const night = resolveTankThemePalette()
    // sunSize is a dot-product threshold — a smaller disc has a *higher* threshold.
    expect(night.sunSize).toBeGreaterThan(day.sunSize)
  })

  it("darkens the sky dome toward the abyss for dark themes", () => {
    stubSurface(LIGHT_BG)
    const day = resolveTankThemePalette()
    stubSurface(DARK_BG)
    const night = resolveTankThemePalette()
    // 0xRRGGBB — sum of channels is a cheap brightness proxy.
    const brightness = (hex: number) => ((hex >> 16) & 0xff) + ((hex >> 8) & 0xff) + (hex & 0xff)
    expect(brightness(night.skyTop)).toBeLessThan(brightness(day.skyTop))
  })

  it("resolves finite sky fields for the default palette", () => {
    const palette = resolveTankThemePalette()
    for (const key of ["skyTop", "skyHorizon", "sunColor", "sunSize", "starDensity", "cloudStrength"] as const) {
      expect(Number.isFinite(palette[key])).toBe(true)
    }
  })
})
