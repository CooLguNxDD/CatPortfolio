import { beforeEach, describe, expect, it } from "vitest"
import { createStore } from "zustand"
import { createLayoutSlice, type LayoutSlice } from "../layoutSlice"
import type { Layout } from "@/content/schema"

function makeLayout(mode?: string): Layout {
  return {
    version: 1,
    meta: {
      audience: "peer",
      generatedAt: "2026-07-29T00:00:00Z",
      ...(mode ? { mode } : {}),
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

function makeStore() {
  return createStore<LayoutSlice>()((...args) => createLayoutSlice(...args))
}

describe("layoutSlice demo session", () => {
  let store: ReturnType<typeof makeStore>

  beforeEach(() => {
    store = makeStore()
  })

  it("enterDemo sets shortId + isDemoSession from URL j", () => {
    store.getState().enterDemo("andrew_weltel_showcase_4")
    const s = store.getState()
    expect(s.isDemoSession).toBe(true)
    expect(s.shortId).toBe("andrew_weltel_showcase_4")
    expect(s.workingLayout).toBeNull()
  })

  it("enterDemo same id is a no-op (keeps working layout)", () => {
    store.getState().enterDemo("andrew_weltel_showcase_4")
    store.getState().setWorkingLayout({
      layout: makeLayout("showcase"),
      source: "live",
      shortId: "andrew_weltel_showcase_4",
    })
    const before = store.getState().workingLayout
    store.getState().enterDemo("andrew_weltel_showcase_4")
    expect(store.getState().workingLayout).toBe(before)
  })

  it("enterDemo new id clears working layout", () => {
    store.getState().enterDemo("andrew_weltel_showcase_4")
    store.getState().setWorkingLayout({
      layout: makeLayout("showcase"),
      source: "bake",
      shortId: "andrew_weltel_showcase_4",
    })
    store.getState().enterDemo("other_job_1")
    expect(store.getState().shortId).toBe("other_job_1")
    expect(store.getState().workingLayout).toBeNull()
  })

  it("setWorkingLayout ignores snapshot", () => {
    store.getState().enterDemo("andrew_weltel_showcase_4")
    store.getState().setWorkingLayout({
      layout: makeLayout(),
      source: "snapshot",
    })
    expect(store.getState().workingLayout).toBeNull()
  })

  it("setWorkingLayout preserves shortId across expansions", () => {
    store.getState().enterDemo("andrew_weltel_showcase_4")
    const expanded = makeLayout("scoped")
    store.getState().setWorkingLayout({
      layout: expanded,
      source: "live",
    })
    const s = store.getState()
    expect(s.shortId).toBe("andrew_weltel_showcase_4")
    expect(s.workingLayout).toEqual(expanded)
    expect(s.workingSource).toBe("live")
  })

  it("clearDemo resets the session", () => {
    store.getState().enterDemo("andrew_weltel_showcase_4")
    store.getState().clearDemo()
    const s = store.getState()
    expect(s.isDemoSession).toBe(false)
    expect(s.shortId).toBeNull()
    expect(s.workingLayout).toBeNull()
  })

  it("bakeTheme + themeOverride: Home clears override conceptually", () => {
    store.getState().enterDemo("andrew_weltel_showcase_4")
    store.getState().setBakeTheme("neon")
    store.getState().setThemeOverride("paper")
    expect(store.getState().bakeTheme).toBe("neon")
    expect(store.getState().themeOverride).toBe("paper")
    store.getState().clearThemeOverride()
    expect(store.getState().themeOverride).toBeNull()
    expect(store.getState().bakeTheme).toBe("neon")
  })
})
