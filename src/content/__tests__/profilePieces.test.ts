import { afterEach, describe, expect, it, vi } from "vitest"
import type { Layout } from "../schema"
import { loadBaked } from "../loadLayout"
import {
  MAX_FISH,
  ProfilePieceIndexSchema,
  ProfilePieceSchema,
  loadProfilePieces,
  mergeProfilePieces,
  type ProfilePiece,
} from "../profilePieces"

/** Shipped pieces, keyed by file name (bundled at test time, no node:fs). */
const SHIPPED: Record<string, unknown> = Object.fromEntries(
  Object.entries(
    import.meta.glob("../../../public/profile-pieces/*.json", { eager: true, import: "default" }),
  ).map(([path, json]) => [path.split("/").pop() as string, json]),
)

function fish(slug: string, extra: Record<string, unknown> = {}) {
  return ProfilePieceSchema.shape.fish.element.parse({
    slug,
    title: slug,
    species: "devops",
    ...extra,
  })
}

function piece(slugs: string[], extra: Partial<ProfilePiece> = {}): ProfilePiece {
  return { version: 1, id: "p", title: "P", fish: slugs.map((s) => fish(s)), ...extra }
}

function tankLayout(slugs: string[], timeSpan?: { min: number; max: number }): Layout {
  return {
    version: 1,
    meta: { audience: "peer", generatedAt: "2026-10-25T00:00:00Z" },
    blocks: [
      {
        type: "fishTank",
        id: "tank",
        props: {
          renderer: "webgl",
          fish: slugs.map((s) => fish(s, { title: `baked ${s}` })),
          highlightSlugs: [],
          ...(timeSpan ? { timeSpan } : {}),
        },
      },
      {
        type: "timeline",
        id: "tl",
        props: { items: [{ date: "2025", title: "old" }] },
      },
    ],
  } as Layout
}

function tankFish(layout: Layout) {
  const block = layout.blocks.find((b) => b.type === "fishTank")
  if (block?.type !== "fishTank") throw new Error("no tank")
  return block.props
}

function timelineItems(layout: Layout) {
  const block = layout.blocks.find((b) => b.type === "timeline")
  if (block?.type !== "timeline") throw new Error("no timeline")
  return block.props.items
}

describe("ProfilePieceSchema", () => {
  it("requires version 1 and at least one fish", () => {
    expect(ProfilePieceSchema.safeParse({ version: 1, id: "a", title: "A", fish: [] }).success).toBe(false)
    expect(
      ProfilePieceSchema.safeParse({ version: 2, id: "a", title: "A", fish: [{ slug: "x", title: "x", species: "ai" }] })
        .success,
    ).toBe(false)
  })

  it("rejects an unknown species", () => {
    const res = ProfilePieceSchema.safeParse({
      version: 1,
      id: "a",
      title: "A",
      fish: [{ slug: "x", title: "x", species: "finance" }],
    })
    expect(res.success).toBe(false)
  })

  it("index rejects paths and non-json names", () => {
    expect(ProfilePieceIndexSchema.safeParse({ pieces: ["../secret.json"] }).success).toBe(false)
    expect(ProfilePieceIndexSchema.safeParse({ pieces: ["a/b.json"] }).success).toBe(false)
    expect(ProfilePieceIndexSchema.safeParse({ pieces: ["piece.txt"] }).success).toBe(false)
    expect(ProfilePieceIndexSchema.safeParse({ pieces: ["d3-security.json"] }).success).toBe(true)
  })
})

