import { afterEach, describe, expect, it, vi } from "vitest"
import {
  accentScopeElement,
  liftHex,
  mixHex,
  isLightSurface,
  oklchLightness,
  readCssToken,
  resolveTankQuality,
} from "../fishTankTokens"

describe("fishTankTokens colour helpers", () => {
  it("parses oklch lightness", () => {
    expect(oklchLightness("oklch(0.18 0.018 45)")).toBeCloseTo(0.18)
    expect(isLightSurface("oklch(0.97 0.012 80)")).toBe(true)
    expect(isLightSurface("oklch(0.18 0.018 45)")).toBe(false)
    expect(isLightSurface("oklch(0.958 0.006 265)")).toBe(true)
    expect(isLightSurface("oklch(0.243 0.030 284)")).toBe(false)
  })

  it("lifts hex toward white", () => {
    const mid = liftHex(0x000000, 0.5)
    expect(mid).toBe(0x808080)
    expect(liftHex(0xff0000, 0)).toBe(0xff0000)
  })

  it("mixes hex colours", () => {
    expect(mixHex(0x000000, 0xffffff, 0.5)).toBe(0x808080)
    expect(mixHex(0xff0000, 0x0000ff, 0)).toBe(0xff0000)
  })
})

/**
 * This test file runs in vitest's default "node" environment (no jsdom
 * dependency installed) — build the minimal fake DOM surface
 * `accentScopeElement` / `readCssToken` actually touch: a document with
 * `querySelector` + `documentElement`, elements carrying a settable style
 * map, and a `getComputedStyle` that reads that map.
 */
type FakeEl = {
  vars: Map<string, string>
  attr?: string
  style: { setProperty: (k: string, v: string) => void }
}

function makeFakeEl(attr?: string): FakeEl {
  const vars = new Map<string, string>()
  return { vars, attr, style: { setProperty: (k, v) => vars.set(k, v) } }
}

describe("accent scope", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("reads --amber from the [data-accent] shell, not <html>", () => {
    const html = makeFakeEl()
    const shell = makeFakeEl("cyan")
    html.style.setProperty("--amber", "oklch(0.8 0.1 50)")
    shell.style.setProperty("--amber", "oklch(0.85 0.08 210)")

    vi.stubGlobal("document", {
      documentElement: html,
      querySelector: (sel: string) => (sel === "[data-accent]" ? shell : null),
    })
    vi.stubGlobal("getComputedStyle", (el: FakeEl) => ({
      getPropertyValue: (name: string) => el.vars.get(name) ?? "",
    }))

    expect(accentScopeElement()).toBe(shell)
    expect(readCssToken("amber")).toBe("oklch(0.85 0.08 210)")
  })

  it("falls back to <html> when no [data-accent] shell is mounted", () => {
    const html = makeFakeEl()
    html.style.setProperty("--amber", "oklch(0.8 0.1 50)")

    vi.stubGlobal("document", {
      documentElement: html,
      querySelector: () => null,
    })
    vi.stubGlobal("getComputedStyle", (el: FakeEl) => ({
      getPropertyValue: (name: string) => el.vars.get(name) ?? "",
    }))

    expect(accentScopeElement()).toBe(html)
    expect(readCssToken("amber")).toBe("oklch(0.8 0.1 50)")
  })
})

/** Stub matchMedia so a query in `matching` reports true. */
function stubMatchMedia(matching: string[]) {
  vi.stubGlobal(
    "matchMedia",
    (q: string) => ({ matches: matching.includes(q) }) as MediaQueryList,
  )
}

describe("resolveTankQuality", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("falls back to full quality when matchMedia is unavailable", () => {
    // jsdom has no matchMedia by default — must not throw.
    const q = resolveTankQuality()
    expect(q.tier).toBe("high")
    expect(q.octaves).toBe(4)
    expect(q.timeScale).toBe(1)
  })

  it("drops to the low tier on coarse pointers", () => {
    stubMatchMedia(["(pointer: coarse)"])
    const q = resolveTankQuality()
    expect(q.tier).toBe("low")
    expect(q.rayCount).toBeLessThan(9)
    expect(q.wobble).toBe(false)
  })

  it("freezes shader time and the wobble for reduced motion", () => {
    stubMatchMedia(["(prefers-reduced-motion: reduce)"])
    const q = resolveTankQuality()
    expect(q.timeScale).toBe(0)
    expect(q.wobble).toBe(false)
  })
})
