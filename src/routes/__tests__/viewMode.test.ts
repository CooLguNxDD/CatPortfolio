import { describe, it, expect } from "vitest"
import { resolveViewMode, shouldGateOrientation } from "../viewMode"

const capable = { webgl2: true, reducedMotion: false }

describe("resolveViewMode", () => {
  it("explicit text wins", () => {
    expect(resolveViewMode({ v: "text" }, capable, 5)).toBe("text")
  })

  it("no WebGL → text", () => {
    expect(resolveViewMode({}, { webgl2: false, reducedMotion: false }, 5)).toBe(
      "text",
    )
  })

  it("reduced motion → text", () => {
    expect(resolveViewMode({}, { webgl2: true, reducedMotion: true }, 5)).toBe(
      "text",
    )
  })

  it("reduced motion + explicit v=tank → tank", () => {
    expect(
      resolveViewMode({ v: "tank" }, { webgl2: true, reducedMotion: true }, 5),
    ).toBe("tank")
  })

  it("explicit v=tank does not bypass missing WebGL or empty tank", () => {
    expect(
      resolveViewMode({ v: "tank" }, { webgl2: false, reducedMotion: true }, 5),
    ).toBe("text")
    expect(
      resolveViewMode({ v: "tank" }, { webgl2: true, reducedMotion: true }, 0),
    ).toBe("text")
  })

  it("zero fish and no authored tank → text", () => {
    expect(resolveViewMode({}, capable, 0)).toBe("text")
  })

  it("zero fish with authored tank → tank", () => {
    expect(resolveViewMode({}, capable, 0, true)).toBe("tank")
  })

  it("default → tank when capable", () => {
    expect(resolveViewMode({}, capable, 3)).toBe("tank")
    expect(resolveViewMode({ v: "tank" }, capable, 3)).toBe("tank")
  })
})

describe("shouldGateOrientation", () => {
  it("gates a portrait phone in tank mode until acknowledged", () => {
    expect(shouldGateOrientation("tank", { phonePortrait: true, acknowledged: false })).toBe(true)
    expect(shouldGateOrientation("tank", { phonePortrait: true, acknowledged: true })).toBe(false)
  })

  it("never gates landscape / desktop", () => {
    expect(shouldGateOrientation("tank", { phonePortrait: false, acknowledged: false })).toBe(false)
  })

  it("never gates the text view", () => {
    expect(shouldGateOrientation("text", { phonePortrait: true, acknowledged: false })).toBe(false)
  })
})
