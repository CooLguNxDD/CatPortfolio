/**
 * Numeric tuning knobs for the WebGL fish tank — camera feel, geometry
 * placement, particle systems, and interaction/highlight formulas that used
 * to be hardcoded inline across `FishTankCanvas.tsx` and `speciesMeshes.ts`.
 *
 * Pure refactor target: every field here is a straight relocation of an
 * existing literal, not a new tuning pass. Two exceptions are deliberately
 * left where they were and are NOT duplicated here:
 *  - `fishTankLayout.ts` already owns pure geometry/orbit math and its own
 *    named constants (`WATER_Y`, `TANK_HALF_W`, `TARGET_LERP_SPEED`, …).
 *  - `fishTankTokens.ts` / `fishTankCircadian.ts` own CSS-theme-derived
 *    *colors* (`TankThemePalette`).
 *  - The fish locomotion/animation body in `FishTankCanvas.tsx` (steering
 *    gain, tail-beat rate, spine phase, bank/roll, jelly pulse, tentacle
 *    wave) stays inline: those are dense, cross-referencing physics
 *    constants with their justification written next to them (e.g. "0.18 is
 *    measured, not guessed") — extracting them to a flat lookup would trade
 *    that context for indirection without reducing risk.
 *  - Per-form mesh *shape* literals in `speciesMeshes.ts` (arm counts, blade
 *    taper, octahedron scale) are shape-defining, not tunables a designer
 *    would reach for — left inline. Material properties (color/emissive/
 *    roughness/opacity) from the same file DO move here, since those are
 *    exactly the "too shiny" class of knob this file exists for.
 *
 * Specimen tags carry no styling here. A fish spawned from an ask-mode
 * discovery or fish-pool recommendation arrives tagged `"discovered"` (and may
 * later be tagged `"recommended"`), but tuning is theme-derived and per-scene,
 * never per-fish — those tags render with default styling by design. Tags
 * influence only schooling/size in `fishFromLayout.ts`. If a pooled specimen
 * ever needs its own visual treatment, add the lookup there against a synonym
 * set (`discovered` | `recommended`), not a single string compare.
 *
 * Day/night split: the ~13 confirmed `light ? x : y` sites collapse into
 * `resolveFishTankTuning(light)`, mirroring `resolveTankThemePalette()`'s
 * shape. Call it once at scene build AND again inside `applyPalette()` so a
 * live theme resample refreshes these — before this file existed, several of
 * them (opacities, fish emissive floors) were captured once into `const
 * light` and silently never refreshed on a live swap.
 */

// ---------------------------------------------------------------------------
// Camera / raycast feel
// ---------------------------------------------------------------------------

export const CAMERA_CONFIG = {
  fov: 58,
  near: 0.1,
  far: 400,
  maxPixelRatio: 2,
  nonImmersiveHeightPx: 320,
  immersiveFallbackWidth: 640,
  immersiveFallbackHeight: 480,
  /** Above this viewport width, a focused fish frames off-center instead of dead-center. */
  dossierSideOffsetBreakpointPx: 820,
  dossierSideOffset: 4.8,
  idleDriftFreq: 0.12,
  idleDriftAmp: 0.06,
  dragYawSensitivity: 0.005,
  dragPitchSensitivity: 0.004,
  wheelZoomSensitivity: 0.02,
  surfaceReturnThreshold: 0.05,
  submergedThreshold: 0.95,
  targetSnapDistance: 0.08,
  diveArcStart: 0.01,
  diveArcEnd: 0.99,
  /** Camera-height-to-immersion normalizer (audio filter sweep + composer wobble). */
  immersionDepthDivisor: 6,
  immersionEpsilon: 0.02,
  audioUpdateIntervalSec: 0.066,
  clickDragTolerancePx: 6,
} as const

export const RAYCAST_CONFIG = {
  pointerSentinel: -9999,
  unprojectZ: 0.5,
  dirZEpsilon: 0.0001,
  /** Surface-stage pick plane, as a fraction of TANK_HALF_D. */
  surfacePickPlaneFrac: 0.4,
  fallbackRayLength: 20,
} as const

// ---------------------------------------------------------------------------
// Light positions (fixed points in the scene, not day/night-varying —
// intensities that DO vary by theme live in FishTankTuning below)
// ---------------------------------------------------------------------------

