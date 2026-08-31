import { describe, expect, it, beforeEach } from "vitest"
import { create } from "zustand"
import { createFishTankSlice, type FishTankSlice } from "../fishTankSlice"

function makeStore() {
  return create<FishTankSlice>()((...args) => createFishTankSlice(...args))
}

describe("fishTankSlice", () => {
  let useStore: ReturnType<typeof makeStore>

  beforeEach(() => {
    useStore = makeStore()
  })

  it("dives and surfaces (no rAF in test env → settles instantly)", () => {
    useStore.getState().surface()
    expect(useStore.getState().state).toBe("surface")
    useStore.getState().dive()
    expect(useStore.getState().state).toBe("tank")
    useStore.getState().surface()
    expect(useStore.getState().state).toBe("surface")
  })

  it("toggles domain chips", () => {
    useStore.getState().toggleDomain("ai")
    expect(useStore.getState().domain).toBe("ai")
    useStore.getState().toggleDomain("ai")
    expect(useStore.getState().domain).toBeNull()
  })

  it("applies and clears bake", () => {
    useStore.getState().applyBake()
    expect(useStore.getState().bakeActive).toBe(true)
    useStore.getState().dismissCuration()
    expect(useStore.getState().bakeActive).toBe(false)
    expect(useStore.getState().curationDismissed).toBe(true)
  })

  it("setFocus from tank focuses directly (no dive)", () => {
    useStore.getState().dive()
    useStore.getState().setFocus("weltel-devops")
    expect(useStore.getState().focus).toBe("weltel-devops")
    expect(useStore.getState().state).toBe("focused")
    expect(useStore.getState().pendingFocus).toBeNull()

    useStore.getState().setFocus(null)
    expect(useStore.getState().focus).toBeNull()
    expect(useStore.getState().state).toBe("tank")
  })

  it("setFocus from the surface dives first, then focuses on arrival (no rAF in test env → settles instantly)", () => {
    useStore.getState().surface()
    useStore.getState().setFocus("weltel-ai")
    // Router authority: focus value always applies immediately...
    expect(useStore.getState().focus).toBe("weltel-ai")
    // ...and the dive it triggers settles synchronously in the test env, so
    // the queued focus drains right away instead of leaving you at the rim.
    expect(useStore.getState().state).toBe("focused")
    expect(useStore.getState().pendingFocus).toBeNull()
  })

  it("releasing mid-dive drops the queued surface-pick focus", () => {
    useStore.getState().surface()
    useStore.getState().setFocus("weltel-ai")
    expect(useStore.getState().state).toBe("focused")

    useStore.getState().setFocus(null)
    expect(useStore.getState().focus).toBeNull()
    expect(useStore.getState().pendingFocus).toBeNull()
    expect(useStore.getState().state).toBe("tank")
  })

  it("surface() clears any queued pendingFocus", () => {
    useStore.getState().setFocus("weltel-ai")
    useStore.getState().surface()
    expect(useStore.getState().pendingFocus).toBeNull()
    expect(useStore.getState().focus).toBeNull()
  })

  it("getProgress reflects the settled dive/surface target", () => {
    useStore.getState().dive()
    expect(useStore.getState().getProgress()).toBe(1)
    useStore.getState().surface()
    expect(useStore.getState().getProgress()).toBe(0)
  })

  it("dive() from tank is legal (re-dive quirk) and settles back to tank with no rAF in test env", () => {
    useStore.getState().dive()
    expect(useStore.getState().state).toBe("tank")
    useStore.getState().dive() // "tank" --dive--> "diving" --arrive(sync, no rAF)--> "tank"
    expect(useStore.getState().state).toBe("tank")
  })

  it("resets fully", () => {
    useStore.getState().setQuery("mcp")
    useStore.getState().setChrome("flat")
    useStore.getState().resetFishTankUi()
    expect(useStore.getState().query).toBe("")
    expect(useStore.getState().chrome).toBe("3d")
    expect(useStore.getState().state).toBe("surface")
  })

  it("resetFishTankUi zeros leftover dive progress", () => {
    useStore.getState().dive()
    expect(useStore.getState().getProgress()).toBe(1)
    useStore.getState().resetFishTankUi()
    expect(useStore.getState().getProgress()).toBe(0)
    expect(useStore.getState().state).toBe("surface")
  })
})
