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

  it("setFocus is unconditional but flips discrete state only when the machine allows it", () => {
    useStore.getState().surface()
    useStore.getState().setFocus("weltel-ai")
    // Router authority: focus value always applies...
    expect(useStore.getState().focus).toBe("weltel-ai")
    // ...but the machine leaves state alone since "focus" isn't legal from "surface".
    expect(useStore.getState().state).toBe("surface")

    useStore.getState().dive()
    useStore.getState().setFocus("weltel-devops")
    expect(useStore.getState().focus).toBe("weltel-devops")
    expect(useStore.getState().state).toBe("focused")

    useStore.getState().setFocus(null)
    expect(useStore.getState().focus).toBeNull()
    expect(useStore.getState().state).toBe("tank")
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
})
