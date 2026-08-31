/**
 * Theme helpers for the fish tank.
 * Species → accent tokens; oklch CSS vars → RGB for three.js (browser resolve).
 */

import type { DomainIdType } from "@/content/schema"

/** Species (domain) → CSS custom property name (without --). */
export const SPECIES_TOKEN: Record<DomainIdType, string> = {
  ai: "accent-ai",
  devops: "accent-devops",
  mobile: "accent-mobile",
  platform: "accent-platform",
}

/** Human labels for domain chips (tank3d DOMAINS labels, WelTel taxonomy). */
export const DOMAIN_LABEL: Record<string, string> = {
  ai: "AI & Agents",
  devops: "DevOps & Infra",
  mobile: "Mobile",
  platform: "Platform",
  infra: "DevOps & Infra",
  web: "Fullstack",
  data: "Data",
}

/**
 * 3-letter nameplate tickers. Do not slice `species` — `devops`.slice(0,3)
 * is `DEV` and reads as a build badge on the public tank.
 */
export const SPECIES_TICKER: Record<string, string> = {
  ai: "AI",
  devops: "OPS",
  mobile: "APP",
  platform: "PLT",
  infra: "OPS",
  web: "WEB",
  data: "DAT",
}

export function speciesTicker(species: string): string {
  return SPECIES_TICKER[species] || species.slice(0, 3).toUpperCase()
}

/** Soft fin variant token for a species. */
export function speciesSoftToken(species: DomainIdType): string {
  return `${SPECIES_TOKEN[species]}-soft`
}

/**
 * Parse OKLCH lightness from a CSS color string.
 * Returns null when the format is unrecognised.
 */
