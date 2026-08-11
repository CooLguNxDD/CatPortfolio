import { describe, it, expect } from "vitest"
import { fishFromLayout } from "../fishFromLayout"
import type { Layout } from "@/content/schema"

function layout(blocks: Layout["blocks"]): Layout {
  return {
    version: 1,
    meta: { audience: "default", generatedAt: "2026-08-10T00:00:00Z" },
    blocks,
  }
}

describe("fishFromLayout", () => {
  it("recovers slug from card- prefix", () => {
    const fish = fishFromLayout(
      layout([
        {
          type: "card",
          id: "card-opencat-tunnel",
          props: {
            title: "OpenCat Tunnel",
            domain: "ai",
            body: "A browser-to-terminal relay with step-up auth.",
            tags: ["WebSocket", "PTY"],
            metrics: [{ label: "ms", value: "18" }],
          },
        },
      ]),
    )
    expect(fish).toHaveLength(1)
    expect(fish[0].slug).toBe("opencat-tunnel")
    expect(fish[0].species).toBe("ai")
  })

  it("uses projectGrid projects", () => {
    const fish = fishFromLayout(
      layout([
        {
          type: "projectGrid",
          id: "pg",
          props: {
            projects: [
              {
                id: "hybrid-search",
                name: "Hybrid Search",
                summary: "Dense + sparse fusion via RRF across collections.",
                tags: ["pgvector"],
                metrics: [],
                links: [{ label: "repo", href: "https://github.com/example" }],
              },
            ],
          },
        },
      ]),
    )
    expect(fish).toHaveLength(1)
    expect(fish[0].slug).toBe("hybrid-search")
  })

  it("ignores hero and kpiGrid", () => {
    const fish = fishFromLayout(
      layout([
        {
          type: "hero",
          id: "h1",
          props: { name: "X", tagline: "Y" },
        },
        {
          type: "kpiGrid",
          id: "k1",
          props: { items: [{ label: "a", value: "1" }] },
        },
      ]),
    )
    expect(fish).toEqual([])
  })

  it("clamps hostile props into [0,1] numerics", () => {
    const body = "x".repeat(50_000)
    const tags = Array.from({ length: 200 }, (_, i) => `tag-${i}`)
    const fish = fishFromLayout(
      layout([
        {
          type: "card",
          id: "card-hostile",
          props: {
            title: "Hostile",
            body,
            tags,
            // missing domain → platform
          },
        },
      ]),
    )
    expect(fish).toHaveLength(1)
    const f = fish[0]
    for (const k of ["size", "depth", "speed", "glow"] as const) {
      expect(f[k]).toBeGreaterThanOrEqual(0)
      expect(f[k]).toBeLessThanOrEqual(1)
    }
    expect(f.species).toBe("platform")
    expect((f.tags ?? []).length).toBeLessThanOrEqual(24)
  })

  it("school ids are stable across invocations", () => {
    const l = layout([
      {
        type: "card",
        id: "card-a",
        props: { title: "A", domain: "ai", body: "Enough prose for a card body here." },
      },
      {
        type: "card",
        id: "card-b",
        props: { title: "B", domain: "ai", body: "Enough prose for a card body here too." },
      },
    ])
    const a = fishFromLayout(l)
    const b = fishFromLayout(l)
    expect(a.map((f) => f.school)).toEqual(b.map((f) => f.school))
  })
})
