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

/** Read a CSS custom property from :root (name without leading --). */
export function readCssToken(name: string, fallback = ""): string {
  if (typeof getComputedStyle !== "function" || typeof document === "undefined") {
    return fallback
  }
  const v = getComputedStyle(document.documentElement)
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
  const bgCss = readCssToken("bg", "oklch(0.18 0.018 45)")
  // Only `paper` is a light theme; cozy + neon stay night-dive.
  const light = isLightSurface(bgCss)
  const bg = tokenToHex("bg", light ? 0xe8e4dc : 0x2a241c)
  const bgSunken = tokenToHex("bg-sunken", light ? 0xd4cfc4 : 0x1c1814)
  const card = tokenToHex("card", light ? 0xf5f0e8 : 0x3a342c)
  const fg = tokenToHex("fg", light ? 0x2a241c : 0xf5f0e8)
  const fgMuted = tokenToHex("fg-muted", light ? 0x6b6358 : 0xc4b8a8)
  const accent = tokenToHex("amber", light ? 0xd97706 : 0xfbbf24)
  const cyan = tokenToHex("cyan", light ? 0x0891b2 : 0x22d3ee)
  const neon = tokenToHex("neon", light ? 0x16a34a : 0x4ade80)

  // Tint the water toward the theme's own cool accent so cozy/neon differ,
  // but never enough to stop reading as water.
  const waterBase = light ? WATER_BASE_LIGHT : WATER_BASE_DARK
  const water = mixHex(waterBase, cyan, light ? 0.18 : 0.26)
  const deep = mixHex(light ? DEEP_BASE_LIGHT : DEEP_BASE_DARK, cyan, 0.14)
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
    ambientIntensity: light ? 1.5 : 0.85,
    keyColor: sun,
    keyIntensity: light ? 2.6 : 1.9,
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
  }
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
