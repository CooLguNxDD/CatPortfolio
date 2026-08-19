/**
 * Cyber-sonar projection — world positions → unit-disc radar coordinates.
 *
 * Pure and three-free: the canvas hands over plain positions once every ~100 ms
 * (fish/fishBus.ts `tank:sonar`), the DOM widget renders the result. Blips are
 * camera-relative, so the disc rotates with the orbit and "up" on the radar is
 * always the direction the visitor is facing.
 */

import { TANK_HALF_D, TANK_HALF_W, SWIM_Y_MAX, SWIM_Y_MIN } from "@/blocks/fishTankLayout"

export interface SonarSource {
  slug: string
  species: string
  /** World position. */
  x: number
  y: number
  z: number
  /** Filter lit factor — the widget dims blips below 0.5. */
  lit?: number
  /** School cohort id, so the widget can group blips. */
  school?: number
}

export interface SonarBlip {
  slug: string
  species: string
  school: number
  /** Disc coordinates in [-1, 1]; (0,0) is the camera target, -v is forward. */
  u: number
  v: number
  /** Distance from disc centre, 0..1 (already clamped to the rim). */
  radius: number
  /** 0 = surface, 1 = seabed. */
  depth01: number
  lit: number
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(1, v))
}

/**
 * Project specimens onto the radar disc.
 *
 * @param sources   fish world positions
 * @param cameraYaw orbit yaw in radians (the canvas value, not the camera's own
 *                  rotation) — rotating by -yaw puts the view direction at -v
 * @param center    disc origin in world space (the camera orbit target)
 */
export function projectSonarBlips(
  sources: SonarSource[],
  cameraYaw: number,
  center: { x: number; z: number } = { x: 0, z: 0 },
  target?: SonarBlip[],
): SonarBlip[] {
  const yaw = Number.isFinite(cameraYaw) ? cameraYaw : 0
  const sin = Math.sin(-yaw)
  const cos = Math.cos(-yaw)
  // Normalise against the tank footprint so a blip at the glass sits on the
  // rim. Both constants are non-zero today, but guard against a future
  // zero-size tank config turning this into a division by zero.
  const spanX = TANK_HALF_W || 1
  const spanZ = TANK_HALF_D || 1
  const band = Math.max(1e-6, SWIM_Y_MAX - SWIM_Y_MIN)

  const out = target ?? new Array<SonarBlip>(sources.length)
  out.length = sources.length

  for (let i = 0; i < sources.length; i++) {
    const s = sources[i]!
    const dx = (s.x - center.x) / spanX
    const dz = (s.z - center.z) / spanZ
    // Rotate into camera space, then flip Z so "ahead" reads as up on screen.
    const u = dx * cos - dz * sin
    const v = -(dx * sin + dz * cos)
    const len = Math.hypot(u, v)
    const scale = len > 1 ? 1 / len : 1
    const existing = out[i]
    if (existing) {
      existing.slug = s.slug
      existing.species = s.species
      existing.school = s.school ?? 0
      existing.u = u * scale
      existing.v = v * scale
      existing.radius = Math.min(1, len)
      existing.depth01 = clamp01((SWIM_Y_MAX - s.y) / band)
      existing.lit = s.lit == null ? 1 : clamp01(s.lit)
    } else {
      out[i] = {
        slug: s.slug,
        species: s.species,
        school: s.school ?? 0,
        u: u * scale,
        v: v * scale,
        radius: Math.min(1, len),
        depth01: clamp01((SWIM_Y_MAX - s.y) / band),
        lit: s.lit == null ? 1 : clamp01(s.lit),
      }
    }
  }

  return out
}

/** Convert a blip to pixel coordinates inside a square SVG viewport. */
export function blipToPixels(
  blip: Pick<SonarBlip, "u" | "v">,
  size: number,
  padding = 6,
): { cx: number; cy: number } {
  const r = Math.max(1, size / 2 - padding)
  return {
    cx: size / 2 + blip.u * r,
    cy: size / 2 + blip.v * r,
  }
}

/** Group blips by school cohort — the widget draws one hull ring per cohort. */
export function groupBySchool(blips: SonarBlip[]): Map<number, SonarBlip[]> {
  const out = new Map<number, SonarBlip[]>()
  for (const b of blips) {
    const list = out.get(b.school)
    if (list) list.push(b)
    else out.set(b.school, [b])
  }
  return out
}
