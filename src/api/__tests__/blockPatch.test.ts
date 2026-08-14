import { describe, expect, it, vi } from "vitest"
import {
  extractBlockPatch,
  extractFocusSlug,
  extractPendingJob,
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
