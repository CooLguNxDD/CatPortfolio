import { describe, expect, it } from "vitest"
import type { Layout } from "@/content/schema"
import type { LayoutLoadResult } from "@/content/loadLayout"
import { loadBaked } from "@/content/loadLayout"
import { resolvePageLayout } from "../usePageLayout"

function layout(id: string): Layout {
  return {
    version: 1,
    meta: {
      audience: "peer",
      generatedAt: "2026-07-29T00:00:00Z",
    },
    blocks: [
      {
        type: "hero",
        id,
        props: { name: id, tagline: "t", pitch: "p", links: [] },
      },
    ],
  }
}

function result(
  id: string,
  source: LayoutLoadResult["source"],
  shortId?: string,
): LayoutLoadResult {
  return { layout: layout(id), source, ...(shortId ? { shortId } : {}) }
}

const empty = {
  shortId: null as string | null,
  isDemoSession: false,
  demoResult: null as LayoutLoadResult | null,
  liveResult: null as LayoutLoadResult | null,
  workingLayout: null as Layout | null,
  workingSource: null as LayoutLoadResult["source"] | null,
  workingShortId: null as string | null,
}

describe("resolvePageLayout", () => {
  it("prefers the demo bake over live default", () => {
    const next = resolvePageLayout({
      ...empty,
      shortId: "job_bake_1",
      isDemoSession: true,
      demoResult: result("demo", "bake", "job_bake_1"),
      liveResult: result("live", "live"),
    })
    expect(next.layout.blocks[0].id).toBe("demo")
    expect(next.source).toBe("bake")
  })

  it("lets a non-demo patch win over a later live fetch", () => {
    const next = resolvePageLayout({
      ...empty,
      liveResult: result("live", "live"),
      workingLayout: layout("patched"),
      workingSource: "snapshot",
      workingShortId: null,
    })
    expect(next.layout.blocks[0].id).toBe("patched")
    expect(next.source).toBe("snapshot")
  })

  it("falls back to the baked snapshot when everything is empty", () => {
    const next = resolvePageLayout(empty)
    expect(next.source).toBe("snapshot")
    expect(next.layout).toBe(loadBaked())
  })

  it("ignores a working copy stamped with a different shortId", () => {
    const next = resolvePageLayout({
      ...empty,
      shortId: "job_b",
      isDemoSession: true,
      demoResult: result("demo-b", "bake", "job_b"),
      workingLayout: layout("from-a"),
      workingSource: "bake",
      workingShortId: "job_a",
    })
    expect(next.layout.blocks[0].id).toBe("demo-b")
  })
})
