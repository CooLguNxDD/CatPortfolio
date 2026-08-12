import { describe, expect, it } from "vitest"

import {
  DEPTH_BANDS,
  bandForDepth,
  depthBands,
  depthForWorldY,
  worldYForBand,
  worldYForDepth,
  yearLabelForBand,
} from "../bathymetry"
import { SWIM_Y_MAX, SWIM_Y_MIN } from "@/blocks/fishTankLayout"

describe("DEPTH_BANDS", () => {
  it("tiles [0,1] with no gaps", () => {
    expect(DEPTH_BANDS[0].from).toBe(0)
    expect(DEPTH_BANDS[DEPTH_BANDS.length - 1].to).toBe(1)
    for (let i = 1; i < DEPTH_BANDS.length; i++) {
      expect(DEPTH_BANDS[i].from).toBe(DEPTH_BANDS[i - 1].to)
    }
  })
})

describe("bandForDepth", () => {
  it("resolves each zone", () => {
    expect(bandForDepth(0).zone).toBe("surface")
    expect(bandForDepth(0.5).zone).toBe("mesopelagic")
    expect(bandForDepth(0.9).zone).toBe("abyss")
  })

  it("puts boundary values in the deeper band", () => {
    expect(bandForDepth(DEPTH_BANDS[0].to).zone).toBe("mesopelagic")
  })

  it("clamps out-of-range and garbage input", () => {
    expect(bandForDepth(2).zone).toBe("abyss")
    expect(bandForDepth(-1).zone).toBe("surface")
    expect(bandForDepth(Number.NaN).zone).toBe("surface")
  })
})

describe("year labels", () => {
  it("counts back from the reference year", () => {
    expect(yearLabelForBand(DEPTH_BANDS[0], 2026)).toBe("2026")
    expect(yearLabelForBand(DEPTH_BANDS[1], 2026)).toBe("2025")
    expect(yearLabelForBand(DEPTH_BANDS[2], 2026)).toBe("2024 & earlier")
  })

  it("decorates every band", () => {
    const bands = depthBands(2026)
    expect(bands).toHaveLength(DEPTH_BANDS.length)
    expect(bands.map((b) => b.year)).toEqual(["2026", "2025", "2024 & earlier"])
  })
})

describe("depth ↔ world Y", () => {
  it("maps the ends of the swim band", () => {
    expect(worldYForDepth(0)).toBeCloseTo(SWIM_Y_MAX)
    expect(worldYForDepth(1)).toBeCloseTo(SWIM_Y_MIN)
  })

  it("round-trips", () => {
    for (const d of [0, 0.25, 0.5, 0.75, 1]) {
      expect(depthForWorldY(worldYForDepth(d))).toBeCloseTo(d)
    }
  })

  it("parks the camera inside the requested band", () => {
    for (const band of DEPTH_BANDS) {
      const y = worldYForBand(band)
      const back = depthForWorldY(y)
      expect(back).toBeGreaterThanOrEqual(band.from)
      expect(back).toBeLessThanOrEqual(band.to)
    }
  })
})