export const LIGHT_CONFIG = {
  hemiHeightOffset: 10,
  /** Key-light multiplier on top of palette.keyIntensity — was duplicated inline at scene build and applyPalette. */
  keyIntensityMul: 1.2,
  /** Shared with the sky dome's sun/moon disc and the water's specular highlight. */
  sunLightDistance: 40,
  fillPosition: { x: -10, yAboveCenter: 6, z: 20 },
  accentFillPosition: { x: 14, yBelowWater: 6, z: -10 },
  bedBounceHeightOffset: 4,
} as const

// ---------------------------------------------------------------------------
// Tank geometry & placement
// ---------------------------------------------------------------------------

export const BACKDROP_CONFIG = {
  radiusMul: 3.2,
  widthSegments: 16,
  heightSegments: 12,
} as const

export const GLASS_CONFIG = {
  heightPad: 0.5,
} as const

export const FLOOR_CONFIG = {
  insetX: 0.4,
  insetZ: 0.4,
  segmentsW: 32,
  segmentsD: 24,
  dune: {
    freqX: 0.18,
    freqZ: 0.15,
    ampPrimary: 0.65,
    freqSum: 0.3,
    ampSecondary: 0.25,
  },
  roughness: 0.88,
  metalness: 0.05,
} as const

export const CAUSTIC_CONFIG = {
  strengthMul: 1.3,
  insetX: 0.6,
  insetZ: 0.6,
  yAboveFloor: 0.35,
  /** World-space caustic injection on other materials (floor, fish, …). */
  surfaceStrengthMul: 0.55,
} as const

export const GODRAY_CONFIG = {
  spreadBaseFrac: 0.26,
  spreadMul: 8,
  heightBaseFactor: 1.18,
  heightModIndex: 3,
  heightModStep: 0.15,
  strengthMul: 2.4,
  radiusBase: 1.8,
  radiusModIndex: 4,
  radiusModStep: 0.6,
  radialSegments: 14,
  yOffsetAboveMid: 3,
  zModIndex: 4,
  zOffset: -1.5,
  zSpread: 8.5,
  tiltStep: 0.032,
} as const

export const ROCK_CONFIG = {
  count: 14,
  detail: 0,
  roughness: 0.9,
  xSpreadInset: 6,
  yBase: 0.7,
  yModIndex: 3,
  yModStep: 0.2,
  zModIndex: 5,
  zOffset: -2,
  zSpreadFrac: 0.35,
  scaleBase: 0.9,
  scaleModIndex: 4,
  scaleModStep: 0.55,
  rotXStep: 0.7,
  rotYStep: 1.3,
  rotZStep: 0.4,
} as const

export const CRYSTAL_PLACEMENT_CONFIG = {
  count: 6,
  scaleBase: 0.8,
  scaleModIndex: 3,
  scaleModStep: 0.35,
  xInset: 8,
  xModIndex: 2,
  xOffsetEven: -1.5,
  xOffsetOdd: 1.5,
  yAboveFloor: 0.1,
  zModIndex: 3,
  zOffset: -1,
  zSpreadFrac: 0.4,
  rotYStep: 1.1,
} as const

export const SEAWEED_PLACEMENT_CONFIG = {
  count: 20,
  heightBase: 5.5,
  heightModIndex: 4,
  heightModStep: 2.8,
  xInset: 4,
  yAboveFloor: 0.2,
  zModIndex: 6,
  zOffset: -2.5,
  zSpreadFrac: 0.32,
} as const

export const CORAL_PLACEMENT_CONFIG = {
  count: 6,
  scaleBase: 1.0,
  scaleModIndex: 3,
  scaleModStep: 0.4,
  xOffset: -2.5,
  xSpreadFrac: 0.36,
  yAboveFloor: 0.3,
  zModIndex: 4,
  zOffset: -1.5,
  zSpreadFrac: 0.28,
} as const

// ---------------------------------------------------------------------------
// Particle systems
// ---------------------------------------------------------------------------

export const PARTICLE_CONFIG = {
  /** Shared soft-round sprite texture size for bubbles/motes/wake. */
  spriteSize: 64,
} as const

export const MINNOW_CONFIG = {
  countHigh: 240,
  countLow: 80,
} as const

export const BUBBLE_CONFIG = {
  count: 70,
  spawnInsetXZ: 2,
  sizeBase: 1.2,
  sizeRand: 1.8,
  pointSize: 1.8,
  riseSpeed: 1.8,
  wobbleFreqT: 3,
  wobbleFreqY: 2,
  wobbleAmp: 0.4,
  recycleTopOffset: 0.2,
  recycleBottomOffset: 0.4,
} as const

