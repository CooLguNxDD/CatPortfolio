import { afterEach, describe, expect, it, vi } from "vitest"
import {
  liftHex,
  mixHex,
  isLightSurface,
  oklchLightness,
  resolveTankQuality,
} from "../fishTankTokens"

describe("fishTankTokens colour helpers", () => {
  it("parses oklch lightness", () => {
    expect(oklchLightness("oklch(0.18 0.018 45)")).toBeCloseTo(0.18)
    expect(isLightSurface("oklch(0.97 0.012 80)")).toBe(true)
    expect(isLightSurface("oklch(0.18 0.018 45)")).toBe(false)
  })

  it("lifts hex toward white", () => {
    const mid = liftHex(0x000000, 0.5)
    expect(mid).toBe(0x808080)
    expect(liftHex(0xff0000, 0)).toBe(0xff0000)
  })

  it("mixes hex colours", () => {
    expect(mixHex(0x000000, 0xffffff, 0.5)).toBe(0x808080)
    expect(mixHex(0xff0000, 0x0000ff, 0)).toBe(0xff0000)
  })
})

/** Stub matchMedia so a query in `matching` reports true. */
function stubMatchMedia(matching: string[]) {
  vi.stubGlobal(
    "matchMedia",
    (q: string) => ({ matches: matching.includes(q) }) as MediaQueryList,
  )
}

describe("resolveTankQuality", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("falls back to full quality when matchMedia is unavailable", () => {
    // jsdom has no matchMedia by default — must not throw.
    const q = resolveTankQuality()
    expect(q.tier).toBe("high")
    expect(q.octaves).toBe(4)
    expect(q.timeScale).toBe(1)
  })

  it("drops to the low tier on coarse pointers", () => {
    stubMatchMedia(["(pointer: coarse)"])
    const q = resolveTankQuality()
    expect(q.tier).toBe("low")
    expect(q.rayCount).toBeLessThan(9)
    expect(q.wobble).toBe(false)
  })

  it("freezes shader time and the wobble for reduced motion", () => {
    stubMatchMedia(["(prefers-reduced-motion: reduce)"])
    const q = resolveTankQuality()
    expect(q.timeScale).toBe(0)
    expect(q.wobble).toBe(false)
  })
})
