/**
 * Three.js fish-tank renderer — the only module that imports `three`.
 * Math: fishTankLayout · meshes: fish/speciesMeshes · tokens: fishTankTokens.
 * Dossier/HUD live in React components (react-app-guide: views stay DOM, canvas is WebGL only).
 *
 * Interaction wiring (see design/fish/README.md + fish/fishBus.ts): focus,
 * filter and bake state are read imperatively off the zustand store via
 * `subscribe` (never through props/refs mirrored at render time); dive
 * progress and the dossier anchor are bus-only observations, never React
 * state. `fish` / `immersive` / `themeKey` / `highlightSlugs` stay props —
 * they only change together with a new layout, which already remounts this
 * effect via the `fish` identity change.
 */

import { useEffect, useRef } from "react"
import * as THREE from "three"
import { useFishTankStore } from "@/store"
import { fishBus } from "@/fish/fishBus"
import { createFrameChannel } from "@/fish/frameChannel"
import { isSubmerged } from "@/fish/tankMachine"
import { fishLitFactor, type FishFilter } from "@/fish/matchFish"
import {
  CAT_X,
  clamp01,
  WATER_Y,
  FLOOR_Y,
  SWIM_Y_MIN,
  SWIM_Y_MAX,
  TANK_HEIGHT,
  TANK_CENTER_Y,
  TANK_HALF_W,
  TANK_HALF_D,
  SURFACE_RADIUS,
  SUBMERGED_RADIUS,
  MAX_ORBIT_RADIUS,
  MIN_ORBIT_RADIUS,
  DEFAULT_PITCH,
  MAX_PITCH,
  MIN_PITCH,
  DIVE_PITCH_ARC,
  FOCUS_STANDOFF_BASE,
  FOCUS_STANDOFF_SCALE,
  TARGET_LERP_SPEED,
  ORBIT_LERP_SPEED,
  RADIUS_LERP_SPEED,
  clamp,
  computeFishPose,
  stageOrbitTarget,
  type FishSpecimenInput,
  type Vec3,
} from "./fishTankLayout"
import {
  mixHex,
  resolveCircadianPhase,
  resolveTankThemePalette,
  tokenToHex,
  SPECIES_FALLBACK_HEX,
  SPECIES_TOKEN,
  resolveTankQuality,
  type CircadianMode,
  type TankThemePalette,
} from "./fishTankTokens"
import { applyCircadian } from "./fishTankCircadian"
import {
  buildCoral,
  buildCyberCrystal,
  buildFishMesh,
  buildPointSprite,
  buildSeaweed,
  type BuiltFish,
} from "@/fish/speciesMeshes"
import {
  buildGiantCatMesh,
  createCatAnimationState,
  stepCatAnimation,
} from "@/fish/catMesh"
import { createCausticMaterial } from "@/fish/shaders/causticShader"
import { createGodRayMaterial, type GodRayMaterial } from "@/fish/shaders/godRayShader"
import { createWaterMaterial } from "@/fish/shaders/waterShader"
import { patchMaterialCaustics } from "@/fish/shaders/causticProjection"
import { installBeerLambertFog } from "@/fish/shaders/absorption"
import { createTankComposer } from "@/fish/postprocessing/tankComposer"
import { createHoloReticle } from "@/fish/components/HoloReticle"
import { createArchHologram } from "@/fish/components/ArchHologram"
import { createMinnowField } from "@/fish/minnowField"
import { createCursorTracker, isFleeOnset, type CursorIntent } from "@/fish/cursorIntent"
import { worldYForDepth } from "@/fish/bathymetry"
import { projectSonarBlips } from "@/fish/sonarProjection"
import { fishAudio } from "@/fish/fishAudio"
import { computeSteeringForce, type BoidAgent } from "@/fish/fishBoids"
import {
  behaviorTimeScale,
  createFishBehavior,
  stepFishBehavior,
  swimTarget,
  SENSE_DIST,
  type FishBehaviorState,
  type SensedFood,
} from "@/fish/fishBehavior"
import {
  bodySpeed,
  clampToBounds,
  createSwimBody,
  maxSpeedFor,
  minSpeedFor,
  stepSwimBody,
  type SwimBody,
} from "@/fish/fishLocomotion"
import { WakeTrailPool } from "@/fish/wakeTrails"
import type { DomainIdType } from "@/content/schema"

/** Stable empty highlight set — a per-render `[]` remounts the WebGL scene. */
const NO_HIGHLIGHTS: string[] = []

export interface FishTankCanvasProps {
  fish: FishSpecimenInput[]
  immersive?: boolean
  /** Bake highlight set — layout-derived, changes together with `fish`. */
  highlightSlugs?: string[]
  /** Theme id / accent stamp — remounts lights when the shell theme changes. */
  themeKey?: string
  /** Day/night cycle mode; `auto` follows the visitor's local clock. */
  circadian?: CircadianMode
}

/** Domain accent → three.js Color (oklch tokens resolved via browser). */
function domainColor(species: string): THREE.Color {
  const sp = species as DomainIdType
  const fallback = SPECIES_FALLBACK_HEX[sp] || SPECIES_FALLBACK_HEX.platform
  const key = SPECIES_TOKEN[sp] || "accent-platform"
  const hex = tokenToHex(key, Number.parseInt(fallback.slice(1), 16))
  return new THREE.Color(hex)
}

/** Wrap an angle delta into (-π, π] so banking doesn't spike at the seam. */
function shortestAngle(d: number): number {
  let a = d
  while (a > Math.PI) a -= Math.PI * 2
  while (a < -Math.PI) a += Math.PI * 2
  return a
}

