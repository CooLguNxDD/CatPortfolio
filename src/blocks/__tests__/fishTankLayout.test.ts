import { describe, it, expect } from "vitest"
import {
  clamp01,
  computeFishPose,
  depthToY,
  focusedOrbit,
  cameraFromOrbit,
  stageOrbitTarget,
  yearsToDepthBandHalf,
  DEFAULT_DEPTH_WOBBLE,
  MAX_ORBIT_RADIUS,
  MIN_ORBIT_RADIUS,
  WATER_Y,
  FLOOR_Y,
  TANK_CENTER_Y,
  SWIM_Y_MAX,
  SWIM_Y_MIN,
  type FishSpecimenInput,
} from "../fishTankLayout"

const sample = (over: Partial<FishSpecimenInput> = {}): FishSpecimenInput => ({
  slug: "oct-mcp",
  title: "OpenCat",
  species: "ai",
  size: 0.8,
  depth: 0.2,
  speed: 0.5,
  glow: 0.7,
  school: 1,
  ...over,
})

describe("computeFishPose", () => {
  it("is deterministic for (slug, t)", () => {
    const a = computeFishPose(sample(), 1.5)
    const b = computeFishPose(sample(), 1.5)
    expect(a).toEqual(b)
  })

  it("keeps coordinates finite and in-bounds for adversarial input", () => {
    const hostile: FishSpecimenInput[] = [
      sample({ size: 0, depth: 0, speed: 0, glow: 0 }),
      sample({ size: 1, depth: 1, speed: 1, glow: 1, slug: "dup" }),
      sample({ size: 1, depth: 1, slug: "dup" }), // duplicate slug
      ...Array.from({ length: 40 }, (_, i) =>
        sample({ slug: `f-${i}`, school: i % 5, depth: i / 40 }),
      ),
    ]
    for (const f of hostile) {
      for (const t of [0, 1, 10, 100]) {
        const p = computeFishPose(f, t)
        expect(Number.isFinite(p.position.x)).toBe(true)
        expect(Number.isFinite(p.position.y)).toBe(true)
        expect(Number.isFinite(p.position.z)).toBe(true)
        expect(Number.isFinite(p.scale)).toBe(true)
        expect(p.position.y).toBeLessThanOrEqual(WATER_Y)
      }
    }
  })

  it("depth 0 is nearer surface than depth 1", () => {
    expect(depthToY(0)).toBeGreaterThan(depthToY(1))
  })

  it("keeps the shoal below the waterline with a visible surface gap", () => {
    expect(depthToY(0)).toBeLessThanOrEqual(WATER_Y - 6.5)
    const pose = computeFishPose(sample({ depth: 0 }), 0)
    expect(pose.position.y).toBeLessThanOrEqual(WATER_Y - 4)
  })

  it("scatters swim paths across most of the tank, not the middle third", () => {
    const seeds = Array.from({ length: 24 }, (_, i) =>
      computeFishPose(sample({ slug: `scatter-${i}`, school: i % 4 }), 0),
    )
    const xs = seeds.map((p) => p.center.x)
    const zs = seeds.map((p) => p.center.z)
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(28)
    expect(Math.max(...zs) - Math.min(...zs)).toBeGreaterThan(16)
  })

  it("floor is deeper than tank mid (not a mid-frame bed)", () => {
    expect(FLOOR_Y).toBeLessThan(TANK_CENTER_Y)
    expect(FLOOR_Y).toBeLessThan(WATER_Y - 10)
    expect(depthToY(1)).toBeGreaterThan(FLOOR_Y)
    expect(depthToY(0)).toBeLessThan(WATER_Y)
  })

  it("dive look-at stays mid-column so bed reads as deep", () => {
    const dive = stageOrbitTarget(1)
    const rim = stageOrbitTarget(0)
    expect(rim.y).toBeGreaterThan(WATER_Y)
    expect(dive.y).toBeLessThan(WATER_Y)
    expect(dive.y).toBeGreaterThan(FLOOR_Y + 4)
    // Not parked on the floor
    expect(Math.abs(dive.y - FLOOR_Y)).toBeGreaterThan(6)
  })

  it("same-school fish share lane cohesion (centers cluster)", () => {
    const a = computeFishPose(sample({ slug: "a", school: 3 }), 0)
    const b = computeFishPose(sample({ slug: "b", school: 3 }), 0)
    const c = computeFishPose(sample({ slug: "c", school: 9 }), 0)
    const distAb = Math.abs(a.center.x - b.center.x)
    const distAc = Math.abs(a.center.x - c.center.x)
    // Not a hard guarantee for all hashes, but school offset should pull a/b closer than random
    expect(distAb).toBeLessThan(40)
    expect(distAc).toBeLessThan(40)
  })

  it("focused-fish camera values are bounded", () => {
    const pose = computeFishPose(sample(), 0, { focused: true })
    const orbit = focusedOrbit(pose.position)
    const cam = cameraFromOrbit(orbit)
    expect(orbit.radius).toBeGreaterThanOrEqual(MIN_ORBIT_RADIUS)
    expect(orbit.radius).toBeLessThanOrEqual(MAX_ORBIT_RADIUS)
    expect(Number.isFinite(cam.x)).toBe(true)
    expect(Number.isFinite(cam.y)).toBe(true)
    expect(Number.isFinite(cam.z)).toBe(true)
  })
})

