import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  createFishBus,
  dispatchFishFocus,
  dispatchFishSpawn,
  fishBus,
  FISH_FOCUS_EVENT,
  FISH_SPAWN_EVENT,
} from "../fishBus"

describe("fishBus", () => {
  it("exports expected DOM custom event string constants", () => {
    expect(FISH_FOCUS_EVENT).toBe("catportfolio:fish:focus")
    expect(FISH_SPAWN_EVENT).toBe("catportfolio:fish:spawn")
  })

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

  describe("dispatch functions with DOM window bridge", () => {
    let originalWindow: unknown
    let originalCustomEvent: unknown
    let dispatchEventSpy: ReturnType<typeof vi.fn>

    beforeEach(() => {
      originalWindow = (globalThis as Record<string, unknown>).window
      originalCustomEvent = (globalThis as Record<string, unknown>).CustomEvent

      dispatchEventSpy = vi.fn()
      ;(globalThis as Record<string, unknown>).window = {
        dispatchEvent: dispatchEventSpy,
      }
      ;(globalThis as Record<string, unknown>).CustomEvent = class MockCustomEvent {
        type: string
        detail: unknown
        constructor(type: string, init?: { detail?: unknown }) {
          this.type = type
          this.detail = init?.detail
        }
      }
    })

    afterEach(() => {
      ;(globalThis as Record<string, unknown>).window = originalWindow
      ;(globalThis as Record<string, unknown>).CustomEvent = originalCustomEvent
    })

    it("dispatches DOM custom event and emits on bus for dispatchFishFocus", () => {
      const pickHandler = vi.fn()
      const focusHandler = vi.fn()

      fishBus.on("fish:pick", pickHandler)
      fishBus.on("fish:focus", focusHandler)

      try {
        dispatchFishFocus("weltel-ai")
        expect(pickHandler).toHaveBeenCalledWith({ slug: "weltel-ai" })
        expect(focusHandler).toHaveBeenCalledWith({ slug: "weltel-ai" })
        expect(dispatchEventSpy).toHaveBeenCalledTimes(1)
        const event = dispatchEventSpy.mock.calls[0][0] as { type: string; detail: unknown }
        expect(event.type).toBe(FISH_FOCUS_EVENT)
        expect(event.detail).toEqual({ slug: "weltel-ai" })
      } finally {
        fishBus.off("fish:pick", pickHandler)
        fishBus.off("fish:focus", focusHandler)
      }
    })

    it("dispatches DOM custom event and emits on bus for dispatchFishSpawn", () => {
      const spawnHandler = vi.fn()

      fishBus.on("fish:spawn", spawnHandler)

      const specimen = {
        slug: "test-fish",
        title: "Test Fish",
        species: "ai",
        size: 1,
        depth: 0.1,
        speed: 0.5,
        glow: 1,
        school: 0,
        tags: [],
        blurb: "Test",
      }

      try {
        dispatchFishSpawn(specimen)
        expect(spawnHandler).toHaveBeenCalledWith({ fish: specimen })
        expect(dispatchEventSpy).toHaveBeenCalledTimes(1)
        const event = dispatchEventSpy.mock.calls[0][0] as { type: string; detail: unknown }
        expect(event.type).toBe(FISH_SPAWN_EVENT)
        expect(event.detail).toEqual({ fish: specimen })
      } finally {
        fishBus.off("fish:spawn", spawnHandler)
      }
    })

    it("handles empty/null slug or fish gracefully without throwing or dispatching", () => {
      dispatchFishFocus("")
      dispatchFishSpawn(null as unknown as { slug: string; title: string; species: string; size: number; depth: number; speed: number; glow: number; school: number; tags: string[]; blurb: string })
      expect(dispatchEventSpy).not.toHaveBeenCalled()
    })
  })
})
