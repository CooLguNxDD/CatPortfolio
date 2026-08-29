import { describe, it, expect } from "vitest"
import { usePreferencesStore, sanitizePersistedPreferences } from "../index"

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

describe("sanitizePersistedPreferences", () => {
  // migrate() (zustand persist) only runs on a version bump, so a same-version
  // hand-edited/malformed blob would previously skip validation entirely on
  // rehydrate — the store's `merge` option now routes every rehydrate through
  // this same function regardless of version. These tests cover the function
  // both paths delegate to.

  it("falls back to defaults for a non-object persisted value", () => {
    expect(sanitizePersistedPreferences(null)).toMatchObject({ theme: expect.any(String), accent: "amber" })
    expect(sanitizePersistedPreferences(undefined)).toMatchObject({ accent: "amber" })
    expect(sanitizePersistedPreferences("not an object")).toMatchObject({ accent: "amber" })
    expect(sanitizePersistedPreferences(["array", "not", "object"])).toMatchObject({ accent: "amber" })
    expect(sanitizePersistedPreferences(42)).toMatchObject({ accent: "amber" })
  })

  it("rejects an out-of-enum accent/density/circadian and falls back per-field", () => {
    const result = sanitizePersistedPreferences({
      theme: 123,
      accent: "__evil__",
      density: "roomy",
      circadian: "midnight",
    })
    expect(result.theme).toEqual(expect.any(String))
    expect(result.accent).toBe("amber")
    expect(result.density).toBe("comfortable")
    expect(result.circadian).toBe("auto")
  })

  it("passes through valid fields unchanged", () => {
    const result = sanitizePersistedPreferences({
      theme: "paper",
      accent: "cyan",
      density: "compact",
      circadian: "night",
    })
    expect(result).toMatchObject({ theme: "paper", accent: "cyan", density: "compact", circadian: "night" })
  })

  it("sanitizes a garbage notifications sub-object field-by-field", () => {
    const result = sanitizePersistedPreferences({
      notifications: { errors: "yes", health: true, auth: null },
    })
    expect(result.notifications).toEqual({ errors: true, health: true, auth: false, digest: false })
  })

  it("does not throw when notifications itself is not an object", () => {
    expect(() => sanitizePersistedPreferences({ notifications: "garbage" })).not.toThrow()
  })
})
