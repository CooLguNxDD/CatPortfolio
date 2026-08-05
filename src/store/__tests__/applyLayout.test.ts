import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Layout } from "@/content/schema"

// Mock the demo query key helper used by applyLayoutToCache.
vi.mock("@/hooks/useDemoLayout", () => ({
  demoLayoutQueryKey: (id: string) => ["layout", "demo", id],
}))

import { applyLayoutToCache } from "../applyLayout"
import { useLayoutStore } from "@/store"

function makeLayout(): Layout {
  return {
    version: 1,
    meta: {
      audience: "peer",
      generatedAt: "2026-07-29T00:00:00Z",
      mode: "patched",
    },
    blocks: [
      {
        type: "hero",
        id: "hero-1",
        props: {
          name: "Andrew Liang",
          tagline: "test",
          pitch: "test pitch",
          links: [],
        },
      },
    ],
  }
}

describe("applyLayoutToCache", () => {
  beforeEach(() => {
    useLayoutStore.getState().clearDemo()
  })

  it("dual-writes to zustand working layout + query cache", () => {
    const setQueryData = vi.fn()
    const queryClient = { setQueryData } as any
    const layout = makeLayout()

    applyLayoutToCache(queryClient, {
      layout,
      source: "bake",
      shortId: "job_abc_1",
    })

    const s = useLayoutStore.getState()
    expect(s.shortId).toBe("job_abc_1")
    expect(s.isDemoSession).toBe(true)
    expect(s.workingLayout).toEqual(layout)
    expect(setQueryData).toHaveBeenCalledWith(
      ["layout", "demo", "job_abc_1"],
      expect.objectContaining({ shortId: "job_abc_1", layout }),
    )
  })

  it("skips snapshot sources", () => {
    const setQueryData = vi.fn()
    applyLayoutToCache({ setQueryData } as any, {
      layout: makeLayout(),
      source: "snapshot",
      shortId: "x",
    })
    expect(useLayoutStore.getState().workingLayout).toBeNull()
    expect(setQueryData).not.toHaveBeenCalled()
  })

  it("follows fork when shortId changes", () => {
    const setQueryData = vi.fn()
    const qc = { setQueryData } as any
    useLayoutStore.getState().enterDemo("original_bake")
    applyLayoutToCache(qc, {
      layout: makeLayout(),
      source: "bake",
      shortId: "derived_patch_1",
    })
    expect(useLayoutStore.getState().shortId).toBe("derived_patch_1")
    expect(useLayoutStore.getState().workingLayout).not.toBeNull()
  })
})
