import { describe, expect, it } from "vitest"
import {
  liftHex,
  mixHex,
  isLightSurface,
  oklchLightness,
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
