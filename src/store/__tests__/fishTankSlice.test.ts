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

  it("dives and surfaces with stage progress", () => {
    useStore.getState().surface()
    expect(useStore.getState().scene).toBe("surface")
    expect(useStore.getState().stageProgress).toBe(0)
    useStore.getState().dive()
    expect(useStore.getState().scene).toBe("tank")
    expect(useStore.getState().stageProgress).toBe(1)
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

  it("resets fully", () => {
    useStore.getState().setQuery("mcp")
    useStore.getState().setChrome("flat")
    useStore.getState().resetFishTankUi()
    expect(useStore.getState().query).toBe("")
    expect(useStore.getState().chrome).toBe("3d")
  })
})
