import { describe, expect, it } from "vitest"
import { fishAudio } from "../fishAudio"
import { fishBus } from "../fishBus"

describe("fishAudio hydro-acoustic engine", () => {
  it("initializes disabled by default for accessibility", () => {
    expect(fishAudio.isEnabled()).toBe(false)
  })

  it("toggles state and responds to bus events safely", () => {
    fishAudio.bindToBus()

    fishBus.emit("audio:toggle", { enabled: true })
    expect(fishAudio.isEnabled()).toBe(true)

    // Should not throw on FX triggers even in headless Node environment
    expect(() => {
      fishBus.emit("audio:fx", { type: "dive" })
      fishBus.emit("audio:fx", { type: "bubble" })
      fishBus.emit("audio:fx", { type: "chime" })
    }).not.toThrow()

    fishBus.emit("audio:toggle", { enabled: false })
    expect(fishAudio.isEnabled()).toBe(false)

    fishAudio.dispose()
  })
})
