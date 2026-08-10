import { describe, expect, it } from "vitest"
import {
  next,
  canFocus,
  canDiveOnScroll,
  deriveScene,
  isAtSurface,
  isSubmerged,
  SUBMERGED_THRESHOLD,
  SURFACE_THRESHOLD,
  type TankState,
} from "../tankMachine"

const ALL_STATES: TankState[] = ["surface", "diving", "tank", "focused", "rising"]

describe("tankMachine.next", () => {
  it("allows the legal transition set", () => {
    expect(next("surface", "dive")).toBe("diving")
    expect(next("diving", "arrive")).toBe("tank")
    expect(next("diving", "surface")).toBe("rising")
    expect(next("tank", "focus")).toBe("focused")
    expect(next("tank", "surface")).toBe("rising")
    expect(next("tank", "dive")).toBe("diving")
    expect(next("focused", "release")).toBe("tank")
    expect(next("focused", "surface")).toBe("rising")
    expect(next("focused", "focus")).toBe("focused")
    expect(next("rising", "arrive")).toBe("surface")
    expect(next("rising", "dive")).toBe("diving")
  })

  it("rejects illegal transitions with null", () => {
    expect(next("surface", "focus")).toBeNull()
    expect(next("surface", "release")).toBeNull()
    expect(next("surface", "arrive")).toBeNull()
    expect(next("tank", "release")).toBeNull()
    expect(next("focused", "dive")).toBeNull()
    expect(next("rising", "focus")).toBeNull()
  })

  it("every state has at least one outgoing edge", () => {
    for (const s of ALL_STATES) {
      const edges = (["dive", "surface", "arrive", "focus", "release"] as const).filter(
        (e) => next(s, e) !== null,
      )
      expect(edges.length).toBeGreaterThan(0)
    }
  })
})

describe("canFocus", () => {
  it("blocks only the surface bucket (surface + rising)", () => {
    expect(canFocus("surface")).toBe(false)
    expect(canFocus("rising")).toBe(false)
    expect(canFocus("diving")).toBe(true)
    expect(canFocus("tank")).toBe(true)
    expect(canFocus("focused")).toBe(true)
  })
})

describe("canDiveOnScroll", () => {
  it("allows the surface bucket (surface + rising) — legacy re-dive-mid-rise quirk", () => {
    expect(canDiveOnScroll("surface")).toBe(true)
    expect(canDiveOnScroll("rising")).toBe(true)
    expect(canDiveOnScroll("diving")).toBe(false)
    expect(canDiveOnScroll("tank")).toBe(false)
    expect(canDiveOnScroll("focused")).toBe(false)
  })
})

describe("deriveScene", () => {
  it("buckets surface/rising as 'surface' and the rest as 'tank'", () => {
    expect(deriveScene("surface")).toBe("surface")
    expect(deriveScene("rising")).toBe("surface")
    expect(deriveScene("diving")).toBe("tank")
    expect(deriveScene("tank")).toBe("tank")
    expect(deriveScene("focused")).toBe("tank")
  })
})

describe("continuous progress predicates", () => {
  it("isAtSurface / isSubmerged use the named thresholds", () => {
    expect(isAtSurface(0)).toBe(true)
    expect(isAtSurface(SURFACE_THRESHOLD)).toBe(true)
    expect(isAtSurface(SURFACE_THRESHOLD + 0.01)).toBe(false)
    expect(isSubmerged(1)).toBe(true)
    expect(isSubmerged(SUBMERGED_THRESHOLD)).toBe(true)
    expect(isSubmerged(SUBMERGED_THRESHOLD - 0.01)).toBe(false)
  })
})