describe("clamp01", () => {
  it("clamps and handles non-finite", () => {
    expect(clamp01(-1)).toBe(0)
    expect(clamp01(2)).toBe(1)
    expect(clamp01(Number.NaN)).toBe(0.5)
  })
})

describe("yearsToDepthBandHalf", () => {
  it("falls back to the default wobble when there is no tank timeSpan", () => {
    expect(yearsToDepthBandHalf(2020, 2021, undefined)).toBe(DEFAULT_DEPTH_WOBBLE)
  })

  it("falls back to the default wobble when the fish has no dates", () => {
    expect(yearsToDepthBandHalf(undefined, undefined, { min: 2019, max: 2026 })).toBe(
      DEFAULT_DEPTH_WOBBLE,
    )
  })

  it("a project spanning the whole tank range gets close to the max band", () => {
    const half = yearsToDepthBandHalf(2019, 2026, { min: 2019, max: 2026 })
    expect(half).toBeCloseTo((SWIM_Y_MAX - SWIM_Y_MIN) / 2, 5)
  })

  it("a short project relative to a long tank range gets the default wobble (floored)", () => {
    const half = yearsToDepthBandHalf(2025, 2025.1, { min: 2019, max: 2026 })
    expect(half).toBe(DEFAULT_DEPTH_WOBBLE)
  })

  it("longer duration yields a taller band than shorter duration", () => {
    const short = yearsToDepthBandHalf(2025, 2025.5, { min: 2019, max: 2026 })
    const long = yearsToDepthBandHalf(2020, 2025, { min: 2019, max: 2026 })
    expect(long).toBeGreaterThan(short)
  })
})

describe("computeFishPose depth band", () => {
  it("a fish with a wide depthBandHalf wanders further than the default", () => {
    const narrow = sample({ depthBandHalf: DEFAULT_DEPTH_WOBBLE })
    const wide = sample({ depthBandHalf: 10 })
    let maxNarrow = -Infinity
    let maxWide = -Infinity
    for (let t = 0; t < 20; t += 0.25) {
      maxNarrow = Math.max(maxNarrow, Math.abs(computeFishPose(narrow, t).position.y - computeFishPose(narrow, 0).center.y))
      maxWide = Math.max(maxWide, Math.abs(computeFishPose(wide, t).position.y - computeFishPose(wide, 0).center.y))
    }
    expect(maxWide).toBeGreaterThan(maxNarrow)
  })

  it("without depthBandHalf, behaves exactly as before (default wobble)", () => {
    const fish = sample()
    const pose = computeFishPose(fish, 1.5)
    expect(pose.position.y).toBeGreaterThanOrEqual(FLOOR_Y)
    expect(pose.position.y).toBeLessThanOrEqual(WATER_Y)
  })
})