/** Default-export lazy canvas — Three WebGL aquarium with procedural caustics & organic physics. */
export default function FishTankCanvas({
  fish,
  immersive = false,
  highlightSlugs = NO_HIGHLIGHTS,
  themeKey = "default",
  circadian = "auto",
}: FishTankCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const circadianRef = useRef(circadian)
  circadianRef.current = circadian
  const applyPaletteRef = useRef<((mode: CircadianMode) => void) | null>(null)

  // Scene lifetime is keyed on *roster* identity, not array identity. An
  // ask-mode patch replaces the whole fishTank block, so `fish` is a fresh
  // array on every turn — depending on it tore down and rebuilt the scene,
  // which the visitor reads as "the tank reset". Same slugs in the same order
  // => same scene, and unchanged fish keep their position and locomotion.
  const rosterKey = fish.map((f) => f.slug).join("|")
  const highlightKey = highlightSlugs.join("|")
  const fishRef = useRef(fish)
  fishRef.current = fish

  useEffect(() => {
    const root = hostRef.current
    if (!root) return
    const host: HTMLDivElement = root
    // Latest specimens for this roster (blurbs/metrics may have been rewritten
    // by the same patch that kept the roster stable).
    const fish = fishRef.current

    // Discrete interaction state, read imperatively
    const focusedRef = { current: useFishTankStore.getState().focus }
    const depthFocusRef = { current: useFishTankStore.getState().depthFocus }
    const filterRef = { current: filterFromStore() }
    function filterFromStore(): FishFilter {
      const s = useFishTankStore.getState()
      return { query: s.query, domain: s.domain, highlightSlugs, bakeActive: s.bakeActive }
    }
    const unsubStore = useFishTankStore.subscribe((s) => {
      focusedRef.current = s.focus
      depthFocusRef.current = s.depthFocus
      filterRef.current = {
        query: s.query,
        domain: s.domain,
        highlightSlugs,
        bakeActive: s.bakeActive,
      }
    })
    const progressChannel = createFrameChannel(fishBus, "tank:progress", 0)
    const progRef = { current: progressChannel.get() }
    const unsubProgress = progressChannel.subscribe((v) => {
      progRef.current = v
    })

    const phase = resolveCircadianPhase(new Date(), circadian)
    let palette: TankThemePalette = applyCircadian(resolveTankThemePalette(), phase)
    const light = palette.light
    const quality = resolveTankQuality()
    // Night fauna drift instead of darting (Pillar 5) — folded into the same
    // multiplier the reduced-motion tier already uses to freeze the tank.
    let faunaScale = palette.faunaTimeScale

    // Shared clock + strength for the world-space caustic injection. Every lit
    // surface samples the same field, so ripples stay continuous across the
    // seabed, the rocks and the fish (Pillar 1.2).
    const causticClock = { value: 0 }
    const causticSurfaceStrength = { value: palette.causticStrength * 0.55 }
    const causticSurfaceColor = new THREE.Color(palette.sun)
    /** Patch one standard material with world-space caustics. */
    function withCaustics<T extends THREE.Material>(material: T): T {
      patchMaterialCaustics(material, {
        time: causticClock,
        color: causticSurfaceColor,
        strength: causticSurfaceStrength,
        octaves: quality.octaves,
      })
      return material
    }

    // Wavelength-aware water: replaces three's grey exponential fog with
    // Beer-Lambert extinction for every fogged material in the tank.
    installBeerLambertFog()

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(palette.bg)
    scene.fog = new THREE.FogExp2(palette.fogColor, palette.fogDensity)

    const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 400)
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    host.appendChild(renderer.domElement)
    renderer.domElement.style.width = "100%"
    renderer.domElement.style.height = immersive ? "100%" : "320px"
    renderer.domElement.style.display = "block"
    renderer.domElement.style.borderRadius = immersive ? "0" : "var(--radius)"
    renderer.domElement.style.cursor = "grab"
    renderer.domElement.setAttribute("aria-label", "Interactive portfolio fish tank")
    renderer.domElement.setAttribute("aria-keyshortcuts", "F")
    // Keyboard-focusable so the double-click "drop food" action (below) has
    // an equivalent for keyboard-only visitors — otherwise it's mouse-only.
    renderer.domElement.setAttribute("role", "application")
    renderer.domElement.tabIndex = 0

    const tank = new THREE.Group()
    scene.add(tank)

    // Lighting setup
    const ambient = new THREE.AmbientLight(palette.ambientColor, palette.ambientIntensity)
    scene.add(ambient)
    const hemi = new THREE.HemisphereLight(palette.hemiSky, palette.hemiGround, palette.hemiIntensity)
    hemi.position.set(0, WATER_Y + 10, 0)
    scene.add(hemi)
    
    const top = new THREE.DirectionalLight(palette.keyColor, palette.keyIntensity * 1.2)
    top.position.set(6, WATER_Y + 40, 8)
    scene.add(top)

    const fill = new THREE.PointLight(palette.fillColor, palette.fillIntensity, 120)
    fill.position.set(-10, TANK_CENTER_Y + 6, 20)
    scene.add(fill)

    const accentFill = new THREE.PointLight(palette.accent, light ? 0.65 : 1.8, 80)
    accentFill.position.set(14, WATER_Y - 6, -10)
    scene.add(accentFill)

    const bedBounce = new THREE.PointLight(palette.cyan, light ? 0.45 : 0.85, TANK_HEIGHT)
    bedBounce.position.set(0, FLOOR_Y + 4, 0)
    scene.add(bedBounce)

    // Depth backdrop
    const backdropMat = new THREE.MeshBasicMaterial({
      color: palette.deep,
      side: THREE.BackSide,
      fog: false,
    })
    const backdrop = new THREE.Mesh(
      new THREE.SphereGeometry(TANK_HALF_W * 3.2, 16, 12),
      backdropMat,
    )
    backdrop.position.y = TANK_CENTER_Y
    scene.add(backdrop)

    // Glass box outline
    const glassH = TANK_HEIGHT + 0.5
    const glassW = TANK_HALF_W * 2
    const glassD = TANK_HALF_D * 2
    const box = new THREE.BoxGeometry(glassW, glassH, glassD)
    const edges = new THREE.EdgesGeometry(box)
    const glassMat = new THREE.LineBasicMaterial({
      color: palette.glass,
      transparent: true,
      opacity: light ? 0.22 : 0.32,
    })
    const glass = new THREE.LineSegments(edges, glassMat)
    glass.position.y = TANK_CENTER_Y
    tank.add(glass)

    // Water surface plane — waves are displaced on the GPU (see waterShader.ts)
    const waterGeo = new THREE.PlaneGeometry(
      glassW,
      glassD,
      quality.waterSegments[0],
      quality.waterSegments[1],
    )
    waterGeo.rotateX(-Math.PI / 2)
    const waterMat = createWaterMaterial({
      color: new THREE.Color(palette.water),
      sun: new THREE.Color(palette.sun),
      opacity: light ? 0.32 : 0.42,
      light,
      octaves: quality.octaves,
    })
    const water = new THREE.Mesh(waterGeo, waterMat)
    water.position.y = WATER_Y
    tank.add(water)

    // Undulating Seabed Floor
    const floorGeo = new THREE.PlaneGeometry(glassW - 0.4, glassD - 0.4, 32, 24)
    floorGeo.rotateX(-Math.PI / 2)
    const floorPos = floorGeo.attributes.position.array as Float32Array
    for (let i = 0; i < floorGeo.attributes.position.count; i++) {
      const fx = floorPos[i * 3]
      const fz = floorPos[i * 3 + 2]
      // Rolling sand dunes & ridges
      const dy = Math.sin(fx * 0.18) * Math.cos(fz * 0.15) * 0.65 + Math.sin((fx + fz) * 0.3) * 0.25
      floorPos[i * 3 + 1] = dy
    }
    floorGeo.computeVertexNormals()

    const floorMat = withCaustics(
      new THREE.MeshStandardMaterial({
        color: palette.floor,
        roughness: 0.88,
        metalness: 0.05,
        flatShading: true,
      }),
    )
    const floor = new THREE.Mesh(floorGeo, floorMat)
    floor.position.y = FLOOR_Y
    tank.add(floor)

    // Procedural Voronoi Caustics Shader Plane
    const causticMat = createCausticMaterial(
      new THREE.Color(palette.sun),
      palette.causticStrength * 1.3,
      palette.causticStrength,
      quality.octaves,
    )
    const causticPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(glassW - 0.6, glassD - 0.6),
      causticMat,
    )
    causticPlane.rotation.x = -Math.PI / 2
    causticPlane.position.y = FLOOR_Y + 0.35
    causticPlane.name = "caustics"
    tank.add(causticPlane)

    // Volumetric God Rays — one shader material per shaft so they never pulse in sync
    const rayCount = quality.rayCount
    const rayCenter = (rayCount - 1) / 2
    const raySpread = (TANK_HALF_W * 0.26 * 8) / Math.max(1, rayCount - 1)
    const rayMats: GodRayMaterial[] = []
    const rays = new THREE.Group()
    rays.name = "rays"
    for (let i = 0; i < rayCount; i++) {
      const h = TANK_HEIGHT * (1.18 + (i % 3) * 0.15)
      const mat = createGodRayMaterial(
        new THREE.Color(palette.sun),
        palette.rayStrength * 2.4,
        i / rayCount,
        quality.octaves,
      )
      rayMats.push(mat)
      const ray = new THREE.Mesh(new THREE.ConeGeometry(1.8 + (i % 4) * 0.6, h, 14, 1, true), mat)
      ray.position.set(
        (i - rayCenter) * raySpread,
        WATER_Y - h / 2 + 3,
        ((i % 4) - 1.5) * 8.5,
      )
      ray.rotation.z = (i - rayCenter) * 0.032
      rays.add(ray)
    }
    tank.add(rays)

    // Seabed Rocks & Glowing Cyber-Crystals
    const rockGeo = new THREE.DodecahedronGeometry(1, 0)
    const rockMat = withCaustics(
      new THREE.MeshStandardMaterial({
        color: palette.rock,
        roughness: 0.9,
        flatShading: true,
      }),
    )
    for (let i = 0; i < 14; i++) {
      const rock = new THREE.Mesh(rockGeo, rockMat)
      rock.position.set(
        (i / 13 - 0.5) * (glassW - 6),
        FLOOR_Y + 0.7 + (i % 3) * 0.2,
        ((i % 5) - 2) * (TANK_HALF_D * 0.35),
      )
      rock.scale.setScalar(0.9 + (i % 4) * 0.55)
      rock.rotation.set(i * 0.7, i * 1.3, i * 0.4)
      tank.add(rock)
    }

    // Glowing cyber-crystals
    const crystalColors = [palette.accent, palette.neon, palette.cyan]
    for (let i = 0; i < 6; i++) {
      const col = new THREE.Color(crystalColors[i % crystalColors.length])
      const crystal = buildCyberCrystal(col, 0.8 + (i % 3) * 0.35)
      crystal.position.set(
        (i / 5 - 0.5) * (glassW - 8) + (i % 2 ? 1.5 : -1.5),
        FLOOR_Y + 0.1,
        ((i % 3) - 1) * (TANK_HALF_D * 0.4),
      )
      crystal.rotation.y = i * 1.1
      tank.add(crystal)
    }

    // Seabed Seaweed & Branching Corals
    const weedColor = new THREE.Color(palette.weed)
    // Segment refs resolved once here — getObjectByName in the frame loop
    // re-walks every stalk subtree on each of the 20 weeds, every frame.
    // Index-preserving (null-padded) so sway phase/amplitude per segment index
    // stays identical to the previous per-frame lookup.
    const weedRigs: {
      segs: (THREE.Object3D | null)[]
      seed: number
    }[] = []
    for (let i = 0; i < 20; i++) {
      const stalk = buildSeaweed(5.5 + (i % 4) * 2.8, weedColor, i)
      stalk.position.set(
        (i / 19 - 0.5) * (glassW - 4),
        FLOOR_Y + 0.2,
        ((i % 6) - 2.5) * (TANK_HALF_D * 0.32),
      )
      tank.add(stalk)
      const { segs, seed } = stalk.userData as { segs: number; seed: number }
      const segRefs: (THREE.Object3D | null)[] = []
      for (let s = 0; s < segs; s++) {
        segRefs.push(stalk.getObjectByName(`seg${s}`) ?? null)
      }
      weedRigs.push({ segs: segRefs, seed })
    }

    for (let i = 0; i < 6; i++) {
      const coral = buildCoral(
        new THREE.Color(i % 2 ? palette.accent : palette.neon),
        1.0 + (i % 3) * 0.4,
      )
      coral.position.set(
        (i - 2.5) * (TANK_HALF_W * 0.36),
        FLOOR_Y + 0.3,
        ((i % 4) - 1.5) * (TANK_HALF_D * 0.28),
      )
      tank.add(coral)
    }

    // Ambient commit-minnows — one InstancedMesh, placed and deformed entirely
    // in the vertex shader (fish/minnowField.ts), so population is free on CPU.
    const minnows = createMinnowField({
      count: quality.tier === "high" ? 240 : 80,
      colors: [palette.accent, palette.cyan, palette.neon].map((c) => new THREE.Color(c)),
      octaves: quality.octaves,
      emissiveIntensity: light ? 0.2 : 0.45,
      emissiveTint: palette.deep,
    })
    withCaustics(minnows.mesh.material as THREE.MeshStandardMaterial)
    tank.add(minnows.mesh)

    // 3D Holographic Reticle for Focused Fish
    const holoReticle = createHoloReticle()
    holoReticle.group.name = "holo_reticle"
    tank.add(holoReticle.group)

    // Architecture hologram — replaces the reticle once a specimen is locked.
    // Nodes stay wordless: the dossier already carries the metrics and tags, so
    // labelling them again just stacks text over the specimen.
    const hologram = createArchHologram(palette.cyan)
    hologram.group.name = "arch_hologram"
    tank.add(hologram.group)

    // Interactive Giant Predator Cat Mascot perched on the rim
    const { group: cat, parts: catParts } = buildGiantCatMesh(WATER_Y)
    cat.position.set(CAT_X, WATER_Y, 0)
    cat.rotation.y = -Math.PI / 4
    scene.add(cat)

    const catAnimState = createCatAnimationState()
    let catTriggerSwat = false

    // Particle Systems: Rising Bubbles & Marine Snow
    const sprite = buildPointSprite(64)
    const bubbleCount = 70
    const bubbleGeo = new THREE.BufferGeometry()
    const bPos = new Float32Array(bubbleCount * 3)
    const bSizes = new Float32Array(bubbleCount)
    for (let i = 0; i < bubbleCount; i++) {
      bPos[i * 3] = (Math.random() - 0.5) * (glassW - 2)
      bPos[i * 3 + 1] = FLOOR_Y + Math.random() * TANK_HEIGHT
      bPos[i * 3 + 2] = (Math.random() - 0.5) * (glassD - 2)
      bSizes[i] = 1.2 + Math.random() * 1.8
    }
    bubbleGeo.setAttribute("position", new THREE.BufferAttribute(bPos, 3))
    bubbleGeo.setAttribute("size", new THREE.BufferAttribute(bSizes, 1))
    const bubbleMat = new THREE.PointsMaterial({
      color: palette.bubble,
      size: 1.8,
      map: sprite || undefined,
      transparent: true,
      opacity: light ? 0.38 : 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const bubbles = new THREE.Points(bubbleGeo, bubbleMat)
    tank.add(bubbles)

    const moteCount = 100
    const moteGeo = new THREE.BufferGeometry()
    const mPos = new Float32Array(moteCount * 3)
    for (let i = 0; i < moteCount; i++) {
      mPos[i * 3] = (Math.random() - 0.5) * (glassW - 1)
      mPos[i * 3 + 1] = FLOOR_Y + Math.random() * TANK_HEIGHT
      mPos[i * 3 + 2] = (Math.random() - 0.5) * (glassD - 1)
    }
    moteGeo.setAttribute("position", new THREE.BufferAttribute(mPos, 3))
    const moteMat = new THREE.PointsMaterial({
      color: palette.motes,
      size: 0.9,
      map: sprite || undefined,
      transparent: true,
      opacity: light ? 0.25 : 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const motes = new THREE.Points(moteGeo, moteMat)
    tank.add(motes)

    // Bioluminescent fish wake trails — same quality-tier split as the minnow field.
    const wakeCount = quality.tier === "high" ? 280 : 100
    const wakePool = new WakeTrailPool(wakeCount)
    const wakeGeo = new THREE.BufferGeometry()
    const wakePos = new Float32Array(wakeCount * 3)
    const wakeColors = new Float32Array(wakeCount * 3)
    for (let i = 0; i < wakeCount; i++) {
      wakePos[i * 3 + 1] = -9999
      wakeColors[i * 3] = 0.2
      wakeColors[i * 3 + 1] = 0.8
      wakeColors[i * 3 + 2] = 1.0
    }
    wakeGeo.setAttribute("position", new THREE.BufferAttribute(wakePos, 3))
    wakeGeo.setAttribute("color", new THREE.BufferAttribute(wakeColors, 3))
    const wakeMat = new THREE.PointsMaterial({
      size: 2.4,
      map: sprite || undefined,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: light ? 0.5 : 0.88,
    })
    const wakePoints = new THREE.Points(wakeGeo, wakeMat)
    tank.add(wakePoints)

    // Interactive Shockwave Ripples
    interface Shockwave {
      mesh: THREE.Mesh
      x: number
      z: number
      r: number
      maxR: number
      opacity: number
      active: boolean
    }
    const shockwaves: Shockwave[] = []
    const shockRingGeo = new THREE.RingGeometry(0.5, 0.9, 32)
    shockRingGeo.rotateX(-Math.PI / 2)
    const shockMat = new THREE.MeshBasicMaterial({
      color: palette.cyan,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    function spawnShockwave(x: number, z: number) {
      if (shockwaves.length > 5) {
        const old = shockwaves.shift()
        if (old) {
          tank.remove(old.mesh)
          ;(old.mesh.material as THREE.Material).dispose()
        }
      }
      const ring = new THREE.Mesh(shockRingGeo, shockMat.clone())
      ring.position.set(x, FLOOR_Y + 0.38, z)
      tank.add(ring)
      shockwaves.push({
        mesh: ring,
        x,
        z,
        r: 1,
        maxR: 18,
        opacity: 0.75,
        active: true,
      })
    }

    // Build fish meshes & DOM badge labels
    const fishObjs: Array<{
      mesh: THREE.Group
      data: FishSpecimenInput
      built: BuiltFish
      label: HTMLDivElement
    }> = []

    const labelLayer = document.createElement("div")
    labelLayer.className = "ft-labels-layer pointer-events-none absolute inset-0 overflow-hidden"
    host.appendChild(labelLayer)

    for (const specimen of fish) {
      const col = domainColor(specimen.species)
      const built = buildFishMesh(specimen, col)
      withCaustics(built.body)
      withCaustics(built.fin)
      tank.add(built.group)

      const label = document.createElement("div")
      label.className = "ft-3d-tag absolute pointer-events-none select-none font-mono text-[10px]"
      label.style.display = "none"
      label.style.transform = "translate(-50%, -100%)"
      label.style.transition = "opacity 0.15s ease-out"

      const pill = document.createElement("div")
      pill.className = "rounded px-1.5 py-0.5 border flex items-center gap-1 backdrop-blur-xs font-semibold whitespace-nowrap"
      pill.style.background = "rgba(10, 16, 26, 0.78)"
      pill.style.borderColor = `${col.getHexString()}88`
      pill.style.color = `#${col.getHexString()}`
      pill.style.boxShadow = `0 0 10px rgba(0,0,0,0.5)`

      const tick = document.createElement("span")
      tick.textContent = specimen.species.slice(0, 3).toUpperCase()
      tick.className = "text-[8px] opacity-75 font-bold uppercase"
      pill.appendChild(tick)

      const name = document.createElement("span")
      name.textContent = specimen.title
      name.className = "text-[10px] text-white"
      pill.appendChild(name)

      label.appendChild(pill)
      labelLayer.appendChild(label)

      ;(label as HTMLDivElement & { _pill: HTMLDivElement; _hex: string })._pill = pill
      ;(label as HTMLDivElement & { _pill: HTMLDivElement; _hex: string })._hex = `#${col.getHexString()}`

      fishObjs.push({
        mesh: built.group,
        data: specimen,
        built,
        label,
      })
    }

    // Deferred / live palette resample. Circadian changes call this in-place
    // so the scene is not torn down when day/night mode flips.
    const applyPalette = (mode: CircadianMode) => {
      const nextPhase = resolveCircadianPhase(new Date(), mode)
      palette = applyCircadian(resolveTankThemePalette(), nextPhase)
      faunaScale = palette.faunaTimeScale
      const nextLight = palette.light
      scene.background?.set(palette.bg)
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.set(palette.fogColor)
        scene.fog.density = palette.fogDensity
      }
      ambient.color.set(palette.ambientColor)
      ambient.intensity = palette.ambientIntensity
      hemi.color.set(palette.hemiSky)
      hemi.groundColor.set(palette.hemiGround)
      hemi.intensity = palette.hemiIntensity
      top.color.set(palette.keyColor)
      top.intensity = palette.keyIntensity * 1.2
      fill.color.set(palette.fillColor)
      fill.intensity = palette.fillIntensity
      accentFill.color.set(palette.accent)
      accentFill.intensity = nextLight ? 0.65 : 1.8
      bedBounce.color.set(palette.cyan)
      bedBounce.intensity = nextLight ? 0.45 : 0.85
      glassMat.color.set(palette.glass)
      waterMat.uniforms.uColor.value.set(palette.water)
      waterMat.uniforms.uSun.value.set(palette.sun)
      floorMat.color.set(palette.floor)
      for (const m of rayMats) {
        m.uniforms.uColor.value.set(palette.sun)
        m.uniforms.uStrength.value = palette.rayStrength * 2.4
      }
      causticMat.uniforms.uColor.value.set(palette.sun)
      causticSurfaceStrength.value = palette.causticStrength * 0.55
      causticSurfaceColor.set(palette.sun)
      bubbleMat.color.set(palette.bubble)
      moteMat.color.set(palette.motes)
    }
    applyPaletteRef.current = applyPalette
    let paletteFrame = requestAnimationFrame(() => applyPalette(circadianRef.current))

    // Post chain: absorption → bokeh → bloom → wobble → output. The low tier
    // collapses it to scene + output, which is what mobile used to get from the
    // old direct render (see fish/postprocessing/tankComposer.ts).
    const composer = createTankComposer(renderer, scene, camera, {
      width: host.clientWidth || 640,
      height: host.clientHeight || 320,
      octaves: quality.octaves,
      effects: quality.tier === "high",
      wobble: quality.wobble,
    })

    // Resize observer
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver((entries) => {
            for (const entry of entries) {
              const w = entry.contentRect.width || 640
              const h = immersive ? entry.contentRect.height || 480 : 320
              camera.aspect = w / h
              camera.updateProjectionMatrix()
              renderer.setSize(w, h)
              composer.setSize(w, h)
            }
          })
        : null
    ro?.observe(host)

    // Bind audio synthesizer
    fishAudio.bindToBus()

    // Food pellets system
    const foodGroup = new THREE.Group()
    tank.add(foodGroup)
    const pelletGeo = new THREE.SphereGeometry(0.5, 8, 8)
    const pelletMat = new THREE.MeshStandardMaterial({
      color: palette.accent,
      emissive: palette.accent,
      emissiveIntensity: 0.9,
      roughness: 0.3,
    })

    interface LivePellet {
      id: string
      mesh: THREE.Mesh
      x: number
      y: number
      z: number
      vy: number
      active: boolean
      age: number
    }
    const livePellets: LivePellet[] = []
    /**
     * Per-fish behaviour states (fish/fishBehavior.ts), keyed by slug. The
     * parametric orbit is only the resting state; this map is what lets a fish
     * leave it to chase a pellet and then settle back onto it.
     */
    const behaviors = new Map<string, FishBehaviorState>()
    /**
     * Integrated bodies (fish/fishLocomotion.ts), keyed by slug. `computeFishPose`
     * feeds these as a *target*; what the mesh actually gets is the body that
     * chased it, which is what keeps every transition continuous.
     */
    const bodies = new Map<string, SwimBody>()
    /** Scratch target + steering bias, reused every fish, every frame. */
    const _swimTarget: Vec3 = { x: 0, y: 0, z: 0 }
    const _swimBias: Vec3 = { x: 0, y: 0, z: 0 }
    const SWIM_MIN = { x: -TANK_HALF_W + 1, y: SWIM_Y_MIN, z: -TANK_HALF_D + 1 }
    const SWIM_MAX = { x: TANK_HALF_W - 1, y: SWIM_Y_MAX, z: TANK_HALF_D - 1 }

    function spawnFood(pos?: { x?: number; y?: number; z?: number }) {
      if (livePellets.length > 25) {
        const old = livePellets.shift()
        if (old) {
          foodGroup.remove(old.mesh)
        }
      }
      const pellet = new THREE.Mesh(pelletGeo, pelletMat)
      const px = pos?.x ?? (Math.random() - 0.5) * (TANK_HALF_W * 1.3)
      const py = pos?.y ?? (WATER_Y - 0.5)
      const pz = pos?.z ?? (Math.random() - 0.5) * (TANK_HALF_D * 1.3)
      pellet.position.set(px, py, pz)
      foodGroup.add(pellet)

      livePellets.push({
        id: `pellet-${Date.now()}-${Math.random()}`,
        mesh: pellet,
        x: px,
        y: py,
        z: pz,
        vy: -1.4 - Math.random() * 0.8,
        active: true,
        age: 0,
      })
    }

    const onDropFood = (pos: { x?: number; y?: number; z?: number }) => {
      spawnFood(pos)
    }
    fishBus.on("feed:drop", onDropFood)

    // Interaction handlers
    // Pointer intent drives the curious/flee boids term (fish/cursorIntent.ts).
    const cursorTracker = createCursorTracker(performance.now())
    let cursorIntent: CursorIntent = "idle"
    const pointer = new THREE.Vector2(-9999, -9999)
    const raycaster = new THREE.Raycaster()
    const cursor3D = new THREE.Vector3()
    let hasCursor3D = false
    const clock = new THREE.Clock()
    let raf = 0
    let disposed = false
    let selected: THREE.Group | null = null
    let hologramSlug: string | null = null
    const lastAnchor = { x: -9999, y: -9999, r: -9999 }
    let lastProg = -1
    let lastAudioAt = -1
    let lastImmersion = -1
    let lastSonarAt = -1

    const orbit = {
      yaw: 0,
      yawT: 0,
      pitch: DEFAULT_PITCH,
      pitchT: DEFAULT_PITCH,
      radius: SURFACE_RADIUS,
      radiusT: SURFACE_RADIUS,
      target: new THREE.Vector3(CAT_X, WATER_Y, 0),
      targetT: new THREE.Vector3(CAT_X, WATER_Y, 0),
      dragging: false,
      lx: 0,
      ly: 0,
      moved: 0,
      prevProg: 0,
    }

    function catchFish(group: THREE.Group) {
      const slug = group.userData?.slug as string | undefined
      if (!slug) return
      fishBus.emit("fish:pick", { slug })
    }

    function release() {
      fishBus.emit("fish:release")
    }

    function onPointerDown(e: PointerEvent) {
      orbit.dragging = true
      orbit.moved = 0
      orbit.lx = e.clientX
      orbit.ly = e.clientY
      renderer.domElement.style.cursor = "grabbing"
      renderer.domElement.setPointerCapture?.(e.pointerId)
    }

    function onPointerUp(e: PointerEvent) {
      orbit.dragging = false
      renderer.domElement.style.cursor = "grab"
      try {
        renderer.domElement.releasePointerCapture?.(e.pointerId)
      } catch {
        /* ignore */
      }
    }

    function onPointerMove(e: PointerEvent) {
      const rect = renderer.domElement.getBoundingClientRect()
      const nextIntent = cursorTracker.sample(e.clientX, e.clientY, performance.now())
      if (isFleeOnset(cursorIntent, nextIntent)) {
        // One startle cue per scatter, not one per frame of fast movement.
        fishBus.emit("audio:fx", { type: "bubble" })
      }
      cursorIntent = nextIntent
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      if (orbit.dragging && !selected) {
        const dx = e.clientX - orbit.lx
        const dy = e.clientY - orbit.ly
        orbit.lx = e.clientX
        orbit.ly = e.clientY
        orbit.moved += Math.abs(dx) + Math.abs(dy)
        orbit.yawT -= dx * 0.005
        orbit.pitchT = clamp(orbit.pitchT + dy * 0.004, MIN_PITCH, MAX_PITCH)
      }

      if (isSubmerged(progRef.current)) {
        const vCursor = new THREE.Vector3(pointer.x, pointer.y, 0.5).unproject(camera)
        const dx = vCursor.x - camera.position.x
        const dy = vCursor.y - camera.position.y
        const dz = vCursor.z - camera.position.z
        const len = Math.hypot(dx, dy, dz) || 1
        const dirZ = dz / len
        if (Math.abs(dirZ) > 0.0001) {
          const dist = -camera.position.z / dirZ
          cursor3D.set(
            camera.position.x + (dx / len) * dist,
            camera.position.y + (dy / len) * dist,
            camera.position.z + (dz / len) * dist,
          )
          hasCursor3D = true
        }
      } else {
        hasCursor3D = false
      }

      // Check hover on giant cat
      if (catParts && !selected && !orbit.dragging) {
        raycaster.setFromCamera(pointer, camera)
        const catHits = raycaster.intersectObjects([catParts.hitBox], false)
        if (catHits.length > 0) {
          renderer.domElement.style.cursor = "pointer"
        }
      }
    }

    function onWheel(e: WheelEvent) {
      if (!isSubmerged(progRef.current)) return
      e.preventDefault()
      if (selected) return
      orbit.radiusT = clamp(
        orbit.radiusT + e.deltaY * 0.02,
        MIN_ORBIT_RADIUS,
        MAX_ORBIT_RADIUS,
      )
    }

    function onClick() {
      if (orbit.moved > 6) return
      raycaster.setFromCamera(pointer, camera)

      // Interactive Click on Giant Cat Mascot
      if (catParts) {
        const catHits = raycaster.intersectObjects([catParts.hitBox], false)
        if (catHits.length > 0) {
          catTriggerSwat = true
          fishBus.emit("audio:fx", { type: "chime", at: { x: CAT_X, y: WATER_Y, z: 0 } })
          return
        }
      }

      if (!isSubmerged(progRef.current)) {
        const hits = raycaster.intersectObjects(
          fishObjs.map((o) => o.mesh),
          true,
        )
        if (hits.length > 0) {
          let obj: THREE.Object3D | null = hits[0].object
          while (obj && !obj.userData?.slug) obj = obj.parent
          if (obj && obj.userData?.slug) catchFish(obj as THREE.Group)
        } else {
          catTriggerSwat = true
        }
        return
      }

      const hits = raycaster.intersectObjects(
        fishObjs.map((o) => o.mesh),
        true,
      )
      if (!hits.length) {
        if (selected) {
          release()
        } else if (hasCursor3D) {
          spawnShockwave(cursor3D.x, cursor3D.z)
          fishBus.emit("audio:fx", { type: "bubble" })
        }
        return
      }
      let obj: THREE.Object3D | null = hits[0].object
      while (obj && !obj.userData?.slug) obj = obj.parent
      if (obj && obj.userData?.slug) catchFish(obj as THREE.Group)
    }

    function onDblClick() {
      if (!isSubmerged(progRef.current)) return
      if (hasCursor3D) {
        spawnFood({ x: cursor3D.x, y: Math.min(WATER_Y - 0.5, cursor3D.y + 4), z: cursor3D.z })
      } else {
        spawnFood()
      }
      fishBus.emit("audio:fx", { type: "bubble" })
    }

    // Keyboard equivalent for onDblClick — "F" drops food when the canvas
    // has focus, since dblclick has no keyboard analogue.
    function onKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "f" && !e.repeat) {
        e.preventDefault()
        onDblClick()
      }
    }

    renderer.domElement.addEventListener("pointerdown", onPointerDown)
    renderer.domElement.addEventListener("pointerup", onPointerUp)
    renderer.domElement.addEventListener("pointerleave", onPointerUp)
    renderer.domElement.addEventListener("pointermove", onPointerMove)
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false })
    renderer.domElement.addEventListener("click", onClick)
    renderer.domElement.addEventListener("dblclick", onDblClick)
    renderer.domElement.addEventListener("keydown", onKeyDown)

    const _v = new THREE.Vector3()
    const _v2 = new THREE.Vector3()
    /** Listener up-vector — the camera never rolls, so this is constant. */
    const WORLD_UP = new THREE.Vector3(0, 1, 0)

    function animate() {
      if (disposed) return
      raf = requestAnimationFrame(animate)
      const dt = Math.min(0.05, clock.getDelta())
      const t = clock.elapsedTime
      // Shader clock — frozen at 0 for prefers-reduced-motion, so the tank stays still.
      const st = t * quality.timeScale
      const prog = clamp(progRef.current, 0, 1)

      // Camera reset on surface return
      if (orbit.prevProg > 0.05 && prog <= 0.05 && !selected) {
        orbit.yawT = 0
        orbit.pitchT = DEFAULT_PITCH
        orbit.radiusT = SURFACE_RADIUS
      }
      orbit.prevProg = prog

      const want = focusedRef.current
      if (want) {
        const match = fishObjs.find((o) => o.data.slug === want)
        if (match && selected !== match.mesh) selected = match.mesh
      } else if (selected && !want) {
        selected = null
        if (prog >= 0.95) {
          orbit.radiusT = SUBMERGED_RADIUS
        }
      }

      const w = host.clientWidth || 640
      const h = immersive ? host.clientHeight || 480 : 320

      if (selected) {
        const sel = selected.userData.data as FishSpecimenInput
        orbit.radiusT = FOCUS_STANDOFF_BASE + clamp01(sel?.size ?? 0.5) * FOCUS_STANDOFF_SCALE
        const sideOffset = w > 820 ? 4.8 : 0
        orbit.targetT.set(
          selected.position.x + Math.cos(orbit.yaw) * sideOffset,
          selected.position.y,
          selected.position.z - Math.sin(orbit.yaw) * sideOffset,
        )
      } else {
        const st = stageOrbitTarget(prog)
        const lockedDepth = depthFocusRef.current
        // A bathymetry lock overrides the dive target height only — yaw, radius
        // and X framing stay wherever the visitor left them.
        orbit.targetT.set(
          st.x,
          lockedDepth == null ? st.y : worldYForDepth(lockedDepth),
          st.z,
        )
        const stageRadius = SUBMERGED_RADIUS + (1 - prog) * (SURFACE_RADIUS - SUBMERGED_RADIUS)
        if (prog < 0.95) {
          orbit.radiusT = stageRadius
        } else {
          orbit.radiusT = clamp(orbit.radiusT, MIN_ORBIT_RADIUS, MAX_ORBIT_RADIUS)
        }
      }

      const distToTarget = orbit.target.distanceTo(orbit.targetT)
      if (selected || distToTarget > 0.08) {
        orbit.target.lerp(orbit.targetT, TARGET_LERP_SPEED)
      } else {
        orbit.target.copy(orbit.targetT)
      }
      orbit.yaw += (orbit.yawT - orbit.yaw) * ORBIT_LERP_SPEED
      orbit.pitch += (orbit.pitchT - orbit.pitch) * ORBIT_LERP_SPEED
      orbit.radius += (orbit.radiusT - orbit.radius) * RADIUS_LERP_SPEED

      const drift = orbit.dragging || selected ? 0 : Math.sin(t * 0.12) * 0.06
      const yaw = orbit.yaw + drift
      const divePitchArc =
        !selected && prog > 0.01 && prog < 0.99
          ? Math.sin(prog * Math.PI) * DIVE_PITCH_ARC
          : 0
      const pitch = clamp(orbit.pitch + divePitchArc, MIN_PITCH, MAX_PITCH)
      camera.position.set(
        orbit.target.x + Math.sin(yaw) * Math.cos(pitch) * orbit.radius,
        orbit.target.y + Math.sin(pitch) * orbit.radius,
        orbit.target.z + Math.cos(yaw) * Math.cos(pitch) * orbit.radius,
      )
      camera.lookAt(orbit.target)

      // Bind the Web Audio listener to the camera (~15Hz is plenty for HRTF)
      // and sweep the waterline filter with how deep the camera actually is.
      if (t - lastAudioAt > 0.066) {
        lastAudioAt = t
        _v.copy(orbit.target).sub(camera.position).normalize()
        fishAudio.setListenerPose(camera.position, _v, WORLD_UP)
        const immersion = clamp((WATER_Y - camera.position.y) / 6, 0, 1)
        if (Math.abs(immersion - lastImmersion) > 0.02) {
          lastImmersion = immersion
          fishAudio.setImmersion(immersion)
        }
      }

      if (scene.fog instanceof THREE.FogExp2) {
        const base = palette.fogDensity * (0.18 + 0.82 * prog)
        const targetDensity = selected ? base * 1.35 : base
        scene.fog.density += (targetDensity - scene.fog.density) * 0.05
        scene.fog.color.set(mixHex(palette.bg, palette.fogColor, prog))
      }
      if (Math.abs(prog - lastProg) > 0.004) {
        lastProg = prog
        backdropMat.color.set(mixHex(palette.bg, palette.deep, prog))
      }

      // Water surface waves are displaced in the vertex shader — just advance its clock.
      waterMat.uniforms.uTime.value = st
      causticClock.value = st
      minnows.update(st * faunaScale)
      // Pointer speed decays between move events so one flick does not pin flee.
      cursorIntent = cursorTracker.tick(performance.now())

      // Bubbles & Marine snow animation
      const bp = bubbles.geometry.attributes.position.array as Float32Array
      for (let i = 1; i < bp.length; i += 3) {
        bp[i] += dt * 1.8
        // subtle wobble
        bp[i - 1] += Math.sin(t * 3 + bp[i] * 2) * dt * 0.4
        if (bp[i] > WATER_Y - 0.2) bp[i] = FLOOR_Y + 0.4
      }
      bubbles.geometry.attributes.position.needsUpdate = true

      const mp = motes.geometry.attributes.position.array as Float32Array
      for (let i = 0; i < mp.length; i += 3) {
        mp[i] += Math.sin(t * 0.2 + mp[i + 1] * 0.1) * dt * 0.25
        mp[i + 1] -= dt * 0.35
        if (mp[i + 1] < FLOOR_Y) mp[i + 1] = WATER_Y - 0.5
      }
      motes.geometry.attributes.position.needsUpdate = true

      // Caustics & God rays
      causticMat.uniforms.uTime.value = st
      rays.rotation.y = Math.sin(st * 0.05) * 0.06
      for (const m of rayMats) m.uniforms.uTime.value = st

      // Seaweed swaying
      for (const rig of weedRigs) {
        const segs = rig.segs.length
        for (let s = 0; s < segs; s++) {
          const seg = rig.segs[s]
          if (!seg) continue
          const amp = 0.06 + (s / segs) * 0.18
          seg.rotation.z = Math.sin(t * 0.75 + rig.seed * 0.9 + s * 0.45) * amp
        }
      }

      // Giant Cat Mascot Gaze-Tracking & Hunting AI Animation
      let catTargetPos: Vec3 | null = null
      let catIsHunting = false

      if (selected) {
        catTargetPos = {
          x: selected.position.x,
          y: selected.position.y,
          z: selected.position.z,
        }
        catIsHunting = true
      } else {
        // Track closest fish or fish near surface
        let closestDistSq = Infinity
        let closestFishPos: Vec3 | null = null
        const catWorldPos = { x: CAT_X, y: WATER_Y, z: 0 }

        for (const f of fishObjs) {
          const fx = f.mesh.position.x - catWorldPos.x
          const fy = f.mesh.position.y - catWorldPos.y
          const fz = f.mesh.position.z - catWorldPos.z
          const dSq = fx * fx + fy * fy + fz * fz
          if (dSq < closestDistSq) {
            closestDistSq = dSq
            closestFishPos = {
              x: f.mesh.position.x,
              y: f.mesh.position.y,
              z: f.mesh.position.z,
            }
          }
        }

        if (closestFishPos && closestDistSq < 35 * 35) {
          catTargetPos = closestFishPos
          if (closestDistSq < 24 * 24 && closestFishPos.y > WATER_Y - 14) {
            catIsHunting = true
            // If swimming right under the perched cat, trigger a swat strike!
            if (closestDistSq < 13 * 13 && closestFishPos.y > WATER_Y - 6) {
              catTriggerSwat = true
            }
          }
        }
      }

      stepCatAnimation(catParts, catAnimState, {
        t,
        dt,
        catWorldPos: { x: CAT_X, y: WATER_Y, z: 0 },
        targetPos: catTargetPos,
        isHunting: catIsHunting,
        triggerSwat: catTriggerSwat,
        onWaterSplash: (pos) => {
          spawnShockwave(pos.x, pos.z)
          fishBus.emit("audio:fx", { type: "bubble", at: pos })
        },
      })
      catTriggerSwat = false

      // Focus visuals: the reticle marks an unlocked hover state, the
      // architecture hologram takes over once a specimen is locked.
      if (selected) {
        const selData = selected.userData.data as FishSpecimenInput | undefined
        if (hologramSlug !== selData?.slug) {
          hologramSlug = selData?.slug ?? null
          hologram.setSpecimen(selData ?? null)
        }
        holoReticle.update(t, selected.position, selData?.size ?? 0.5, true)
        hologram.update(t, selected.position, selData?.size ?? 0.5, true)
      } else {
        if (hologramSlug !== null) {
          hologramSlug = null
          hologram.setSpecimen(null)
        }
        holoReticle.update(t, _v, 1, false)
        hologram.update(t, _v, 1, false)
      }

      const focus = focusedRef.current
      const filter = filterRef.current

      // Food pellets physics & lifespan
      for (let i = livePellets.length - 1; i >= 0; i--) {
        const p = livePellets[i]
        p.age += dt
        if (!p.active) {
          p.mesh.scale.multiplyScalar(0.85)
          if (p.mesh.scale.x < 0.05) {
            foodGroup.remove(p.mesh)
            livePellets.splice(i, 1)
          }
          continue
        }
        p.y += p.vy * dt
        p.x += Math.sin(t * 2.5 + i) * dt * 0.35
        p.mesh.position.set(p.x, p.y, p.z)

        if (p.y <= FLOOR_Y + 0.4 || p.age > 16) {
          p.active = false
        }
      }

      // Prepare boids agents snapshot
      const boidAgents: BoidAgent[] = fishObjs.map((o) => ({
        id: o.data.slug,
        school: o.data.school,
        position: { x: o.mesh.position.x, y: o.mesh.position.y, z: o.mesh.position.z },
        // Real velocity now that bodies are integrated — alignment used to read
        // a yaw-derived guess with a hardcoded zero Y.
        velocity: bodies.get(o.data.slug)?.velocity ?? {
          x: Math.sin(o.mesh.rotation.y) * (o.data.speed || 0.5),
          y: 0,
          z: Math.cos(o.mesh.rotation.y) * (o.data.speed || 0.5),
        },
        size: o.data.size,
        speed: o.data.speed,
      }))

      // Fish swimming & organic S-curve deformation
      for (const o of fishObjs) {
        const focused = selected === o.mesh
        const pose = computeFishPose(o.data, t, {
          focused,
          timeScale: selected ? 0.15 : 1,
        })

        // Sense the nearest pellet and test the mouth in the same pass — the
        // behaviour machine needs the distance the eat check already computes.
        let sensed: SensedFood | null = null
        let ate = false
        if (!focused && livePellets.length > 0) {
          let bestSq = SENSE_DIST * SENSE_DIST
          let best: LivePellet | null = null
          for (const p of livePellets) {
            if (!p.active) continue
            const dx = o.mesh.position.x - p.x
            const dy = o.mesh.position.y - p.y
            const dz = o.mesh.position.z - p.z
            const mouthDistSq = dx * dx + dy * dy + dz * dz
            if (!ate && mouthDistSq < 4.5 * pose.scale) {
              p.active = false
              ate = true
              fishBus.emit("feed:eaten", { pelletId: p.id, slug: o.data.slug })
              fishBus.emit("audio:fx", {
                type: "eat",
                at: { x: p.x, y: p.y, z: p.z },
              })
              o.mesh.userData.boostGlow = 1.0
              continue
            }
            if (mouthDistSq < bestSq) {
              bestSq = mouthDistSq
              best = p
            }
          }
          if (best) {
            sensed = {
              id: best.id,
              position: { x: best.x, y: best.y, z: best.z },
              distance: Math.sqrt(bestSq),
            }
          }
        }

        const behavior = stepFishBehavior(
          behaviors.get(o.data.slug) ?? createFishBehavior(),
          { dt, focused, food: sensed, ate },
        )
        behaviors.set(o.data.slug, behavior)
        // Only chase the pellet the machine actually committed to: the nearest
        // pellet can change mid-approach, and following it blindly would make a
        // fish stutter between two falling crumbs.
        const foodTarget =
          sensed && behavior.targetId === sensed.id ? sensed.position : null
        const target = swimTarget(behavior, pose.position, foodTarget)

        // Boids steering force
        const agent = boidAgents.find((a) => a.id === o.data.slug)
        const steer =
          agent && !focused
            ? computeSteeringForce(
                agent,
                boidAgents,
                hasCursor3D ? cursor3D : null,
                livePellets,
                { cursorMode: cursorIntent },
              )
            : { x: 0, y: 0, z: 0 }

        // Apply smooth steering delta
        const steerSmooth = (o.mesh.userData.steer as Vec3 | undefined) || { x: 0, y: 0, z: 0 }
        steerSmooth.x += (steer.x - steerSmooth.x) * 0.08
        steerSmooth.y += (steer.y - steerSmooth.y) * 0.08
        steerSmooth.z += (steer.z - steerSmooth.z) * 0.08
        o.mesh.userData.steer = steerSmooth

        _swimTarget.x = target.x
        _swimTarget.y = target.y
        _swimTarget.z = target.z

        let body = bodies.get(o.data.slug)
        if (!body) {
          body = createSwimBody(pose.position, pose.yaw)
          bodies.set(o.data.slug, body)
        }
        const cruise = maxSpeedFor(o.data.speed) * behaviorTimeScale(behavior.state)
        // Shoal steering is a sideways shove on the *velocity*, not a displaced
        // target: separation flips sign as two fish pass each other, and a
        // flipping target swings across the fish and spins it. A committed hunt
        // also stops listening to the shoal.
        // 0.18 is measured, not guessed: the path and the boids are two
        // controllers steering one fish, and above ~0.2 the shoal term wins and
        // the fish wags around the compromise instead of following its path.
        const steerGain = (1 - behavior.commit * 0.75) * cruise * 0.18
        _swimBias.x = steerSmooth.x * steerGain
        _swimBias.y = steerSmooth.y * steerGain * 0.7
        _swimBias.z = steerSmooth.z * steerGain
        stepSwimBody(
          body,
          _swimTarget,
          dt,
          {
            maxSpeed: cruise,
            accel: cruise * 3.6,
            turnRate: 2.6,
            arriveRadius: 2.2,
            minSpeed: minSpeedFor(cruise),
          },
          _swimBias,
        )
        clampToBounds(body, SWIM_MIN, SWIM_MAX)

        o.mesh.position.set(body.position.x, body.position.y, body.position.z)
        o.mesh.rotation.y = body.yaw

        if (!focused) {
          const prev = o.mesh.userData.prevYaw as number | undefined
          const dYaw = prev == null ? 0 : shortestAngle(body.yaw - prev)
          o.mesh.userData.prevYaw = body.yaw
          // Bank out of the turn the body actually took, not out of the ideal
          // path heading — the two now differ, and the body is what is drawn.
          const bank = clamp((dYaw / Math.max(dt, 0.001)) * 0.16, -0.5, 0.5)
          o.mesh.rotation.z += (bank - o.mesh.rotation.z) * 0.08
          o.mesh.rotation.x = Math.sin(t * 1.4 * o.data.speed + o.data.depth * 6) * 0.06
        }

        // Organic S-Curve Spine & Segment Undulation
        const { spineSegments, pecL, pecR, tentacles } = o.built
        // Beat rate tracks how fast the fish is *actually* moving, so a dash to
        // food and a coast home are legible in the body, not only in the path.
        const swimSpeed =
          (o.data.speed || 0.5) * 7.5 * (0.45 + 0.55 * Math.min(1.6, bodySpeed(body) / cruise))
        // Integrated rather than sampled from the global clock: multiplying `t`
        // by a rate that changes with speed would jump the wave phase on every
        // change, which reads as a twitch.
        const tailPhase = ((o.mesh.userData.tailPhase as number | undefined) ?? 0) + dt * swimSpeed
        o.mesh.userData.tailPhase = tailPhase

        if (spineSegments.length > 1) {
          spineSegments.forEach((seg, sIdx) => {
            const phaseLag = sIdx * 0.65
            const amp = 0.08 + sIdx * 0.07
            seg.rotation.y = Math.sin(tailPhase - phaseLag) * amp
          })
        }

        // Pectoral fin flapping
        if (pecL && pecR) {
          const beat = Math.sin(t * 8 * (0.4 + o.data.speed)) * 0.35
          pecL.rotation.x = beat
          pecR.rotation.x = -beat
        }

        // Jellyfish tentacle wave
        if (tentacles && tentacles.length > 0) {
          const dome = spineSegments[0]
          if (dome) {
            const pulse = 1 + Math.sin(t * 3.5) * 0.15
            dome.scale.set(1 / Math.sqrt(pulse), pulse, 1 / Math.sqrt(pulse))
          }
          tentacles.forEach((ten, idx) => {
            ten.rotation.z = Math.sin(t * 3 + idx * 0.8) * 0.25
            ten.rotation.x = Math.cos(t * 3 + idx * 0.8) * 0.25
          })
        }

        // Glow boost decay after eating
        const boost = (o.mesh.userData.boostGlow as number | undefined) || 0
        if (boost > 0) {
          o.mesh.userData.boostGlow = Math.max(0, boost - dt * 0.8)
        }

        const lit = fishLitFactor(o.data, filter, focus)
        const scaleMul = (lit > 1 ? 1.15 : lit < 0.5 ? 0.72 : 1) * (1 + boost * 0.15)
        o.mesh.scale.setScalar(pose.scale * scaleMul)

        const opacityBase = lit < 0.3 ? 0.35 : 0.75 + Math.min(1, lit) * 0.25
        o.built.body.opacity = opacityBase
        o.built.fin.opacity = 0.5 + Math.min(1, lit) * 0.45
        o.built.body.emissiveIntensity =
          Math.max(0.25, (o.data.glow + boost * 0.8) * 0.85 * Math.min(1, lit) * (light ? 0.6 : 1.1))
        o.built.fin.emissiveIntensity =
          Math.max(0.35, (o.data.glow + boost * 1.0) * 1.2 * Math.min(1, lit) * (light ? 0.6 : 1.25))
        o.built.glow.intensity =
          (o.data.glow + boost * 1.2) *
          2.4 *
          Math.min(1, lit) *
          (focused ? 2.8 : 1) *
          (light ? 0.75 : 1.25)

        _v.copy(o.mesh.position)
        _v.y -= 1.6 * pose.scale
        _v.project(camera)
        const behind = _v.z > 1
        const inTank = prog > 0.55
        // Any lock hides every name pill, the focused fish included: the
        // dossier names it, so a pill on top is just text over the specimen.
        const hiddenByLock = selected != null
        const vis =
          inTank &&
          !hiddenByLock &&
          !behind &&
          Math.abs(_v.x) < 1.1 &&
          Math.abs(_v.y) < 1.1 &&
          lit > 0.35
        o.label.style.display = vis ? "flex" : "none"
        if (vis) {
          o.label.style.left = `${(_v.x * 0.5 + 0.5) * w}px`
          o.label.style.top = `${(-_v.y * 0.5 + 0.5) * h}px`
          o.label.style.opacity = String(Math.min(1, lit))
          const typedLabel = o.label as HTMLDivElement & {
            _pill: HTMLDivElement
            _hex: string
          }
          if (typedLabel._pill) {
            const isHot = focused || lit > 1
            const hex = typedLabel._hex
            typedLabel._pill.style.boxShadow = isHot
              ? `0 0 16px ${hex}aa,0 0 6px ${hex}77,0 2px 12px rgba(0,0,0,.6)`
              : `0 2px 10px rgba(0,0,0,.4)`
            typedLabel._pill.style.borderColor = isHot
              ? `${hex}ee`
              : `${hex}99`
          }
        }

        // Emit bioluminescent wake particles behind fish tail
        const col = domainColor(o.data.species)
        const isEmitting = Math.random() < (0.35 + (o.data.speed || 0.5) * 0.45 + boost * 0.3)
        if (isEmitting && prog > 0.4) {
          wakePool.emit(
            o.mesh.position.x,
            o.mesh.position.y,
            o.mesh.position.z,
            { r: col.r ?? 0.5, g: col.g ?? 0.8, b: col.b ?? 1.0 },
            { size: (o.data.glow * 1.6 + 0.9) * (boost ? 1.6 : 1), maxLife: 1.3 + boost * 0.6 },
          )
        }
      }

      // Update shockwaves
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i]
        sw.r += dt * 16
        const progress = sw.r / sw.maxR
        sw.opacity = Math.max(0, (1 - progress) * 0.75)
        sw.mesh.scale.set(sw.r, 1, sw.r)
        ;(sw.mesh.material as THREE.MeshBasicMaterial).opacity = sw.opacity
        if (progress >= 1) {
          sw.active = false
          tank.remove(sw.mesh)
          ;(sw.mesh.material as THREE.Material).dispose()
          shockwaves.splice(i, 1)
        }
      }

      // Pack live wake particles at the front so we only draw/upload actives.
      wakePool.update(dt)
      const wp = wakeGeo.attributes.position.array as Float32Array
      const wc = wakeGeo.attributes.color.array as Float32Array
      let wakeLive = 0
      for (let i = 0; i < wakePool.particles.length; i++) {
        const p = wakePool.particles[i]
        if (p.alpha <= 0.001) continue
        wp[wakeLive * 3] = p.x
        wp[wakeLive * 3 + 1] = p.y
        wp[wakeLive * 3 + 2] = p.z
        wc[wakeLive * 3] = p.r * p.alpha
        wc[wakeLive * 3 + 1] = p.g * p.alpha
        wc[wakeLive * 3 + 2] = p.b * p.alpha
        wakeLive++
      }
      wakeGeo.setDrawRange(0, wakeLive)
      wakeGeo.attributes.position.needsUpdate = true
      wakeGeo.attributes.color.needsUpdate = true

      // Publish sonar contacts. 40 specimens at 60fps would be pure waste —
      // the radar only needs to feel live, so it runs at ~10Hz.
      if (prog > 0.4 && t - lastSonarAt > 0.1) {
        lastSonarAt = t
        fishBus.emit(
          "tank:sonar",
          projectSonarBlips(
            fishObjs.map((o) => ({
              slug: o.data.slug,
              species: o.data.species,
              school: o.data.school,
              x: o.mesh.position.x,
              y: o.mesh.position.y,
              z: o.mesh.position.z,
              lit: Math.min(1, fishLitFactor(o.data, filter, focus)),
            })),
            orbit.yaw,
            { x: orbit.target.x, z: orbit.target.z },
          ),
        )
      }

      // Publish dossier anchor
      if (selected) {
        _v.copy(selected.position)
        _v.project(camera)
        const ax = (_v.x * 0.5 + 0.5) * w
        const ay = (-_v.y * 0.5 + 0.5) * h
        const worldR = 2.4 * selected.scale.x
        _v2.copy(selected.position)
        _v2.y += worldR
        _v2.project(camera)
        const topY = (-_v2.y * 0.5 + 0.5) * h
        const ar = Math.max(24, Math.abs(ay - topY))
        if (
          Math.abs(ax - lastAnchor.x) > 2 ||
          Math.abs(ay - lastAnchor.y) > 2 ||
          Math.abs(ar - lastAnchor.r) > 4
        ) {
          lastAnchor.x = ax
          lastAnchor.y = ay
          lastAnchor.r = ar
          fishBus.emit("fish:anchor", { x: ax, y: ay, r: ar, w, h })
        }
      } else if (lastAnchor.x !== -9999) {
        lastAnchor.x = -9999
        lastAnchor.y = -9999
        fishBus.emit("fish:anchor", null)
      }

      // Wobble ramps in as the camera sinks below the waterline and deepens
      // with dive progress. Absorption rides scene.fog.density instead.
      const submerged = clamp((WATER_Y - camera.position.y) / 6, 0, 1)
      composer.render({
        time: st,
        wobble: submerged * (0.35 + 0.65 * prog),
        focusDistance: selected ? camera.position.distanceTo(selected.position) : 0,
      })
    }
    animate()

    return () => {
      disposed = true
      applyPaletteRef.current = null
      cancelAnimationFrame(raf)
      cancelAnimationFrame(paletteFrame)
      unsubStore()
      unsubProgress()
      fishBus.emit("fish:anchor", null)
      ro?.disconnect()
      renderer.domElement.removeEventListener("pointerdown", onPointerDown)
      renderer.domElement.removeEventListener("pointerup", onPointerUp)
      renderer.domElement.removeEventListener("pointerleave", onPointerUp)
      renderer.domElement.removeEventListener("pointermove", onPointerMove)
      renderer.domElement.removeEventListener("wheel", onWheel)
      renderer.domElement.removeEventListener("click", onClick)
      renderer.domElement.removeEventListener("dblclick", onDblClick)
      renderer.domElement.removeEventListener("keydown", onKeyDown)
      fishBus.off("feed:drop", onDropFood)
      holoReticle.dispose()
      hologram.dispose()
      minnows.dispose()
      composer.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement)
      if (labelLayer.parentNode === host) host.removeChild(labelLayer)
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose?.()
          const mat = obj.material
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose?.())
          else mat?.dispose?.()
        }
      })
      // Shared geos/mats may already be gone if a mesh was still in the group;
      // dispose again is safe, and covers the emptied-group case.
      shockRingGeo.dispose()
      pelletGeo.dispose()
      shockMat.dispose()
      pelletMat.dispose()
    }
    // `fish` / `highlightSlugs` are intentionally absent: they are read through
    // refs and represented by rosterKey/highlightKey, so a same-roster patch
    // does not remount the WebGL scene.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rosterKey, immersive, themeKey, highlightKey])

  useEffect(() => {
    applyPaletteRef.current?.(circadian)
  }, [circadian])

  return (
    <div
      ref={hostRef}
      className={
        immersive
          ? "relative h-full w-full min-h-[min(70vh,720px)]"
          : "relative w-full h-[320px]"
      }
    />
  )
}
