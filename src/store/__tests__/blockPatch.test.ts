import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Block, Layout } from "@/content/schema"

vi.mock("@/hooks/useDemoLayout", () => ({
  demoLayoutQueryKey: (id: string) => ["layout", "demo", id],
}))

import { applyBlockPatch, mergeBlockPatch } from "../applyLayout"
import { useLayoutStore } from "@/store"

function card(id: string, title: string): Block {
  return { type: "card", id, props: { title } } as unknown as Block
}

function makeLayout(): Layout {
  return {
    version: 1,
    meta: {
      audience: "peer",
      generatedAt: "2026-07-29T00:00:00Z",
      dag: { levels: [{ level: 0, label: "Intro", nodes: ["hero-1"] }] },
      highlightSlugs: ["old"],
    },
    blocks: [
      {
        type: "hero",
        id: "hero-1",
        props: { name: "Andrew Liang", tagline: "t", pitch: "p", links: [] },
      },
      card("card-a", "A"),
      {
        type: "quickActions",
        id: "cta",
        props: { prompt: "Ask:", actions: [{ label: "l", prompt: "p" }] },
      },
    ],
  } as unknown as Layout
}

describe("mergeBlockPatch", () => {
  it("replaces a block in place and leaves the rest untouched", () => {
    const base = makeLayout()
    const next = mergeBlockPatch(base, { blocks: [card("card-a", "A2")] })

    expect(next.blocks.map((b) => b.id)).toEqual(["hero-1", "card-a", "cta"])
    expect((next.blocks[1].props as any).title).toBe("A2")
    expect(next.blocks[0]).toBe(base.blocks[0])
    expect(next.blocks[2]).toBe(base.blocks[2])
  })

  it("inserts unknown ids before a trailing quickActions", () => {
    const next = mergeBlockPatch(makeLayout(), { blocks: [card("card-b", "B")] })
    expect(next.blocks.map((b) => b.id)).toEqual(["hero-1", "card-a", "card-b", "cta"])
  })

  it("appends when there is no CTA to insert before", () => {
    const base = makeLayout()
    base.blocks = base.blocks.filter((b) => b.type !== "quickActions")
    const next = mergeBlockPatch(base, { blocks: [card("card-b", "B")] })
    expect(next.blocks.map((b) => b.id)).toEqual(["hero-1", "card-a", "card-b"])
  })

  it("stamps patchedBlockIds so the renderer can show what changed", () => {
    const next = mergeBlockPatch(makeLayout(), {
      blocks: [card("card-a", "A2")],
      patchedIds: ["card-a"],
    })
    expect(next.meta.patchedBlockIds).toEqual(["card-a"])
  })

  it("derives patchedBlockIds when the server omits them", () => {
    const next = mergeBlockPatch(makeLayout(), { blocks: [card("card-a", "A2")] })
    expect(next.meta.patchedBlockIds).toEqual(["card-a"])
  })

  it("keeps the existing dag when the patch carries none", () => {
    const next = mergeBlockPatch(makeLayout(), { blocks: [card("card-a", "A2")] })
    expect(next.meta.dag?.levels).toHaveLength(1)
  })

  it("takes the server dag when present", () => {
    const dag = { levels: [{ level: 2, label: "Projects", nodes: ["card-a"] }] }
    const next = mergeBlockPatch(makeLayout(), {
      blocks: [card("card-a", "A2")],
      dag: dag as Layout["meta"]["dag"],
    })
    expect(next.meta.dag?.levels[0].label).toBe("Projects")
  })

  it("updates highlightSlugs only when the patch supplies them", () => {
    const kept = mergeBlockPatch(makeLayout(), { blocks: [card("card-a", "A2")] })
    expect(kept.meta.highlightSlugs).toEqual(["old"])

    const replaced = mergeBlockPatch(makeLayout(), {
      blocks: [card("card-a", "A2")],
      highlightSlugs: ["new"],
    })
    expect(replaced.meta.highlightSlugs).toEqual(["new"])
  })

  it("does not mutate the base layout", () => {
    const base = makeLayout()
    mergeBlockPatch(base, { blocks: [card("card-a", "A2")] })
    expect((base.blocks[1].props as any).title).toBe("A")
    expect(base.meta.patchedBlockIds).toBeUndefined()
  })
})

describe("applyBlockPatch", () => {
  beforeEach(() => {
    useLayoutStore.getState().clearDemo()
  })

  it("falls back to the baked snapshot when nothing is on screen", () => {
    const setQueryData = vi.fn()
    const queryClient = { setQueryData, getQueryData: () => undefined } as any
    expect(applyBlockPatch(queryClient, { blocks: [card("card-a", "A2")] })).toBe(true)
    expect(useLayoutStore.getState().workingLayout).not.toBeNull()
    expect(setQueryData).toHaveBeenCalledWith(
      ["layout", "default"],
      expect.objectContaining({ source: "live" }),
    )
  })

  it("does not invent a demo session for a non-demo patch", () => {
    const queryClient = {
      setQueryData: vi.fn(),
      getQueryData: () => ({ layout: makeLayout(), source: "live" as const }),
    } as any
    expect(applyBlockPatch(queryClient, { blocks: [card("card-a", "A2")] })).toBe(true)
    expect(useLayoutStore.getState().isDemoSession).toBe(false)
    expect(useLayoutStore.getState().shortId).toBeNull()
  })

  it("returns false for an empty patch", () => {
    const queryClient = { setQueryData: vi.fn(), getQueryData: () => undefined } as any
    expect(applyBlockPatch(queryClient, { blocks: [] })).toBe(false)
  })

  it("writes the merged layout to the store and the cache", () => {
    const setQueryData = vi.fn()
    const queryClient = {
      setQueryData,
      getQueryData: () => ({ layout: makeLayout(), source: "live" as const }),
    } as any

    expect(applyBlockPatch(queryClient, { blocks: [card("card-a", "A2")] })).toBe(true)
    expect(setQueryData).toHaveBeenCalledWith(
      ["layout", "default"],
      expect.objectContaining({ source: "live" }),
    )
    // The store keeps a bare Layout; the cache keeps the LayoutLoadResult.
    const working = useLayoutStore.getState().workingLayout
    expect((working?.blocks[1].props as any).title).toBe("A2")
  })

  it("patches the demo layout when a short_id session is active", () => {
    const setQueryData = vi.fn()
    useLayoutStore.getState().enterDemo("job_bake_1")
    useLayoutStore
      .getState()
      .setWorkingLayout({ layout: makeLayout(), source: "bake", shortId: "job_bake_1" })
    const queryClient = { setQueryData, getQueryData: () => undefined } as any

    expect(applyBlockPatch(queryClient, { blocks: [card("card-a", "A2")] })).toBe(true)
    expect(setQueryData).toHaveBeenCalledWith(
      ["layout", "demo", "job_bake_1"],
      expect.anything(),
    )
  })
})