describe("mergeProfilePieces", () => {
  it("returns the same reference when there are no pieces", () => {
    const layout = tankLayout(["a"])
    expect(mergeProfilePieces(layout, [])).toBe(layout)
  })

  it("appends new fish and lets the piece win on a slug clash", () => {
    const merged = mergeProfilePieces(tankLayout(["a", "b"]), [piece(["b", "c"])])
    const props = tankFish(merged)
    expect(props.fish.map((f) => f.slug)).toEqual(["a", "b", "c"])
    expect(props.fish[1].title).toBe("b")
  })

  it("respects the 40-fish cap", () => {
    const baked = Array.from({ length: MAX_FISH - 1 }, (_, i) => `baked-${i}`)
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const merged = mergeProfilePieces(tankLayout(baked), [piece(["n1", "n2", "n3"])])
    expect(tankFish(merged).fish).toHaveLength(MAX_FISH)
    expect(tankFish(merged).fish.at(-1)?.slug).toBe("n1")
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it("prepends timeline rows once (idempotent on re-merge)", () => {
    const p = piece(["a"], { timeline: [{ date: "2026-09", title: "new job" }] })
    const once = mergeProfilePieces(tankLayout([]), [p])
    const twice = mergeProfilePieces(once, [p])
    expect(timelineItems(twice).map((r) => r.title)).toEqual(["new job", "old"])
  })

  it("widens an authored timeSpan to cover piece years", () => {
    const p = piece([])
    p.fish = [fish("d", { startYear: 2026.67 })]
    const merged = mergeProfilePieces(tankLayout(["a"], { min: 2024, max: 2026 }), [p])
    expect(tankFish(merged).timeSpan).toEqual({ min: 2024, max: 2026.67 })
  })

  it("leaves a layout without a fishTank or timeline untouched", () => {
    const layout: Layout = { ...tankLayout([]), blocks: [] }
    expect(mergeProfilePieces(layout, [piece(["a"])])).toBe(layout)
  })

  it("merged baked layout still parses", async () => {
    const { LayoutSchema } = await import("../schema")
    const shipped = ProfilePieceSchema.parse(SHIPPED["d3-security.json"])
    const merged = mergeProfilePieces(loadBaked(), [shipped])
    expect(LayoutSchema.safeParse(merged).success).toBe(true)
  })
})

describe("loadProfilePieces (fail soft)", () => {
  const originalFetch = globalThis.fetch
  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  function respond(map: Record<string, unknown>) {
    globalThis.fetch = vi.fn(async (url: string) => {
      const key = Object.keys(map).find((k) => url.endsWith(k))
      if (!key) return { ok: false, status: 404, json: async () => ({}) }
      const body = map[key]
      return {
        ok: true,
        status: 200,
        json: async () => {
          if (body === "html") throw new SyntaxError("Unexpected token <")
          return body
        },
      }
    }) as unknown as typeof fetch
  }

  it("returns [] when the index is missing", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {})
    respond({})
    expect(await loadProfilePieces("/CatPortfolio/")).toEqual([])
  })

  it("returns [] when the SPA fallback serves HTML for the index", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {})
    respond({ "index.json": "html" })
    expect(await loadProfilePieces("/CatPortfolio/")).toEqual([])
  })

  it("skips a bad piece and keeps the good one", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    respond({
      "profile-pieces/index.json": { pieces: ["good.json", "bad.json", "gone.json"] },
      "good.json": piece(["g"]),
      "bad.json": { version: 1, id: "b", title: "B", fish: [] },
    })
    const pieces = await loadProfilePieces("/CatPortfolio/")
    expect(pieces.map((p) => p.fish[0].slug)).toEqual(["g"])
    expect(warn).toHaveBeenCalledTimes(2)
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/CatPortfolio/profile-pieces/index.json",
      expect.objectContaining({ cache: "no-store" }),
    )
  })
})

describe("shipped profile pieces", () => {
  const index = ProfilePieceIndexSchema.parse(SHIPPED["index.json"])

  it.each(index.pieces)("%s exists and validates", (file) => {
    expect(SHIPPED[file]).toBeDefined()
    expect(ProfilePieceSchema.safeParse(SHIPPED[file]).success).toBe(true)
  })

  it("d3-security keeps to shipped, publishable facts", () => {
    const raw = JSON.stringify(SHIPPED["d3-security.json"])
    const d3 = ProfilePieceSchema.parse(SHIPPED["d3-security.json"])
    expect(d3.fish.every((f) => f.slug.startsWith("d3-"))).toBe(true)
    expect(d3.fish.every((f) => f.endYear === undefined)).toBe(true)
    // No ticket ids, PR numbers or the unmerged OOM fix.
    expect(raw).not.toMatch(/\bCT-\d+|#\d+|OOM/i)
  })
})
