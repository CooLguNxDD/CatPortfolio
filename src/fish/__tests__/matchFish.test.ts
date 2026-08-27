import { describe, expect, it } from "vitest"
import {
  bestFishForQuestion,
  compareRecruiterOrder,
  domainsInSchool,
  filterFish,
  fishLitFactor,
  highlightSet,
  matchesFish,
  matchFishByName,
  normalizeQuery,
  orderFishForRecruiter,
  questionTokens,
  yearRangeLabel,
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

describe("highlightSet", () => {
  it("normalizes and filters empty/whitespace highlight slugs", () => {
    const set = highlightSet([" Weltel-AI ", "WELTEL-DEVOPS", "   ", ""])
    expect(set.has("weltel-ai")).toBe(true)
    expect(set.has("weltel-devops")).toBe(true)
    expect(set.size).toBe(2)
  })

  it("handles null and undefined input", () => {
    expect(highlightSet(null).size).toBe(0)
    expect(highlightSet(undefined).size).toBe(0)
  })
})

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

describe("bestFishForQuestion", () => {
  const school = [
    { slug: "weltel-devops", title: "WelTel DevOps", species: "devops", size: 0.5, depth: 0.5, speed: 0.5, glow: 0.5, school: 0, tags: ["kubernetes", "terraform"], blurb: "CI/CD pipelines" },
    { slug: "weltel-ai", title: "WelTel AI", species: "ai", size: 0.5, depth: 0.5, speed: 0.5, glow: 0.5, school: 1, tags: ["langgraph"], blurb: "agent orchestration" },
  ] as any[]

  it("locks onto the fish a question names", () => {
    expect(bestFishForQuestion(school, "tell me about the devops work")?.slug).toBe(
      "weltel-devops",
    )
  })

  it("matches on tags, not just titles", () => {
    expect(bestFishForQuestion(school, "any kubernetes experience?")?.slug).toBe(
      "weltel-devops",
    )
  })

  it("returns null when nothing clears the floor", () => {
    expect(bestFishForQuestion(school, "do you like quantum photonics")).toBeNull()
  })

  it("returns null for a question made only of stopwords", () => {
    expect(bestFishForQuestion(school, "what about the work you did")).toBeNull()
  })

  it("weighs slug/tag hits above prose hits", () => {
    const prose = [
      { ...school[1], slug: "other", title: "Other", tags: [], blurb: "kubernetes mention" },
      school[0],
    ] as any[]
    expect(bestFishForQuestion(prose, "kubernetes")?.slug).toBe("weltel-devops")
  })

  it("handles an empty tank", () => {
    expect(bestFishForQuestion([], "devops")).toBeNull()
  })
})

describe("matchFishByName", () => {
  it("resolves exact title and unique substring", () => {
    expect(matchFishByName(sample, "WelTel MCP")?.slug).toBe("weltel-ai")
    expect(matchFishByName(sample, "EKS")?.slug).toBe("weltel-devops")
    expect(matchFishByName(sample, "WelTel")).toBeNull()
  })
})

describe("orderFishForRecruiter", () => {
  it("puts highlight slugs first, then newest year", () => {
    const dated = [
      { ...sample[0], startYear: 2022 },
      { ...sample[1], startYear: 2025 },
    ]
    expect(orderFishForRecruiter(dated, ["weltel-ai"]).map((f) => f.slug)).toEqual([
      "weltel-ai",
      "weltel-devops",
    ])
    expect(orderFishForRecruiter(dated, []).map((f) => f.slug)).toEqual([
      "weltel-devops",
      "weltel-ai",
    ])
  })

  it("returns 0 (never NaN) for two undated specimens", () => {
    const res = compareRecruiterOrder(
      { slug: "undated-a" },
      { slug: "undated-b" },
      [],
    )
    expect(res).toBe(0)
    expect(Number.isNaN(res)).toBe(false)
  })

  it("returns a stable complete permutation over mixed dated and undated list", () => {
    const mixed = [
      { ...sample[0], slug: "undated-1" },
      { ...sample[1], slug: "dated-2025", startYear: 2025 },
      { ...sample[0], slug: "undated-2" },
      { ...sample[1], slug: "dated-2022", startYear: 2022 },
    ]
    const result = orderFishForRecruiter(mixed, [])
    expect(result).toHaveLength(mixed.length)
    expect(result.map((f) => f.slug)).toEqual([
      "dated-2025",
      "dated-2022",
      "undated-1",
      "undated-2",
    ])
  })

  it("formats year ranges", () => {
    expect(yearRangeLabel({ startYear: 2024.7, endYear: 2026 })).toBe("2024–2026")
    expect(yearRangeLabel({ startYear: 2025 })).toBe("2025–now")
    expect(yearRangeLabel({})).toBeNull()
  })
})

describe("questionTokens", () => {
  it("strips stopwords and short tokens", () => {
    expect(questionTokens("What about the AI work you did?")).toEqual(["ai"])
  })

  it("keeps tech tokens with punctuation", () => {
    expect(questionTokens("do you know c#, node.js and c++")).toContain("node.js")
  })
})
