import { describe, expect, it } from "vitest"

import {
  AIR_CUTOFF_HZ,
  WATER_CUTOFF_HZ,
  WATER_LOW_SHELF_DB,
  cutoffForImmersion,
  gainForDistance,
  impulseResponseCurve,
  lowShelfGainForImmersion,
  reverbMixForImmersion,
} from "../audioMath"

describe("cutoffForImmersion", () => {
  it("spans full bandwidth to the submerged muffle", () => {
    expect(cutoffForImmersion(0)).toBeCloseTo(AIR_CUTOFF_HZ)
    expect(cutoffForImmersion(1)).toBeCloseTo(WATER_CUTOFF_HZ)
  })

  it("decreases monotonically with depth", () => {
    let prev = Number.POSITIVE_INFINITY
    for (let i = 0; i <= 10; i++) {
      const hz = cutoffForImmersion(i / 10)
      expect(hz).toBeLessThan(prev)
      prev = hz
    }
  })

  it("clamps out-of-range and garbage input", () => {
    expect(cutoffForImmersion(-3)).toBeCloseTo(AIR_CUTOFF_HZ)
    expect(cutoffForImmersion(9)).toBeCloseTo(WATER_CUTOFF_HZ)
    expect(cutoffForImmersion(Number.NaN)).toBeCloseTo(AIR_CUTOFF_HZ)
  })
})

describe("lowShelfGainForImmersion / reverbMixForImmersion", () => {
  it("is dry and flat above the waterline", () => {
    expect(lowShelfGainForImmersion(0)).toBe(0)
    expect(reverbMixForImmersion(0)).toBe(0)
  })

  it("reaches the documented bass lift when submerged", () => {
    expect(lowShelfGainForImmersion(1)).toBe(WATER_LOW_SHELF_DB)
    expect(reverbMixForImmersion(1)).toBeGreaterThan(0)
    expect(reverbMixForImmersion(1)).toBeLessThan(1)
  })
})

describe("gainForDistance", () => {
  it("is unity inside the reference distance", () => {
    expect(gainForDistance(0)).toBe(1)
    expect(gainForDistance(8)).toBe(1)
  })

  it("falls off beyond it and never goes negative", () => {
    const near = gainForDistance(16)
    const far = gainForDistance(64)
    expect(near).toBeLessThan(1)
    expect(far).toBeLessThan(near)
    expect(far).toBeGreaterThan(0)
  })
})

describe("impulseResponseCurve", () => {
  it("returns one decaying channel per request", () => {
    const channels = impulseResponseCurve(8000, 0.5, 2.4, 2)
    expect(channels).toHaveLength(2)
    expect(channels[0]).toHaveLength(4000)

    const head = Math.abs(channels[0][10])
    const tail = Math.abs(channels[0][3990])
    expect(tail).toBeLessThan(head)
  })

  it("is deterministic across calls", () => {
    const a = impulseResponseCurve(8000, 0.2, 2, 1)
    const b = impulseResponseCurve(8000, 0.2, 2, 1)
    expect(Array.from(a[0])).toEqual(Array.from(b[0]))
  })

  it("stays inside the normalised sample range", () => {
    for (const v of impulseResponseCurve(8000, 0.2, 2, 1)[0]) {
      expect(Math.abs(v)).toBeLessThanOrEqual(1)
    }
  })
})
