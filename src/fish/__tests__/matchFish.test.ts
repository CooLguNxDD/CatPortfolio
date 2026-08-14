import { describe, expect, it } from "vitest"
import {
  bestFishForQuestion,
  domainsInSchool,
  filterFish,
  fishLitFactor,
  matchesFish,
  normalizeQuery,
  questionTokens,
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

describe("questionTokens", () => {
  it("strips stopwords and short tokens", () => {
    expect(questionTokens("What about the AI work you did?")).toEqual(["ai"])
  })

  it("keeps tech tokens with punctuation", () => {
    expect(questionTokens("do you know c#, node.js and c++")).toContain("node.js")
  })
})
