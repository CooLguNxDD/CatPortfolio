import { describe, expect, it, vi } from "vitest"
import { createFishBus } from "../fishBus"

describe("fishBus", () => {
  it("delivers typed emit/on for a command event", () => {
    const bus = createFishBus()
    const handler = vi.fn()
    bus.on("fish:pick", handler)
    bus.emit("fish:pick", { slug: "weltel-ai" })
    expect(handler).toHaveBeenCalledWith({ slug: "weltel-ai" })
  })

  it("delivers a void-payload event with no argument", () => {
    const bus = createFishBus()
    const handler = vi.fn()
    bus.on("tank:dive", handler)
    bus.emit("tank:dive")
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it("stops delivering after off() — no leaks", () => {
    const bus = createFishBus()
    const handler = vi.fn()
    bus.on("tank:progress", handler)
    bus.emit("tank:progress", 0.4)
    bus.off("tank:progress", handler)
    bus.emit("tank:progress", 0.9)
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(0.4)
  })

  it("keeps separate instances isolated (test bus never leaks into another)", () => {
    const a = createFishBus()
    const b = createFishBus()
    const handlerA = vi.fn()
    const handlerB = vi.fn()
    a.on("fish:release", handlerA)
    b.on("fish:release", handlerB)
    a.emit("fish:release")
    expect(handlerA).toHaveBeenCalledTimes(1)
    expect(handlerB).not.toHaveBeenCalled()
  })

  it("supports null payloads for fish:anchor (release)", () => {
    const bus = createFishBus()
    const handler = vi.fn()
    bus.on("fish:anchor", handler)
    bus.emit("fish:anchor", { x: 1, y: 2, r: 3, w: 4, h: 5 })
    bus.emit("fish:anchor", null)
    expect(handler).toHaveBeenNthCalledWith(1, { x: 1, y: 2, r: 3, w: 4, h: 5 })
    expect(handler).toHaveBeenNthCalledWith(2, null)
  })
})