export const MOTE_CONFIG = {
  count: 100,
  spawnInsetXZ: 1,
  size: 0.9,
  driftFreq: 0.2,
  driftPhaseMul: 0.1,
  driftAmp: 0.25,
  sinkSpeed: 0.35,
  recycleTopOffset: 0.5,
} as const

export const WAKE_CONFIG = {
  countHigh: 280,
  countLow: 100,
  initY: -9999,
  initColor: { r: 0.2, g: 0.8, b: 1.0 },
  pointSize: 2.4,
  emissionBase: 0.35,
  emissionSpeedMul: 0.45,
  emissionBoostMul: 0.3,
  emissionDiveGate: 0.4,
  particleSizeGlowMul: 1.6,
  particleSizeBase: 0.9,
  particleSizeBoostMul: 1.6,
  maxLifeBase: 1.3,
  maxLifeBoostMul: 0.6,
} as const

// ---------------------------------------------------------------------------
// Shockwave & food-pellet interaction
// ---------------------------------------------------------------------------

export const SHOCKWAVE_CONFIG = {
  poolSize: 5,
  ringInnerRadius: 0.5,
  ringOuterRadius: 0.9,
  ringSegments: 32,
  baseOpacity: 0.6,
  initR: 1,
  maxR: 18,
  spawnOpacity: 0.75,
  floorOffset: 0.38,
  growthRate: 16,
  fadeMul: 0.75,
} as const

export const PELLET_CONFIG = {
  geoRadius: 0.5,
  geoWidthSegments: 8,
  geoHeightSegments: 8,
  emissiveIntensity: 0.9,
  roughness: 0.3,
  maxLive: 25,
  spawnSpreadXFrac: 1.3,
  spawnSpreadZFrac: 1.3,
  spawnYOffset: 0.5,
  fallSpeedBase: 1.4,
  fallSpeedRand: 0.8,
  swayFreq: 2.5,
  swayAmp: 0.35,
  restFloorOffset: 0.4,
  maxAge: 16,
  shrinkRate: 0.85,
  removalScaleThreshold: 0.05,
  mouthEatRadiusMul: 4.5,
  boostGlowOnEat: 1.0,
  dropHeightAboveCursor: 4,
} as const

// ---------------------------------------------------------------------------
// Fish-highlight interaction (day/night-invariant part; see FishTankTuning
// below for the floor/multiplier fields that DO vary by theme)
// ---------------------------------------------------------------------------

export const INTERACTION_CONFIG = {
  scaleMulHot: 1.15,
  scaleMulDim: 0.72,
  scaleMulDimThreshold: 0.5,
  boostScaleMul: 0.15,
  opacityDimThreshold: 0.3,
  opacityDimValue: 0.35,
  opacityBaseFloor: 0.75,
  opacityLitMul: 0.25,
  finOpacityBase: 0.5,
  finOpacityLitMul: 0.45,
  bodyEmissiveBoostMul: 0.8,
  bodyEmissiveGlowMul: 0.85,
  finEmissiveBoostMul: 1.0,
  finEmissiveGlowMul: 1.2,
  glowBoostMul: 1.2,
  glowIntensityMul: 2.4,
  glowFocusedMul: 2.8,
  boostDecayRate: 0.8,
} as const

export const LABEL_CONFIG = {
  diveGateProg: 0.55,
  yOffsetMul: 1.6,
  ndcCullX: 1.1,
  ndcCullY: 1.1,
  litVisibilityThreshold: 0.35,
  hotLitThreshold: 1,
  tickerLength: 3,
  pillBackground: "rgba(10, 16, 26, 0.78)",
  pillShadow: "0 0 10px rgba(0,0,0,0.5)",
  pillBorderAlpha: "88",
  hotShadow: (hex: string) => `0 0 16px ${hex}aa,0 0 6px ${hex}77,0 2px 12px rgba(0,0,0,.6)`,
  coldShadow: "0 2px 10px rgba(0,0,0,.4)",
  hotBorderAlpha: "ee",
  coldBorderAlpha: "99",
} as const

export const CAT_CONFIG = {
  rotationYOffset: -Math.PI / 4,
  huntCursorDistance: 28,
  trackDistance: 35,
  huntDistance: 24,
  huntYOffset: 14,
  swatDistance: 13,
  swatYOffset: 6,
} as const

export const POST_CONFIG = {
  /** Frame-delta ceiling — prevents multi-second physics snaps after a frozen/backgrounded tab. */
  dtClampSec: 0.05,
  fogBaseMin: 0.18,
  fogBaseProgMul: 0.82,
  fogFocusedMul: 1.35,
  fogLerpSpeed: 0.05,
  diveEpsilon: 0.004,
  wobbleBase: 0.35,
  wobbleProgMul: 0.65,
} as const

