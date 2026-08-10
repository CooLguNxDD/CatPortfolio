/**
 * Pure swim / camera math for FishTankCanvas (DOM-free, unit-tested).
 * Ported from the catportfolio-fishtank tank3d prototype.
 */

import { hashToUnit } from "./scene2dLayout"

/**
 * Tank volume (world units). Surface sits near the top of the glass;
 * floor is the true bed — never mid-frame.
 */
export const WATER_Y = 12
/**
 * Seabed Y. The column is deliberately deep and wide — a tight box reads as a
 * desk aquarium; submerged scene 2 should feel like open water with the surface
 * far above and the bed falling away below.
 */
export const FLOOR_Y = -30
export const TANK_HEIGHT = WATER_Y - FLOOR_Y
export const TANK_CENTER_Y = (WATER_Y + FLOOR_Y) / 2
export const TANK_HALF_W = 38
export const TANK_HALF_D = 26
/** Usable swim band (keep fish off glass/floor/surface). */
export const SWIM_Y_MAX = WATER_Y - 2.2
export const SWIM_Y_MIN = FLOOR_Y + 3.5
export const MAX_ORBIT_RADIUS = 62
export const MIN_ORBIT_RADIUS = 8
/** Where the cat perches on the rim. Shared by the mesh and the surface camera. */
export const CAT_X = 12
export const CAT_Y = WATER_Y + 1
export const MAX_PITCH = 1.05
export const MIN_PITCH = -0.45

export interface FishSpecimenInput {
  slug: string
  title: string
  species: string
  size: number
  depth: number
  speed: number
  glow: number
  school: number
  tags?: string[]
  blurb?: string
  description?: string
  metrics?: { label: string; value: string }[]
  link?: { label: string; href: string } | string
}

export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface FishPose {
  position: Vec3
  yaw: number
  scale: number
  /** Center of the elliptical swim path (for schooling cohesion). */
  center: Vec3
}

export interface OrbitState {
  yaw: number
  pitch: number
  radius: number
  target: Vec3
}

export function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v))
}

export function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0.5
  return clamp(v, 0, 1)
}

/** Depth 0 → near surface, 1 → near bed. Monotonic within swim band. */
export function depthToY(depth: number): number {
  const d = clamp01(depth)
  return SWIM_Y_MAX - d * (SWIM_Y_MAX - SWIM_Y_MIN)
}

/** Size 0..1 → mesh scale (tuned against the tank volume, not unit space). */
export function sizeToScale(size: number): number {
  return 1.15 + clamp01(size) * 1.75
}

/** Deterministic swim-path seed from slug (stable across runs). */
export function fishPathSeed(slug: string): {
  phase: number
  cx: number
  cz: number
  rx: number
  rz: number
} {
  const u = hashToUnit(slug)
  const v = hashToUnit(`${slug}:z`)
  const w = hashToUnit(`${slug}:r`)
  const p = hashToUnit(`${slug}:ph`)
  // Spread derives from the tank volume so widening the tank spreads the shoal
  // instead of leaving everyone clustered in the middle third.
  return {
    phase: p * Math.PI * 2,
    cx: (u - 0.5) * (TANK_HALF_W * 1.15),
    cz: (v - 0.5) * (TANK_HALF_D * 1.1),
    rx: TANK_HALF_W * (0.14 + w * 0.16),
    rz: TANK_HALF_D * (0.12 + hashToUnit(`${slug}:rz`) * 0.14),
  }
}

/**
 * School cohesion: same school id shares a lane bias on X so fish cluster.
 */
export function schoolOffset(school: number, slug: string): number {
  const s = Math.max(0, Math.floor(school) || 0)
  if (s <= 0) return 0
  const lane = ((s * 7) % 11) - 5
  // Lane width scales with the tank so schools separate in open water.
  return lane * (TANK_HALF_W * 0.055) + (hashToUnit(`${slug}:lane`) - 0.5) * 1.8
}

/** Compute one fish pose at time t (seconds). */
export function computeFishPose(
  fish: FishSpecimenInput,
  t: number,
  opts?: { timeScale?: number; focused?: boolean },
): FishPose {
  const timeScale = opts?.timeScale ?? 1
  const size = clamp01(fish.size)
  const speed = clamp01(fish.speed)
  const depth = clamp01(fish.depth)
  const seed = fishPathSeed(fish.slug)
  const y0 = depthToY(depth)
  const cx = seed.cx + schoolOffset(fish.school, fish.slug)
  const cz = seed.cz
  const scale = sizeToScale(size)

  if (opts?.focused) {
    return {
      position: { x: cx, y: y0, z: cz },
      yaw: t * 0.45 * timeScale,
      scale: scale * 1.35,
      center: { x: cx, y: y0, z: cz },
    }
  }

  const ph = t * speed * 0.75 * timeScale + seed.phase
  const nx = cx + Math.sin(ph) * seed.rx
  const nz = cz + Math.cos(ph * 0.7) * seed.rz
  const ny = y0 + Math.sin(ph * 1.6) * 0.7
  // Approximate heading from path derivative
  const nx2 = cx + Math.sin(ph + 0.05) * seed.rx
  const nz2 = cz + Math.cos((ph + 0.05) * 0.7) * seed.rz
  const yaw = Math.atan2(nx2 - nx, nz2 - nz)

  return {
    position: {
      x: clamp(nx, -TANK_HALF_W + 1, TANK_HALF_W - 1),
      y: clamp(ny, SWIM_Y_MIN, SWIM_Y_MAX),
      z: clamp(nz, -TANK_HALF_D + 1, TANK_HALF_D - 1),
    },
    yaw,
    scale,
    center: { x: cx, y: y0, z: cz },
  }
}

