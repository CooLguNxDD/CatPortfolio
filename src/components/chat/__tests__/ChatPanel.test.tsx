import { describe, expect, it, vi } from "vitest"
import {
  askDirective,
  buildAskContext,
  buildMessageActions,
  buildSpawnArgs,
  spawnPooledFish,
} from "../ChatPanel"
import type { Layout } from "@/content/schema"
import type { BlockPatchResult, FishPoolItem } from "@/api/harness"

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

  it("emits spawn actions for pool items in order with Add <name> labels", () => {
    const pool: FishPoolItem[] = [
      { slug: "alpha-fish", name: "Alpha Fish" },
      { slug: "beta-fish", name: "Beta Fish" },
    ]
    const actions = buildMessageActions(null, [], null, pool)
    expect(actions).toEqual([
      { kind: "spawn", target: "alpha-fish", label: "Add Alpha Fish" },
      { kind: "spawn", target: "beta-fish", label: "Add Beta Fish" },
    ])
  })

  it("respects the 4-action cap when focus + view + spawn exceeds 4", () => {
    const patch: BlockPatchResult = {
      blocks: [],
      patchedIds: ["card-1", "card-2"],
      dropped: 0,
    }
    const pool: FishPoolItem[] = [
      { slug: "pool-1", name: "Pool 1" },
      { slug: "pool-2", name: "Pool 2" },
    ]
    const actions = buildMessageActions("focus-1", ["focus-2"], patch, pool)
    expect(actions).toHaveLength(4)
    expect(actions.map((a) => a.kind)).toEqual(["focus", "focus", "view", "view"])
    expect(actions.some((a) => a.kind === "spawn")).toBe(false)
  })

  it("skips pool items whose slug is already covered by a focus chip", () => {
    const pool: FishPoolItem[] = [
      { slug: "weltel-ai", name: "Weltel AI" },
      { slug: "unique-fish", name: "Unique Fish" },
    ]
    const actions = buildMessageActions("weltel-ai", [], null, pool)
    expect(actions).toEqual([
      { kind: "focus", target: "weltel-ai", label: "weltel-ai" },
      { kind: "spawn", target: "unique-fish", label: "Add Unique Fish" },
    ])
  })

  it("skips pool items whose slug matches an emitted view target", () => {
    const patch: BlockPatchResult = {
      blocks: [],
      patchedIds: ["weltel-ai"],
      dropped: 0,
    }
    const pool: FishPoolItem[] = [
      { slug: "weltel-ai", name: "Weltel AI" },
      { slug: "unique-fish", name: "Unique Fish" },
    ]
    const actions = buildMessageActions(null, [], patch, pool)
    expect(actions).toEqual([
      { kind: "view", target: "weltel-ai", label: "weltel-ai" },
      { kind: "spawn", target: "unique-fish", label: "Add Unique Fish" },
    ])
  })
})

describe("buildSpawnArgs", () => {
  it("produces the exact key set and references ctx values", () => {
    const ctx = buildAskContext(LAYOUT, "tank")
    const args = buildSpawnArgs("pool_123", "weltel-ai", ctx, "session_456")
    expect(Object.keys(args).sort()).toEqual([
      "block_index",
      "dag",
      "pool_id",
      "slugs",
      "tank_slugs",
      "time_span",
      "visitor_session_id",
    ])
    expect(args.pool_id).toBe("pool_123")
    expect(args.slugs).toEqual(["weltel-ai"])
    expect(args.visitor_session_id).toBe("session_456")
    expect(args.block_index).toEqual(ctx.blockIndex)
    expect(args.tank_slugs).toEqual(ctx.tankSlugs)
    expect(args.dag).toEqual(ctx.dag)
    expect(args.time_span).toEqual(ctx.timeSpan)
  })
})