export const ANCHOR_CONFIG = {
  worldRadiusMul: 2.4,
  minRadius: 24,
  xEpsilon: 2,
  yEpsilon: 2,
  rEpsilon: 4,
  sentinel: -9999,
} as const

export const SONAR_CONFIG = {
  diveGate: 0.4,
  updateIntervalSec: 0.1,
} as const

// ---------------------------------------------------------------------------
// Day/night tuning — the confirmed `light ? x : y` sites, collected so a
// live theme resample can refresh them (see file header).
// ---------------------------------------------------------------------------

export interface FishTankTuning {
  accentFillIntensity: number
  bedBounceIntensity: number
  glassOpacity: number
  waterOpacity: number
  minnowEmissive: number
  bubbleOpacity: number
  moteOpacity: number
  wakeOpacity: number
  fishBodyEmissiveFloor: number
  fishBodyEmissiveMul: number
  fishFinEmissiveFloor: number
  fishFinEmissiveMul: number
  fishGlowMul: number
}

const DAY_TANK_TUNING: FishTankTuning = {
  accentFillIntensity: 0.65,
  bedBounceIntensity: 0.45,
  glassOpacity: 0.22,
  waterOpacity: 0.32,
  minnowEmissive: 0.2,
  bubbleOpacity: 0.38,
  moteOpacity: 0.25,
  wakeOpacity: 0.5,
  // Sunlit daylight already lights the fish for free — see the note on
  // fishBodyEmissiveFloor's use in FishTankCanvas.tsx.
  fishBodyEmissiveFloor: 0.12,
  fishBodyEmissiveMul: 0.6,
  fishFinEmissiveFloor: 0.16,
  fishFinEmissiveMul: 0.6,
  fishGlowMul: 0.75,
}

const NIGHT_TANK_TUNING: FishTankTuning = {
  accentFillIntensity: 1.8,
  bedBounceIntensity: 0.85,
  glassOpacity: 0.32,
  waterOpacity: 0.42,
  minnowEmissive: 0.45,
  bubbleOpacity: 0.65,
  moteOpacity: 0.45,
  wakeOpacity: 0.88,
  fishBodyEmissiveFloor: 0.25,
  fishBodyEmissiveMul: 1.1,
  fishFinEmissiveFloor: 0.35,
  fishFinEmissiveMul: 1.25,
  fishGlowMul: 1.25,
}

/** Resolve the day/night tuning pair for the tank's theme mode (`palette.light`). */
export function resolveFishTankTuning(light: boolean): FishTankTuning {
  return light ? DAY_TANK_TUNING : NIGHT_TANK_TUNING
}

// ---------------------------------------------------------------------------
// Fish material (speciesMeshes.ts) — material properties only; per-form
// mesh *shape* literals stay inline (see file header).
// ---------------------------------------------------------------------------

export const FISH_MATERIAL_CONFIG = {
  bodyEmissiveFloor: 0.2,
  bodyEmissiveGlowMul: 0.75,
  bodyRoughness: 0.45,
  bodyMetalness: 0.08,
  bodyOpacity: 0.98,
  finEmissiveFloor: 0.35,
  finEmissiveGlowMul: 1.1,
  finOpacity: 0.85,
  finRoughness: 0.3,
  finMetalness: 0.05,
  glowIntensityFloor: 0.6,
  glowIntensityMul: 1.6,
  glowDistance: 8,
} as const

export const EYE_CONFIG = {
  whiteColor: 0xf2f7fa,
  whiteRoughness: 0.25,
  whiteMetalness: 0,
  pupilColor: 0x050810,
  defaultUp: 0.18,
  defaultRadius: 0.16,
  pupilScaleMul: 0.55,
  pupilXSpreadMul: 1.06,
  pupilForwardMul: 0.62,
  hitSphereRadius: 2.4,
  hitSphereWidthSegments: 8,
  hitSphereHeightSegments: 6,
} as const

export const PLANT_MATERIAL_CONFIG = {
  seaweed: {
    emissiveIntensity: 0.18,
    roughness: 0.75,
    metalness: 0.05,
    opacity: 0.94,
  },
  coral: {
    emissiveIntensity: 0.45,
    roughness: 0.5,
    metalness: 0.1,
    tipColor: 0xffffff,
    tipOpacity: 0.9,
  },
  crystal: {
    emissiveIntensity: 0.65,
    roughness: 0.2,
    metalness: 0.3,
    opacity: 0.92,
  },
} as const
