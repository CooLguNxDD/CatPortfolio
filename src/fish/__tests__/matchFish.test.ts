import { describe, expect, it } from "vitest"
import {
  domainsInSchool,
  filterFish,
  fishLitFactor,
  matchesFish,
  normalizeQuery,
} from "../matchFish"
import type { FishSpecimenInput } from "@/blocks/fishTankLayout"

const sample: FishSpecimenInput[] = [
  {
    slug: "weltel-ai",
    title: "WelTel MCP",
    species: "ai",
    size: 1,
    depth: 0.1,
    speed: 0.5,
    glow: 1,
    school: 0,
    tags: ["MCP", "LangGraph"],
    blurb: "Clinical AI gateway",
  },
  {
    slug: "weltel-devops",
    title: "WelTel EKS",
    species: "devops",
    size: 0.9,
    depth: 0.2,
    speed: 0.4,
    glow: 0.9,
    school: 0,
    tags: ["Terraform", "AWS"],
  },
]

describe("matchFish", () => {
  it("normalizes query", () => {
    expect(normalizeQuery("  MCP ")).toBe("mcp")
    expect(normalizeQuery(null)).toBe("")
  })

  it("filters by domain and free text", () => {
    expect(filterFish(sample, { query: "", domain: "ai" })).toHaveLength(1)
    expect(filterFish(sample, { query: "terraform", domain: null }).map((f) => f.slug)).toEqual([
      "weltel-devops",
    ])
    expect(matchesFish(sample[0], { query: "clinical", domain: null })).toBe(true)
  })

  it("computes lit factor for bake + focus", () => {
    const filter = {
      query: "",
      domain: null,
      highlightSlugs: ["weltel-ai"],
      bakeActive: true,
    }
    expect(fishLitFactor(sample[0], filter)).toBe(1.12)
    expect(fishLitFactor(sample[1], filter)).toBe(0.72)
    expect(fishLitFactor(sample[1], filter, "weltel-devops")).toBe(1)
  })

  it("lists domains present", () => {
    expect(domainsInSchool(sample)).toEqual(["ai", "devops"])
  })
})
