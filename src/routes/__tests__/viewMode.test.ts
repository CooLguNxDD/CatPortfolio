import { describe, it, expect } from "vitest"
import { resolveViewMode } from "../viewMode"

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

  it("zero fish → text", () => {
    expect(resolveViewMode({}, capable, 0)).toBe("text")
  })

  it("default → tank when capable", () => {
    expect(resolveViewMode({}, capable, 3)).toBe("tank")
    expect(resolveViewMode({ v: "tank" }, capable, 3)).toBe("tank")
  })
})