/**
 * Stage progress 0 (rim/cat above water) → 1 (mid-water look-at).
 * Dive target is mid-column so the floor stays low in frame, not centred.
 */
export function stageOrbitTarget(progress: number): Vec3 {
  const prog = clamp01(progress)
  // Rim target sits just above the waterline and biased right of world origin:
  // the hero card occupies the left half of the viewport, so the cat (placed to
  // the right of origin) has to land in the free half, fully in frame.
  // Surface: aim straight at the cat's perch (CAT_X, just above the waterline)
  // so it is centred in frame by construction rather than by offset guesswork.
  // The hero card overlays the left half of the viewport on top of it.
  const rimY = WATER_Y + 1
  const diveY = TANK_CENTER_Y + 1.5 // slightly above true mid → more water below
  // Aim left of the cat by roughly half the frustum width so the cat lands in
  // the right third — the half of the viewport the hero card does not cover.
  return {
    x: (1 - prog) * (CAT_X - 16),
    y: rimY + (diveY - rimY) * prog,
    z: 0,
  }
}

/** Camera position from spherical orbit around target. */
export function cameraFromOrbit(orbit: OrbitState): Vec3 {
  const pitch = clamp(orbit.pitch, MIN_PITCH, MAX_PITCH)
  const radius = clamp(orbit.radius, MIN_ORBIT_RADIUS, MAX_ORBIT_RADIUS)
  return {
    x: orbit.target.x + Math.sin(orbit.yaw) * Math.cos(pitch) * radius,
    y: orbit.target.y + Math.sin(pitch) * radius,
    z: orbit.target.z + Math.cos(orbit.yaw) * Math.cos(pitch) * radius,
  }
}

/**
 * View-offset shift for locked specimen (0..1).
 * Full shift places the fish in the left third for the dossier rail.
 */
export function viewOffsetX(shift: number, width: number): number {
  const s = clamp01(shift)
  return width * 0.19 * s
}

/** Project world point to NDC then to CSS pixels (canvas-local). */
export function projectToScreen(
  world: Vec3,
  cameraPos: Vec3,
  lookAt: Vec3,
  fovDeg: number,
  width: number,
  height: number,
): { x: number; y: number; behind: boolean } | null {
  // Lightweight perspective projection without three.js (tests only need bounds).
  const dx = world.x - cameraPos.x
  const dy = world.y - cameraPos.y
  const dz = world.z - cameraPos.z
  // Camera looks toward lookAt; build a rough forward vector
  const fx = lookAt.x - cameraPos.x
  const fy = lookAt.y - cameraPos.y
  const fz = lookAt.z - cameraPos.z
  const fl = Math.hypot(fx, fy, fz) || 1
  const forward = { x: fx / fl, y: fy / fl, z: fz / fl }
  // Right = forward × up
  const up = { x: 0, y: 1, z: 0 }
  const rx = forward.y * up.z - forward.z * up.y
  const ry = forward.z * up.x - forward.x * up.z
  const rz = forward.x * up.y - forward.y * up.x
  const rl = Math.hypot(rx, ry, rz) || 1
  const right = { x: rx / rl, y: ry / rl, z: rz / rl }
  // True up
  const ux = right.y * forward.z - right.z * forward.y
  const uy = right.z * forward.x - right.x * forward.z
  const uz = right.x * forward.y - right.y * forward.x

  const depth = dx * forward.x + dy * forward.y + dz * forward.z
  if (depth <= 0.1) return { x: 0, y: 0, behind: true }
  const localX = dx * right.x + dy * right.y + dz * right.z
  const localY = dx * ux + dy * uy + dz * uz
  const fov = (fovDeg * Math.PI) / 180
  const sy = 1 / Math.tan(fov / 2)
  const aspect = width / Math.max(1, height)
  const ndcX = (localX * sy) / (depth * aspect)
  const ndcY = (localY * sy) / depth
  return {
    x: (ndcX * 0.5 + 0.5) * width,
    y: (-ndcY * 0.5 + 0.5) * height,
    behind: false,
  }
}

/** Focused-fish orbit defaults (bounded for tests). */
export function focusedOrbit(target: Vec3): OrbitState {
  return {
    yaw: 0,
    pitch: 0.1,
    radius: 9,
    target: { ...target },
  }
}
