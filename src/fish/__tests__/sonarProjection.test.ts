import { describe, expect, it } from "vitest"

import { blipToPixels, groupBySchool, projectSonarBlips } from "../sonarProjection"
import { SWIM_Y_MAX, SWIM_Y_MIN, TANK_HALF_W } from "@/blocks/fishTankLayout"

const fish = (over: Partial<Parameters<typeof projectSonarBlips>[0][number]> = {}) => ({
  slug: "a",
  species: "ai",
  x: 0,
  y: SWIM_Y_MAX,
  z: 0,
  ...over,
})

describe("projectSonarBlips", () => {
  it("places a contact at the target on the disc centre", () => {
    const [blip] = projectSonarBlips([fish()], 0)
    expect(blip.u).toBeCloseTo(0)
    expect(blip.v).toBeCloseTo(0)
    expect(blip.radius).toBeCloseTo(0)
  })

  it("clamps distant contacts to the rim", () => {
    const [blip] = projectSonarBlips([fish({ x: TANK_HALF_W * 10 })], 0)
    expect(Math.hypot(blip.u, blip.v)).toBeCloseTo(1)
    expect(blip.radius).toBe(1)
  })

  it("rotates with the camera yaw", () => {
    const straight = projectSonarBlips([fish({ x: TANK_HALF_W / 2 })], 0)[0]
    const turned = projectSonarBlips([fish({ x: TANK_HALF_W / 2 })], Math.PI / 2)[0]
    expect(turned.u).not.toBeCloseTo(straight.u)
    // A quarter turn moves a contact from one axis onto the other.
    expect(Math.abs(turned.v)).toBeCloseTo(Math.abs(straight.u), 5)
  })

  it("maps the swim band onto depth01", () => {
    const surface = projectSonarBlips([fish({ y: SWIM_Y_MAX })], 0)[0]
    const bed = projectSonarBlips([fish({ y: SWIM_Y_MIN })], 0)[0]
    expect(surface.depth01).toBeCloseTo(0)
    expect(bed.depth01).toBeCloseTo(1)
  })

  it("defaults and clamps the lit factor", () => {
    expect(projectSonarBlips([fish()], 0)[0].lit).toBe(1)
    expect(projectSonarBlips([fish({ lit: 4 })], 0)[0].lit).toBe(1)
    expect(projectSonarBlips([fish({ lit: -1 })], 0)[0].lit).toBe(0)
  })

  it("survives a garbage yaw", () => {
    const [blip] = projectSonarBlips([fish({ x: 5 })], Number.NaN)
    expect(Number.isFinite(blip.u)).toBe(true)
    expect(Number.isFinite(blip.v)).toBe(true)
  })
})

describe("blipToPixels", () => {
  it("keeps blips inside the padded viewport", () => {
    const { cx, cy } = blipToPixels({ u: 1, v: -1 }, 100, 10)
    expect(cx).toBeLessThanOrEqual(100)
    expect(cy).toBeGreaterThanOrEqual(0)
    expect(blipToPixels({ u: 0, v: 0 }, 100, 10)).toEqual({ cx: 50, cy: 50 })
  })
})

describe("groupBySchool", () => {
  it("buckets contacts by cohort", () => {
    const blips = projectSonarBlips(
      [fish({ slug: "a", school: 1 }), fish({ slug: "b", school: 1 }), fish({ slug: "c", school: 2 })],
      0,
    )
    const groups = groupBySchool(blips)
    expect(groups.get(1)).toHaveLength(2)
    expect(groups.get(2)).toHaveLength(1)
  })
})