export function oklchLightness(color: string | undefined | null): number | null {
  if (!color || typeof color !== "string") return null
  const m = color.trim().match(/^oklch\(\s*([0-9.]+)/i)
  if (!m) return null
  const L = Number(m[1])
  return Number.isFinite(L) ? L : null
}

/**
 * True when the surface is light (paper theme etc.).
 * Garbage / unparseable → dark-safe default (false).
 */
export function isLightSurface(bg: string | undefined | null, threshold = 0.6): boolean {
  const L = oklchLightness(bg)
  if (L == null) return false
  return L > threshold
}

/** Fallback hex colours when CSS vars are unavailable (tests / SSR). */
export const SPECIES_FALLBACK_HEX: Record<DomainIdType, string> = {
  ai: "#fbbf24",
  devops: "#4ade80",
  mobile: "#f472b6",
  platform: "#22d3ee",
}

export const ALL_DOMAIN_IDS: DomainIdType[] = ["ai", "devops", "mobile", "platform"]

/**
 * Element whose computed style carries both theme vars (inherited from
 * <html>) and the picked accent — App.tsx puts `data-accent` on the app
 * shell `<div>`, not `<html>` (ThemeProvider's inline theme vars on
 * documentElement would otherwise beat an attribute selector there), so
 * this is where --amber actually resolves to the visitor's chosen accent.
 * Falls back to <html> when the shell hasn't mounted yet (tests / SSR).
 */
export function accentScopeElement(): HTMLElement {
  const shell =
    typeof document.querySelector === "function"
      ? document.querySelector<HTMLElement>("[data-accent]")
      : null
  return shell ?? document.documentElement
}

/** Read a CSS custom property from the accent scope (name without leading --). */
export function readCssToken(name: string, fallback = "", el?: HTMLElement): string {
  if (typeof getComputedStyle !== "function" || typeof document === "undefined") {
    return fallback
  }
  const target = el ?? accentScopeElement()
  const v = getComputedStyle(target)
    .getPropertyValue(name.startsWith("--") ? name : `--${name}`)
    .trim()
  return v || fallback
}

/**
 * Convert any CSS color (oklch, color-mix, hex, rgb) → 0xRRGGBB.
 * Uses the browser's color engine via canvas fillStyle — three.js cannot parse oklch.
 */
export function cssColorToHex(css: string | null | undefined, fallback = 0x888888): number {
  if (!css || typeof document === "undefined") return fallback
  const raw = css.trim()
  if (!raw) return fallback
  // Fast path for #rgb / #rrggbb
  const hexMatch = raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (hexMatch) {
    let h = hexMatch[1]
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
    return Number.parseInt(h, 16)
  }
  try {
    const canvas = document.createElement("canvas")
    canvas.width = canvas.height = 1
    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return fallback
    ctx.fillStyle = "#000000"
    ctx.fillStyle = raw
    // Resolved form is usually #rrggbb when the browser understands the colour.
    const resolved = String(ctx.fillStyle)
    if (resolved.startsWith("#") && resolved.length === 7) {
      return Number.parseInt(resolved.slice(1), 16)
    }
    // Fallback: paint + readback (handles rgb() resolved strings).
    ctx.fillStyle = raw
    ctx.fillRect(0, 0, 1, 1)
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
    return (r << 16) | (g << 8) | b
  } catch {
    return fallback
  }
}

/** Token name (without --) → 0xRRGGBB. */
export function tokenToHex(name: string, fallback: number): number {
  const css = readCssToken(name)
  if (!css) return fallback
  // var(--other) chains — resolve via a temporary element if needed
  if (css.startsWith("var(")) {
    return cssColorToHex(readCssToken(name.replace(/^--?/, ""), ""), fallback)
  }
  return cssColorToHex(css, fallback)
}

/** Lift a hex colour toward white (amount 0..1) so materials stay readable under ambient. */
export function liftHex(hex: number, amount: number): number {
  const a = Math.max(0, Math.min(1, amount))
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  const lr = Math.round(r + (255 - r) * a)
  const lg = Math.round(g + (255 - g) * a)
  const lb = Math.round(b + (255 - b) * a)
  return (lr << 16) | (lg << 8) | lb
}

/** Theme-driven aquarium palette for three.js. */
export interface TankThemePalette {
  light: boolean
  bg: number
  bgSunken: number
  card: number
  fg: number
  fgMuted: number
  accent: number
  cyan: number
  neon: number
  /** Ambient light colour + intensity */
  ambientColor: number
  ambientIntensity: number
  keyColor: number
  keyIntensity: number
  fillColor: number
  fillIntensity: number
  hemiSky: number
  hemiGround: number
  hemiIntensity: number
  fogColor: number
  fogDensity: number
  water: number
  floor: number
  rock: number
  bubble: number
  glass: number
  /** Deep-water tone at the far end of the column (backdrop + depth gradient). */
  deep: number
  /** Sunlit shaft / caustic colour cast through the surface. */
  sun: number
  /** Drifting particulate ("marine snow"). */
  motes: number
  /** Plant life — seaweed and soft coral. */
  weed: number
  /** Caustic light pattern strength on the seabed (0..1). */
  causticStrength: number
  /** God-ray opacity through the surface (0..1). */
  rayStrength: number
  /**
   * Beer-Lambert extinction per world unit, [r, g, b]. Red dies first, blue
   * reaches the bed — see fish/shaders/absorption.ts.
   */
  sigma: [number, number, number]
  /** Which half of the circadian cycle this palette was resolved for. */
  phase: CircadianPhase
  /** Global swim/beat multiplier — night fauna drift instead of darting. */
  faunaTimeScale: number
  /** Sky-dome zenith colour. */
  skyTop: number
  /** Sky-dome colour near the waterline. */
  skyHorizon: number
  /** Sun (day) / moon (night) disc colour. */
  sunColor: number
  /** Angular size of the sun/moon disc, as a dot-product threshold (bigger = larger disc). */
  sunSize: number
  /** Star field density, 0 (day, no stars) .. 1 (full night sky). */
  starDensity: number
  /** Cloud-layer opacity, 0 (night, no clouds) .. 1. */
  cloudStrength: number
}

/**
 * World-space direction to the sun/moon, shared by the sky dome, the water
 * surface's specular highlight, and the key `DirectionalLight` — one light
 * source, three consumers, so the glint on the water always sits under
 * whatever is actually in the sky.
 */
export const SUN_DIR = { x: 0.25, y: 1.0, z: 0.35 } as const

/** Daylight lagoon vs midnight abyss. */
export type CircadianPhase = "day" | "night"

/** User-selectable circadian mode; `auto` follows the local clock. */
export type CircadianMode = "auto" | CircadianPhase

/** Local hours counted as daylight (inclusive start, exclusive end). */
const DAY_START_HOUR = 7
const DAY_END_HOUR = 19

/**
 * Resolve the circadian phase. An explicit mode always wins; `auto` (or an
 * unset mode) reads the local clock so an evening visitor lands in the abyss.
 */
export function resolveCircadianPhase(
  date: Date = new Date(),
  mode: CircadianMode = "auto",
): CircadianPhase {
  if (mode === "day" || mode === "night") return mode
  const hour = date.getHours()
  return hour >= DAY_START_HOUR && hour < DAY_END_HOUR ? "day" : "night"
}

/**
 * Underwater base tones. Deliberately NOT derived from `--bg`: the page
 * background is warm parchment/brown, and using it for the water made the tank
 * read as a dusty room. The tank is always underwater; the theme supplies the
 * *tint* and the lighting environment, not the medium.
 */
const WATER_BASE_DARK = 0x0a2b3d
const WATER_BASE_LIGHT = 0x9fd8e6
const DEEP_BASE_DARK = 0x02121d
const DEEP_BASE_LIGHT = 0x4f9fba

/** Sample live CSS theme tokens into a three-safe underwater palette. */
export function resolveTankThemePalette(): TankThemePalette {
  const bgCss = readCssToken("bg", "oklch(0.243 0.030 284)")
  // Latte / paper parse as light from --bg OKLCH; garbage → dark-safe.
  const light = isLightSurface(bgCss)
  const bg = tokenToHex("bg", light ? 0xe8e4dc : 0x2a241c)
  const bgSunken = tokenToHex("bg-sunken", light ? 0xd4cfc4 : 0x1c1814)
  const card = tokenToHex("card", light ? 0xf5f0e8 : 0x3a342c)
  const fg = tokenToHex("fg", light ? 0x2a241c : 0xf5f0e8)
  const fgMuted = tokenToHex("fg-muted", light ? 0x6b6358 : 0xc4b8a8)
  const accent = tokenToHex("amber", light ? 0xd97706 : 0xfbbf24)
  const cyan = tokenToHex("cyan", light ? 0x0891b2 : 0x22d3ee)
  const neon = tokenToHex("neon", light ? 0x16a34a : 0x4ade80)

  // Optional --water / --water-deep tokens; cozy/neon/paper keep the formula.
  const waterTok = readCssToken("water", "")
  const deepTok = readCssToken("water-deep", "")
  const waterBase = waterTok
    ? cssColorToHex(waterTok, light ? WATER_BASE_LIGHT : WATER_BASE_DARK)
    : light
      ? WATER_BASE_LIGHT
      : WATER_BASE_DARK
  const deepBase = deepTok
    ? cssColorToHex(deepTok, light ? DEEP_BASE_LIGHT : DEEP_BASE_DARK)
    : light
      ? DEEP_BASE_LIGHT
      : DEEP_BASE_DARK
  const water = mixHex(waterBase, cyan, light ? 0.18 : 0.26)
  const deep = mixHex(deepBase, cyan, 0.14)
  const sun = light ? liftHex(cyan, 0.72) : liftHex(cyan, 0.5)

  return {
    light,
    bg,
    bgSunken,
    card,
    fg,
    fgMuted,
    accent,
    cyan,
    neon,
    deep,
    sun,
    // Two lighting environments, one medium.
    // light  = shallow sunlit lagoon: high key, thin haze, bright sand.
    // dark   = night dive: dim ambient, hard cyan shaft, bioluminescent accents.
    ambientColor: light ? liftHex(water, 0.45) : mixHex(water, cyan, 0.3),
    ambientIntensity: light ? 1.2 : 0.85,
    keyColor: sun,
    // Fish materials carry a floor emissiveIntensity for the night bioluminescent
    // read (see speciesMeshes.ts::makeMaterials); at the old daylight key
    // (2.6 * 1.2 = 3.12) that floor plus a hard directional specular blew
    // scales out to a washed-out shine instead of a sunlit sheen.
    keyIntensity: light ? 1.7 : 1.9,
    fillColor: light ? liftHex(water, 0.3) : mixHex(deep, cyan, 0.35),
    fillIntensity: light ? 0.9 : 1.35,
    hemiSky: light ? liftHex(sun, 0.35) : liftHex(cyan, 0.25),
    hemiGround: light ? liftHex(water, 0.15) : deep,
    hemiIntensity: light ? 1.1 : 0.75,
    fogColor: light ? liftHex(water, 0.22) : deep,
    // Haze thickens with depth in the shader-free way: FogExp2 + a deep backdrop.
    fogDensity: light ? 0.011 : 0.019,
    water,
    floor: light ? 0xd9c9a3 : mixHex(0x243a44, water, 0.35),
    rock: light ? 0x9a8f7a : mixHex(deep, 0x000000, 0.25),
    // Dark mode leans on additive particles for its bioluminescent read, so
    // both clouds are lifted much closer to white there than in daylight.
    bubble: light ? liftHex(sun, 0.4) : liftHex(cyan, 0.75),
    // Glass reads as a faint accent-tinted edge, not a hard amber cage.
    glass: mixHex(accent, sun, light ? 0.5 : 0.35),
    motes: light ? liftHex(water, 0.55) : liftHex(cyan, 0.62),
    weed: light ? mixHex(neon, 0x3f6b3a, 0.45) : mixHex(neon, deep, 0.5),
    causticStrength: light ? 0.55 : 0.38,
    // Per-surface opacity, and they overlap — keep it barely there.
    rayStrength: light ? 0.035 : 0.05,
    // Shallow lagoon water is clearer than the open column, so daylight loses
    // red more slowly than a night dive does.
    sigma: light ? [0.28, 0.06, 0.015] : [0.35, 0.08, 0.02],
    phase: "day",
    faunaTimeScale: 1,
    // Sky is keyed by theme mode, not the circadian clock — it's baked per
    // theme, not animated over a day: light themes get a sunny lagoon sky,
    // dark themes get a star field. See applyCircadian, which now leaves
    // these fields alone.
    //
    // Light: zenith is the theme's cool accent lifted toward true sky blue;
    // horizon is the same `sun` glow the water/god-rays already use, so the
    // dome and the surface highlight read as lit by the same source.
    //
    // Dark: zenith/horizon sink into the same abyss tone as the water, and
    // the sun shrinks + pales into a moon (a smaller disc needs a *higher*
    // dot-product threshold).
    skyTop: light ? mixHex(liftHex(cyan, 0.15), 0x4aa8e6, 0.45) : mixHex(deep, 0x040a1a, 0.6),
    skyHorizon: light ? liftHex(sun, 0.55) : mixHex(deep, 0x040a1a, 0.35),
    // The theme's own accent color as the sun; the moon leans on the cooler
    // cyan instead so it doesn't read as a second, dimmer sun.
    sunColor: light ? liftHex(accent, 0.35) : liftHex(cyan, 0.6),
    sunSize: light ? 0.9985 : 0.9995,
    starDensity: light ? 0 : 1,
    cloudStrength: light ? 0.6 : 0,
  }
}

// applyCircadian moved to ./fishTankCircadian.ts (circadian-specific color
// logic, split out of this general theme-tokens file) — import it from
// there directly; kept out of this file's exports to avoid a circular
// import (fishTankCircadian imports mixHex/TankThemePalette from here).

/** Render budget for the tank's procedural shaders. */
export interface TankQuality {
  tier: "low" | "high"
  /** fbm octave count compiled into every tank shader. */
  octaves: number
  /** God-ray cone count. */
  rayCount: number
  /** Water plane segment counts [width, depth]. */
  waterSegments: [number, number]
  /** Fullscreen underwater wobble pass enabled. */
  wobble: boolean
  /** Multiplier on shader time — 0 freezes animation for reduce-motion users. */
  timeScale: number
}

const HIGH_QUALITY: TankQuality = {
  tier: "high",
  octaves: 4,
  rayCount: 9,
  waterSegments: [64, 48],
  wobble: true,
  timeScale: 1,
}

const LOW_QUALITY: TankQuality = {
  tier: "low",
  octaves: 3,
  rayCount: 5,
  waterSegments: [32, 24],
  wobble: false,
  timeScale: 1,
}

/** Safe media-query probe — SSR and bare-node tests have no matchMedia. */
function prefers(query: string): boolean {
  const mm = (globalThis as { matchMedia?: (q: string) => MediaQueryList }).matchMedia
  if (typeof mm !== "function") return false
  try {
    return mm.call(globalThis, query).matches
  } catch {
    return false
  }
}

/**
 * Resolve the shader budget from the device and the user's motion preference.
 * SSR / tests fall back to the full-quality defaults without throwing.
 */
export function resolveTankQuality(): TankQuality {
  const win = (globalThis as { devicePixelRatio?: number; innerWidth?: number })

  const coarse = prefers("(pointer: coarse)")
  const dense = (win.devicePixelRatio || 1) > 2 && (win.innerWidth || 1280) < 900
  const base = coarse || dense ? { ...LOW_QUALITY } : { ...HIGH_QUALITY }

  if (prefers("(prefers-reduced-motion: reduce)")) {
    base.timeScale = 0
    base.wobble = false
  }
  return base
}

/** Linear mix of two 0xRRGGBB colours (t = weight of b). */
export function mixHex(a: number, b: number, t: number): number {
  const u = Math.max(0, Math.min(1, t))
  const ar = (a >> 16) & 0xff
  const ag = (a >> 8) & 0xff
  const ab = a & 0xff
  const br = (b >> 16) & 0xff
  const bg = (b >> 8) & 0xff
  const bb = b & 0xff
  const r = Math.round(ar + (br - ar) * u)
  const g = Math.round(ag + (bg - ag) * u)
  const bl = Math.round(ab + (bb - ab) * u)
  return (r << 16) | (g << 8) | bl
}
