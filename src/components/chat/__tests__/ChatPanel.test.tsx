import { describe, expect, it } from "vitest"
import { askDirective, buildAskContext, buildMessageActions } from "../ChatPanel"
import type { Layout } from "@/content/schema"
import type { BlockPatchResult } from "@/api/harness"

/**
 * `patchDirective` is gone: routing an ask turn used to be a prompt asking the
 * agent not to rebuild the page, and the agent rebuilt the page anyway. The
 * decision now lives in portfolio_ask_v1's deterministic stages, so what the
 * client owes the server is page *identity*, not instructions.
 */

const LAYOUT = {
  version: 1,
  meta: {
    audience: "default",
    generatedAt: "2026-01-01T00:00:00Z",
    dag: { levels: [{ level: 0, label: "Intro", nodes: ["h1"] }] },
  },
  blocks: [
    { type: "hero", id: "h1", props: { title: "Hi", subtitle: "there" } },
    { type: "card", id: "card-weltel-ai", props: { title: "AI" } },
    {
      type: "fishTank",
      id: "fish-tank-1",
      props: {
        renderer: "webgl",
        fish: [
          { slug: "weltel-ai", title: "AI", species: "ai", size: 0.5, depth: 0.3, speed: 0.5, glow: 0.5, school: 0, tags: [], metrics: [] },
          { slug: "weltel-devops", title: "DevOps", species: "devops", size: 0.5, depth: 0.7, speed: 0.5, glow: 0.5, school: 1, tags: [], metrics: [] },
        ],
        highlightSlugs: [],
        timeSpan: { min: 2020, max: 2025 },
      },
    },
    { type: "quickActions", id: "cta", props: { prompt: "Ask:", actions: [{ label: "a", prompt: "b" }] } },
  ],
} as unknown as Layout

describe("buildAskContext", () => {
  it("ships block identity, not block content", () => {
    const ctx = buildAskContext(LAYOUT, "tank")
    expect(ctx.blockIndex).toHaveLength(4)
    for (const entry of ctx.blockIndex) {
      expect(Object.keys(entry).sort()).not.toContain("props")
    }
    expect(JSON.stringify(ctx).length).toBeLessThan(JSON.stringify(LAYOUT).length)
  })

  it("derives slugs from the card-<slug> id convention", () => {
    const ctx = buildAskContext(LAYOUT, "text")
    const card = ctx.blockIndex.find((b) => b.id === "card-weltel-ai")
    expect(card?.slug).toBe("weltel-ai")
  })

  it("does not invent a slug for a non-matching id prefix", () => {
    const ctx = buildAskContext(LAYOUT, "text")
    expect(ctx.blockIndex.find((b) => b.id === "h1")?.slug).toBeUndefined()
  })

  it("reports the tank roster so the router knows what is already shown", () => {
    expect(buildAskContext(LAYOUT, "tank").tankSlugs).toEqual([
      "weltel-ai",
      "weltel-devops",
    ])
  })

  it("echoes timeSpan so a rebuilt tank keeps its depth scale", () => {
    expect(buildAskContext(LAYOUT, "tank").timeSpan).toEqual({ min: 2020, max: 2025 })
  })

  it("carries the dag so untouched blocks keep their bands", () => {
    expect(buildAskContext(LAYOUT, "text").dag?.levels).toHaveLength(1)
  })

  it("handles a missing layout without throwing", () => {
    const ctx = buildAskContext(null, "text")
    expect(ctx.blockIndex).toEqual([])
    expect(ctx.tankSlugs).toEqual([])
  })
})

describe("askDirective", () => {
  it("names the ask flow and forbids a whole-page rebuild", () => {
    const d = askDirective(buildAskContext(LAYOUT, "tank"))
    expect(d).toContain("portfolio_ask_v1")
    expect(d).toContain("route_portfolio_ask")
    expect(d).toContain("build_ask_overlay")
    expect(d).toContain("changed blocks only")
  })

  it("embeds the page skeleton for the router", () => {
    const d = askDirective(buildAskContext(LAYOUT, "tank"))
    expect(d).toContain("fish-tank-1")
    expect(d).toContain("weltel-devops")
    expect(d).toContain('"view":"tank"')
  })
})

describe("buildMessageActions", () => {
  it("never emits a view pill for the patched fishTank block", () => {
    const patch: BlockPatchResult = {
      blocks: LAYOUT.blocks as BlockPatchResult["blocks"],
      patchedIds: ["fish-tank-1", "card-weltel-ai"],
      dropped: 0,
    }
    const actions = buildMessageActions(null, [], patch)
    expect(actions.some((a) => a.kind === "view" && a.target === "fish-tank-1")).toBe(false)
    expect(actions.some((a) => a.kind === "view" && a.target === "card-weltel-ai")).toBe(true)
  })

  it("still lists focus pills for every relevant slug", () => {
    const actions = buildMessageActions("weltel-ai", ["weltel-devops"], null)
    expect(actions).toEqual([
      { kind: "focus", target: "weltel-ai", label: "weltel-ai" },
      { kind: "focus", target: "weltel-devops", label: "weltel-devops" },
    ])
  })

  it("deduplicates patched ids in view actions", () => {
    const patch: BlockPatchResult = {
      blocks: [],
      patchedIds: ["a", "a", "b"],
      dropped: 0,
    }
    const actions = buildMessageActions(null, [], patch)
    expect(actions).toEqual([
      { kind: "view", target: "a", label: "a" },
      { kind: "view", target: "b", label: "b" },
    ])
  })
})
