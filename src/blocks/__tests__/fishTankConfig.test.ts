import { describe, expect, it } from "vitest"

import { resolveFishTankTuning, type FishTankTuning } from "../fishTankConfig"

const TUNING_KEYS = [
  "accentFillIntensity",
  "bedBounceIntensity",
  "glassOpacity",
  "waterOpacity",
  "minnowEmissive",
  "bubbleOpacity",
  "moteOpacity",
  "wakeOpacity",
  "fishBodyEmissiveFloor",
  "fishBodyEmissiveMul",
  "fishFinEmissiveFloor",
  "fishFinEmissiveMul",
  "fishGlowMul",
] as const satisfies readonly (keyof FishTankTuning)[]

describe("resolveFishTankTuning", () => {
  it("resolves finite values for every field, day and night", () => {
    for (const light of [true, false]) {
      const tuning = resolveFishTankTuning(light)
      for (const key of TUNING_KEYS) {
        expect(Number.isFinite(tuning[key])).toBe(true)
      }
    }
  })

  it("pins today's day (light theme) branch values", () => {
    const day = resolveFishTankTuning(true)
    expect(day).toEqual({
      accentFillIntensity: 0.65,
      bedBounceIntensity: 0.45,
      glassOpacity: 0.22,
      waterOpacity: 0.32,
      minnowEmissive: 0.2,
      bubbleOpacity: 0.38,
      moteOpacity: 0.25,
      wakeOpacity: 0.5,
      fishBodyEmissiveFloor: 0.12,
      fishBodyEmissiveMul: 0.6,
      fishFinEmissiveFloor: 0.16,
      fishFinEmissiveMul: 0.6,
      fishGlowMul: 0.75,
    } satisfies FishTankTuning)
  })

  it("pins today's night (dark theme) branch values", () => {
    const night = resolveFishTankTuning(false)
    expect(night).toEqual({
      accentFillIntensity: 1.8,
      bedBounceIntensity: 0.85,
      glassOpacity: 0.32,
      waterOpacity: 0.42,
      minnowEmissive: 0.45,
      bubbleOpacity: 0.65,
      moteOpacity: 0.45,
      wakeOpacity: 0.88,
      fishBodyEmissiveFloor: 0.25,
      fishBodyEmissiveMul: 1.1,
      fishFinEmissiveFloor: 0.35,
      fishFinEmissiveMul: 1.25,
      fishGlowMul: 1.25,
    } satisfies FishTankTuning)
  })

  it("keeps night's fish glow floors/multipliers at or above day's — the bioluminescent read", () => {
    const day = resolveFishTankTuning(true)
    const night = resolveFishTankTuning(false)
    expect(night.fishBodyEmissiveFloor).toBeGreaterThanOrEqual(day.fishBodyEmissiveFloor)
    expect(night.fishBodyEmissiveMul).toBeGreaterThanOrEqual(day.fishBodyEmissiveMul)
    expect(night.fishFinEmissiveFloor).toBeGreaterThanOrEqual(day.fishFinEmissiveFloor)
    expect(night.fishFinEmissiveMul).toBeGreaterThanOrEqual(day.fishFinEmissiveMul)
    expect(night.fishGlowMul).toBeGreaterThanOrEqual(day.fishGlowMul)
  })
})
