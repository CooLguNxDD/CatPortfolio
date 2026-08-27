import { describe, it, expect } from "vitest"
import { clearDemoSearch, mergeDemoSearch } from "@/lib/demoSearch"
import { demoSearchSchema } from "@/router"

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
    expect(clearDemoSearch({ j: "old", v: "tank", f: "a", scrollTo: "hero" })).toEqual({
      v: "tank",
      f: "a",
      scrollTo: "hero",
    })
  })

  it("returns empty when only j present", () => {
    expect(clearDemoSearch({ j: "only" })).toEqual({})
  })
})

describe("demoSearchSchema", () => {
  it("safely catches invalid or malformed query parameters as undefined", () => {
    expect(demoSearchSchema.parse({ v: "bogus" })).toEqual({ v: undefined })
    expect(demoSearchSchema.parse({ j: 123, v: "invalid", f: [] })).toEqual({
      j: undefined,
      v: undefined,
      f: undefined,
    })
  })

  it("accepts scrollTo as an optional string", () => {
    expect(demoSearchSchema.parse({ v: "text", scrollTo: "hero" })).toEqual({
      v: "text",
      scrollTo: "hero",
    })
  })
})


