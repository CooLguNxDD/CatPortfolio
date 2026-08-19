import { describe, it, expect } from "vitest"
import { usePreferencesStore } from "../index"

describe("usePreferencesStore", () => {
  it("initializes with default preferences and state actions", () => {
    const state = usePreferencesStore.getState()
    expect(state.theme).toBeDefined()
    expect(typeof state.setTheme).toBe("function")
    expect(typeof state.setAccent).toBe("function")
  })

  it("updates preferences via actions", () => {
    usePreferencesStore.getState().setTheme("paper")
    expect(usePreferencesStore.getState().theme).toBe("paper")
    usePreferencesStore.getState().setAccent("cyan")
    expect(usePreferencesStore.getState().accent).toBe("cyan")
  })
})
