import { describe, expect, it, vi } from "vitest"
import {
  extractBlockPatch,
  extractFocusSlug,
  extractHighlightSlugs,
  extractPendingJob,
  extractRecommendations,
} from "../harness"

const CARD = { type: "card", id: "card-a", props: { title: "A" } }
const BAD = { type: "card", id: "card-b", props: { title: null } }

describe("extractBlockPatch", () => {
  it("returns null when the envelope carries no blocks", () => {
    expect(extractBlockPatch({ summary: "hi" })).toBeNull()
    expect(extractBlockPatch(null)).toBeNull()
  })

  it("reads an overlay from response.carry", () => {
    const patch = extractBlockPatch({
      response: { carry: { blocks: [CARD], patched_block_ids: ["card-a"] } },
    })
    expect(patch?.blocks).toHaveLength(1)
    expect(patch?.patchedIds).toEqual(["card-a"])
  })

  it("reads an overlay parked in a step result", () => {
    const patch = extractBlockPatch({
      step_results: [{ status: "ok" }, { blocks: [CARD] }],
    })
    expect(patch?.blocks[0].id).toBe("card-a")
  })

  it("drops invalid blocks instead of failing the whole turn", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const patch = extractBlockPatch({ carry: { blocks: [CARD, BAD] } })
    expect(patch?.blocks).toHaveLength(1)
    expect(patch?.dropped).toBe(1)
    warn.mockRestore()
  })

  it("returns null when every block is invalid", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    expect(extractBlockPatch({ carry: { blocks: [BAD] } })).toBeNull()
    warn.mockRestore()
  })

  it("derives patchedIds when the server omits them", () => {
    const patch = extractBlockPatch({ carry: { blocks: [CARD] } })
    expect(patch?.patchedIds).toEqual(["card-a"])
  })

  it("carries dag and highlight slugs through either casing", () => {
    const patch = extractBlockPatch({
      carry: {
        blocks: [CARD],
        dag: { levels: [] },
        highlight_slugs: ["weltel-ai"],
      },
    })
    expect(patch?.dag).toEqual({ levels: [] })
    expect(patch?.highlightSlugs).toEqual(["weltel-ai"])
  })
})

describe("extractFocusSlug", () => {
  it("finds focus_slug on the carry", () => {
    expect(extractFocusSlug({ carry: { focus_slug: "weltel-ai" } })).toBe("weltel-ai")
  })

  it("accepts the camelCase spelling", () => {
    expect(extractFocusSlug({ response: { focusSlug: "weltel-devops" } })).toBe(
      "weltel-devops",
    )
  })

  it("returns null when absent or blank", () => {
    expect(extractFocusSlug({ carry: { focus_slug: "  " } })).toBeNull()
    expect(extractFocusSlug({})).toBeNull()
  })
})

describe("extractHighlightSlugs", () => {
  it("reads highlights even when there are no blocks", () => {
    expect(extractHighlightSlugs({ carry: { highlight_slugs: ["weltel-ai", "fisoul"] } })).toEqual(
      ["weltel-ai", "fisoul"],
    )
  })
})

describe("extractPendingJob", () => {
  it("reads a queued discovery job", () => {
    const job = extractPendingJob({
      carry: { pending_job: { job_id: "abc123", status: "pending", query: "k8s" } },
    })
    expect(job?.job_id).toBe("abc123")
  })

  it("ignores a malformed job token", () => {
    expect(extractPendingJob({ carry: { pending_job: { status: "pending" } } })).toBeNull()
  })
})

describe("extractRecommendations", () => {
  const rec = {
    slug: "weltel-ai",
    name: "WelTel AI",
    blurb: "agents",
    tags: ["ai"],
    reason: "closest tag match",
    in_tank: true,
  }

  it("reads recommendations from response.carry", () => {
    expect(
      extractRecommendations({ response: { carry: { recommendations: [rec] } } }),
    ).toEqual([rec])
  })

  it("reads a step-result bag newest-first", () => {
    expect(
      extractRecommendations({
        step_results: [{ status: "ok" }, { recommendations: [rec] }],
      }),
    ).toEqual([rec])
  })

  it("drops malformed entries instead of failing the turn", () => {
    expect(
      extractRecommendations({
        carry: { recommendations: [rec, { name: "no slug" }, null, "x"] },
      }),
    ).toEqual([rec])
  })

  it("returns [] when absent", () => {
    expect(extractRecommendations({ carry: { focus_slug: "weltel-ai" } })).toEqual([])
    expect(extractRecommendations(null)).toEqual([])
  })

  it("fills name from slug when name is missing", () => {
    expect(
      extractRecommendations({
        carry: { recommendations: [{ slug: "fisoul", in_tank: false }] },
      }),
    ).toEqual([
      expect.objectContaining({ slug: "fisoul", name: "fisoul", in_tank: false }),
    ])
  })
})