describe("spawnPooledFish", () => {
  it("calls client.callTool exactly once with spawn_pooled_fish and matching pool_id / slugs", async () => {
    const callTool = vi.fn().mockResolvedValue({
      isError: false,
      data: null,
    })
    const queryClient = { setQueryData: vi.fn(), getQueryData: vi.fn() } as any
    const ctx = buildAskContext(LAYOUT, "tank")

    await spawnPooledFish({
      client: { callTool },
      queryClient,
      poolId: "pool_abc",
      slug: "test-fish",
      ctx,
      sessionId: "session_xyz",
    })

    expect(callTool).toHaveBeenCalledTimes(1)
    expect(callTool).toHaveBeenCalledWith(
      "spawn_pooled_fish",
      expect.objectContaining({
        pool_id: "pool_abc",
        slugs: ["test-fish"],
      }),
    )
  })

  it("applies overlay and returns {ok: true, patched: true} when result data carries an overlay", async () => {
    const setQueryData = vi.fn()
    const queryClient = { getQueryData: vi.fn(), setQueryData } as any
    const ctx = buildAskContext(LAYOUT, "tank")
    const overlayBlock = {
      type: "card",
      id: "card-weltel-ai",
      props: { title: "AI Patched", name: "AI Patched", tagline: "Patched", pitch: "Patched", links: [] },
    }
    const callTool = vi.fn().mockResolvedValue({
      isError: false,
      data: {
        blocks: [overlayBlock],
        patched_block_ids: ["card-weltel-ai"],
      },
    })

    const res = await spawnPooledFish({
      client: { callTool },
      queryClient,
      poolId: "pool_abc",
      slug: "weltel-ai",
      ctx,
      sessionId: "session_xyz",
    })

    expect(res).toEqual({ ok: true, patched: true })
    expect(setQueryData).toHaveBeenCalled()
  })

  it("returns {ok: false, ...} on isError: true and does not touch queryClient", async () => {
    const setQueryData = vi.fn()
    const queryClient = { getQueryData: vi.fn(), setQueryData } as any
    const ctx = buildAskContext(LAYOUT, "tank")
    const callTool = vi.fn().mockResolvedValue({
      isError: true,
      content: [{ type: "text", text: "Pool specimen exhausted" }],
    })

    const res = await spawnPooledFish({
      client: { callTool },
      queryClient,
      poolId: "pool_abc",
      slug: "weltel-ai",
      ctx,
      sessionId: "session_xyz",
    })

    expect(res).toEqual({ ok: false, error: "Pool specimen exhausted" })
    expect(setQueryData).not.toHaveBeenCalled()
  })

  it("falls back to 'Spawn failed' when isError: true has no text content", async () => {
    const setQueryData = vi.fn()
    const queryClient = { getQueryData: vi.fn(), setQueryData } as any
    const ctx = buildAskContext(LAYOUT, "tank")
    const callTool = vi.fn().mockResolvedValue({
      isError: true,
      content: [],
    })

    const res = await spawnPooledFish({
      client: { callTool },
      queryClient,
      poolId: "pool_abc",
      slug: "weltel-ai",
      ctx,
      sessionId: "session_xyz",
    })

    expect(res).toEqual({ ok: false, error: "Spawn failed" })
    expect(setQueryData).not.toHaveBeenCalled()
  })

  it("catches rejected callTool and returns {ok: false, error: ...} without throwing", async () => {
    const setQueryData = vi.fn()
    const queryClient = { getQueryData: vi.fn(), setQueryData } as any
    const ctx = buildAskContext(LAYOUT, "tank")
    const callTool = vi.fn().mockRejectedValue(new Error("Network timeout"))

    const res = await spawnPooledFish({
      client: { callTool },
      queryClient,
      poolId: "pool_abc",
      slug: "weltel-ai",
      ctx,
      sessionId: "session_xyz",
    })

    expect(res).toEqual({ ok: false, error: "Network timeout" })
    expect(setQueryData).not.toHaveBeenCalled()
  })

  it("returns {ok: true, patched: false} on successful result with no parseable overlay", async () => {
    const setQueryData = vi.fn()
    const queryClient = { getQueryData: vi.fn(), setQueryData } as any
    const ctx = buildAskContext(LAYOUT, "tank")
    const callTool = vi.fn().mockResolvedValue({
      isError: false,
      data: { status: "ok" },
    })

    const res = await spawnPooledFish({
      client: { callTool },
      queryClient,
      poolId: "pool_abc",
      slug: "weltel-ai",
      ctx,
      sessionId: "session_xyz",
    })

    expect(res).toEqual({ ok: true, patched: false })
    expect(setQueryData).not.toHaveBeenCalled()
  })
})

