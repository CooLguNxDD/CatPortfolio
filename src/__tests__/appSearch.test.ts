import { describe, it, expect } from "vitest"
import { clearDemoSearch, mergeDemoSearch } from "@/lib/demoSearch"

describe("mergeDemoSearch", () => {
  it("sets j and preserves v/f", () => {
    expect(mergeDemoSearch({ v: "text", f: "oct" }, "demo_1")).toEqual({
      v: "text",
      f: "oct",
      j: "demo_1",
    })
  })

  it("works with empty prev", () => {
    expect(mergeDemoSearch({}, "x")).toEqual({ j: "x" })
    expect(mergeDemoSearch(null, "x")).toEqual({ j: "x" })
  })
})

describe("clearDemoSearch", () => {
  it("drops j but keeps v", () => {
    expect(clearDemoSearch({ j: "old", v: "tank", f: "a" })).toEqual({
      v: "tank",
      f: "a",
    })
  })

  it("returns empty when only j present", () => {
    expect(clearDemoSearch({ j: "only" })).toEqual({})
  })
})
