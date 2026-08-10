/**
 * Three.js fish-tank renderer — the only module that imports `three`.
 * Math: fishTankLayout · meshes: fish/speciesMeshes · tokens: fishTankTokens.
 * Dossier/HUD live in React components (react-app-guide: views stay DOM, canvas is WebGL only).
 */

import { useEffect, useRef } from "react"
import * as THREE from "three"
import {
  CAT_X,
  CAT_Y,
  clamp01,
  WATER_Y,
  FLOOR_Y,
  TANK_HEIGHT,
  TANK_CENTER_Y,
  TANK_HALF_W,
  TANK_HALF_D,
  MAX_ORBIT_RADIUS,
  MIN_ORBIT_RADIUS,
  MAX_PITCH,
  MIN_PITCH,
  clamp,
  computeFishPose,
  stageOrbitTarget,
  viewOffsetX,
  type FishSpecimenInput,
} from "./fishTankLayout"
import {
  mixHex,
  resolveTankThemePalette,
  tokenToHex,
  SPECIES_FALLBACK_HEX,
  SPECIES_TOKEN,
  type TankThemePalette,
} from "./fishTankTokens"
import {
  buildCatMesh,
  buildCausticTexture,
  buildCoral,
  buildFishMesh,
  buildPointSprite,
  buildSeaweed,
} from "@/fish/speciesMeshes"
import type { DomainIdType } from "@/content/schema"

export interface FishTankCanvasProps {
  fish: FishSpecimenInput[]
  immersive?: boolean
  focusedSlug?: string | null
  highlightSlugs?: string[]
  onFocusChange?: (slug: string | null) => void
  stageProgress?: number
  /** Controller-supplied dimming; defaults to highlight-only. */
  litFactor?: (f: FishSpecimenInput) => number
  /** Theme id / accent stamp — remounts lights when the shell theme changes. */
  themeKey?: string
  /**
   * Locked fish position in canvas-local px, plus the canvas box, so DOM chrome
   * can dock beside it and clamp in the SAME space. null when released.
   */
  onFocusAnchor?: (
    anchor: {
      x: number
      y: number
      /** Projected radius of the specimen in px — chrome must clear this. */
      r: number
      w: number
      h: number
    } | null,
  ) => void
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

function defaultLit(
  f: FishSpecimenInput,
  highlight: Set<string>,
  focused: string | null,
): number {
  if (focused && f.slug === focused) return 1
  if (highlight.size === 0) return 1
  return highlight.has(f.slug) ? 1.12 : 0.72
}

/** Default-export lazy canvas — Three WebGL aquarium (no DOM chrome). */
export default function FishTankCanvas({
  fish,
  immersive = false,
  focusedSlug = null,
  highlightSlugs = [],
  onFocusChange,
  stageProgress = 1,
  litFactor,
  themeKey = "default",
  onFocusAnchor,
}: FishTankCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const focusedRef = useRef(focusedSlug)
  const stageRef = useRef(stageProgress)
  const highlightRef = useRef(new Set(highlightSlugs))
  const onFocusRef = useRef(onFocusChange)
  const litRef = useRef(litFactor)
  const onAnchorRef = useRef(onFocusAnchor)

  focusedRef.current = focusedSlug
  stageRef.current = stageProgress
  highlightRef.current = new Set(highlightSlugs)
  onFocusRef.current = onFocusChange
  litRef.current = litFactor
  onAnchorRef.current = onFocusAnchor

  useEffect(() => {
    const root = hostRef.current
    if (!root) return
    const host: HTMLDivElement = root

    // NOTE: child effects run BEFORE ThemeProvider's parent effect writes the
    // new CSS vars, so on a theme switch this first sample still sees the OLD
    // theme. Scene colours are therefore re-applied one frame later via
    // applyPalette() below — do not "simplify" this into a single read.
    let palette: TankThemePalette = resolveTankThemePalette()
    const light = palette.light

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(palette.bg)
    scene.fog = new THREE.FogExp2(palette.fogColor, palette.fogDensity)

    const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 400)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    host.appendChild(renderer.domElement)
    renderer.domElement.style.width = "100%"
    renderer.domElement.style.height = immersive ? "100%" : "320px"
    renderer.domElement.style.display = "block"
    renderer.domElement.style.borderRadius = immersive ? "0" : "var(--radius)"
    renderer.domElement.style.cursor = "grab"
    renderer.domElement.setAttribute("aria-label", "Interactive portfolio fish tank")

    const tank = new THREE.Group()
    scene.add(tank)

    // Two lighting environments, one medium (see resolveTankThemePalette):
    // light = shallow sunlit lagoon, dark = night dive lit by the surface shaft
    // plus bioluminescent accents.
    const ambient = new THREE.AmbientLight(
      palette.ambientColor,
      palette.ambientIntensity,
    )
    scene.add(ambient)
    const hemi = new THREE.HemisphereLight(
      palette.hemiSky,
      palette.hemiGround,
      palette.hemiIntensity,
    )
    hemi.position.set(0, WATER_Y + 10, 0)
    scene.add(hemi)
    // Key comes straight down through the surface — sunlight in water is a
    // vertical shaft, not a studio three-point rig.
    const top = new THREE.DirectionalLight(palette.keyColor, palette.keyIntensity)
    top.position.set(6, WATER_Y + 40, 8)
    scene.add(top)
    const fill = new THREE.PointLight(palette.fillColor, palette.fillIntensity, 120)
    fill.position.set(-10, TANK_CENTER_Y + 6, 20)
    scene.add(fill)
    const accentFill = new THREE.PointLight(palette.accent, light ? 0.55 : 1.5, 70)
    accentFill.position.set(14, WATER_Y - 6, -10)
    scene.add(accentFill)
    // Cold uplight off the bed keeps the deep end from crushing to pure black.
    const bedBounce = new THREE.PointLight(
      palette.cyan,
      light ? 0.35 : 0.7,
      TANK_HEIGHT,
    )
    bedBounce.position.set(0, FLOOR_Y + 4, 0)
    scene.add(bedBounce)

    // Depth backdrop: a far wall in the deep tone so fog has something to
    // dissolve into. Without it, distant water reads as flat page background.
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

    // Glass aligned so surface = top, floor = bottom (not origin-centred mid-floor).
    const glassH = TANK_HEIGHT + 0.5
    const glassW = TANK_HALF_W * 2
    const glassD = TANK_HALF_D * 2
    const box = new THREE.BoxGeometry(glassW, glassH, glassD)
    const edges = new THREE.EdgesGeometry(box)
    const glassMat = new THREE.LineBasicMaterial({
      color: palette.glass,
      transparent: true,
      opacity: light ? 0.18 : 0.24,
    })
    const glass = new THREE.LineSegments(edges, glassMat)
    glass.position.y = TANK_CENTER_Y
    tank.add(glass)

    const waterGeo = new THREE.PlaneGeometry(glassW, glassD, 40, 24)
    waterGeo.rotateX(-Math.PI / 2)
    const waterMat = new THREE.MeshStandardMaterial({
      color: palette.water,
      transparent: true,
      opacity: light ? 0.28 : 0.38,
      roughness: 0.25,
      metalness: 0.08,
      side: THREE.DoubleSide,
      emissive: new THREE.Color(palette.water),
      emissiveIntensity: light ? 0.08 : 0.18,
    })
    const water = new THREE.Mesh(waterGeo, waterMat)
    water.position.y = WATER_Y
    const posArr = waterGeo.attributes.position.array
    const basePos =
      posArr instanceof Float32Array
        ? posArr.slice()
        : Float32Array.from(posArr as ArrayLike<number>)
    water.userData.base = basePos
    tank.add(water)

    // True seabed at FLOOR_Y (deep), not mid-column.
    const floorMat = new THREE.MeshStandardMaterial({
      color: palette.floor,
      roughness: 0.92,
      metalness: 0.05,
    })
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(glassW - 0.4, 0.55, glassD - 0.4),
      floorMat,
    )
    floor.position.y = FLOOR_Y
    tank.add(floor)

    // Caustics: the surface's dappled light on the bed. Scrolled per frame.
    const caustic = buildCausticTexture()
    let causticMat: THREE.MeshBasicMaterial | null = null
    if (caustic) {
      causticMat = new THREE.MeshBasicMaterial({
        map: caustic,
        transparent: true,
        opacity: palette.causticStrength,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        color: new THREE.Color(palette.sun),
      })
      const causticPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(glassW - 1, glassD - 1),
        causticMat,
      )
      causticPlane.rotation.x = -Math.PI / 2
      causticPlane.position.y = FLOOR_Y + 0.32
      causticPlane.name = "caustics"
      tank.add(causticPlane)
    }

    // God rays: wide translucent cones hanging from the surface. Additive and
    // depth-write-off so they layer instead of clipping the fish.
    // God rays. These must stay near-invisible per-surface: additive blending
    // stacks them, so anything above ~0.05 stops reading as light and starts
    // reading as solid grey cones sitting in the water.
    const rayMat = new THREE.MeshBasicMaterial({
      color: palette.sun,
      transparent: true,
      opacity: palette.rayStrength,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    })
    const rays = new THREE.Group()
    for (let i = 0; i < 7; i++) {
      // Tall and narrow, open-ended, many radial segments so the silhouette is
      // a soft column rather than a faceted pyramid.
      const h = TANK_HEIGHT * (1.15 + (i % 3) * 0.12)
      const ray = new THREE.Mesh(
        new THREE.ConeGeometry(1.6 + (i % 4) * 0.55, h, 12, 1, true),
        rayMat,
      )
      ray.position.set(
        (i - 3) * (TANK_HALF_W * 0.3),
        WATER_Y - h / 2 + 3,
        ((i % 4) - 1.5) * 9,
      )
      ray.rotation.z = (i - 3) * 0.035
      rays.add(ray)
    }
    tank.add(rays)

    const rockGeo = new THREE.DodecahedronGeometry(1, 0)
    const rockMat = new THREE.MeshStandardMaterial({
      color: palette.rock,
      roughness: 0.9,
      flatShading: true,
    })
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

    // Seabed planting — depth cues you can swim past, and motion at the edges
    // of frame so a slow orbit never feels static.
    const weedColor = new THREE.Color(palette.weed)
    const weeds: THREE.Group[] = []
    for (let i = 0; i < 18; i++) {
      const stalk = buildSeaweed(5 + (i % 4) * 2.6, weedColor, i)
      stalk.position.set(
        (i / 17 - 0.5) * (glassW - 4),
        FLOOR_Y + 0.2,
        ((i % 6) - 2.5) * (TANK_HALF_D * 0.32),
      )
      tank.add(stalk)
      weeds.push(stalk)
    }
    for (let i = 0; i < 5; i++) {
      const coral = buildCoral(
        new THREE.Color(i % 2 ? palette.accent : palette.neon),
        0.9 + (i % 3) * 0.4,
      )
      coral.position.set(
        (i - 2) * (TANK_HALF_W * 0.42),
        FLOOR_Y + 0.4,
        ((i % 3) - 1) * (TANK_HALF_D * 0.5),
      )
      tank.add(coral)
    }

    const cat = buildCatMesh(WATER_Y)
    // Sit the cat on the rim, off to the right of the surface camera target so
    // it lands beside the hero copy (which owns the left half of the viewport).
    cat.position.x = CAT_X
    cat.scale.setScalar(1.35)
    tank.add(cat)
    // The cat is above the waterline, outside the reach of every underwater
    // light — without its own key it renders as a black silhouette on a dark
    // scene, which is exactly "the cat doesn't show up".
    const catKey = new THREE.PointLight(palette.accent, light ? 1.6 : 2.4, 60)
    catKey.position.set(CAT_X + 6, CAT_Y + 9, 16)
    scene.add(catKey)
    const catFill = new THREE.PointLight(palette.sun, light ? 0.9 : 1.2, 45)
    catFill.position.set(CAT_X - 8, CAT_Y + 2, 12)
    scene.add(catFill)

    // Marine snow: slow-drifting particulate. The single strongest "this is
    // water, not air" cue available without a custom shader.
    const moteCount = 320
    const motePos = new Float32Array(moteCount * 3)
    for (let i = 0; i < moteCount; i++) {
      motePos[i * 3] = (Math.random() - 0.5) * glassW
      motePos[i * 3 + 1] = FLOOR_Y + Math.random() * TANK_HEIGHT
      motePos[i * 3 + 2] = (Math.random() - 0.5) * glassD
    }
    const moteGeo = new THREE.BufferGeometry()
    moteGeo.setAttribute("position", new THREE.BufferAttribute(motePos, 3))
    const pointSprite = buildPointSprite()
    const moteMat = new THREE.PointsMaterial({
      color: palette.motes,
      size: light ? 0.3 : 0.42,
      map: pointSprite,
      transparent: true,
      opacity: light ? 0.3 : 0.7,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const motes = new THREE.Points(moteGeo, moteMat)
    tank.add(motes)

    const bubbleCount = 90
    const bubblePos = new Float32Array(bubbleCount * 3)
    const waterCol = WATER_Y - FLOOR_Y
    for (let i = 0; i < bubbleCount; i++) {
      bubblePos[i * 3] = (Math.random() - 0.5) * (glassW - 4)
      bubblePos[i * 3 + 1] = FLOOR_Y + 0.5 + Math.random() * waterCol
      bubblePos[i * 3 + 2] = (Math.random() - 0.5) * (glassD - 4)
    }
    const bubbleGeo = new THREE.BufferGeometry()
    bubbleGeo.setAttribute("position", new THREE.BufferAttribute(bubblePos, 3))
    const bubbleMat = new THREE.PointsMaterial({
      color: palette.bubble,
      size: light ? 0.42 : 0.58,
      map: pointSprite,
      transparent: true,
      opacity: light ? 0.5 : 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const bubbles = new THREE.Points(bubbleGeo, bubbleMat)
    tank.add(bubbles)

    type FishObj = {
      mesh: THREE.Group
      data: FishSpecimenInput
      body: THREE.MeshStandardMaterial
      fin: THREE.MeshStandardMaterial
      glow: THREE.PointLight
      label: HTMLDivElement
    }
    const fishObjs: FishObj[] = []
    const labelLayer = document.createElement("div")
    labelLayer.style.cssText =
      "position:absolute;inset:0;pointer-events:none;overflow:hidden;"
    host.style.position = host.style.position || "relative"
    host.appendChild(labelLayer)

    for (const f of fish) {
      const species = domainColor(f.species)
      const built = buildFishMesh(f, species)
      tank.add(built.group)

      // Domain hex for theming the label
      const labelHex = `#${species.getHex().toString(16).padStart(6, "0")}`
      const labelHexMid = `${labelHex}66` // ~40% alpha for bg
      const labelHexBorder = `${labelHex}99` // ~60% alpha for border

      // Wrapper — positions the whole label, never clipped by overflow
      const label = document.createElement("div")
      label.style.cssText = [
        "position:absolute",
        "transform:translate(-50%,0)",
        "display:none",
        "flex-direction:column",
        "align-items:center",
        "gap:0",
        "pointer-events:none",
        "user-select:none",
        "will-change:transform",
      ].join(";")

      // Vertical connector tick from fish body up to the pill
      const tick = document.createElement("div")
      tick.style.cssText = [
        "width:1px",
        "height:10px",
        `background:linear-gradient(to top,${labelHex},transparent)`,
        "margin-bottom:0",
        "order:0",
      ].join(";")

      // Pill: domain badge + title
      const pill = document.createElement("div")
      pill.style.cssText = [
        "display:flex",
        "align-items:center",
        "gap:5px",
        "padding:3px 8px 3px 5px",
        "border-radius:999px",
        `background:color-mix(in srgb,${labelHex} 14%,rgba(0,0,0,0.55))`,
        `border:1px solid ${labelHexBorder}`,
        "backdrop-filter:blur(6px)",
        "-webkit-backdrop-filter:blur(6px)",
        `box-shadow:0 0 8px ${labelHexMid},0 2px 10px rgba(0,0,0,.4)`,
        "white-space:nowrap",
        "order:1",
      ].join(";")

      // Domain badge abbreviation (first 2–3 chars of species, uppercased)
      const badge = document.createElement("span")
      const abbr = (f.species ?? "?").slice(0, 3).toUpperCase()
      badge.textContent = abbr
      badge.style.cssText = [
        `color:${labelHex}`,
        `background:color-mix(in srgb,${labelHex} 22%,transparent)`,
        `border:1px solid ${labelHexBorder}`,
        "font:700 8px/1 ui-monospace,monospace",
        "letter-spacing:.06em",
        "border-radius:4px",
        "padding:2px 4px",
      ].join(";")

      // Project title text
      const titleEl = document.createElement("span")
      titleEl.textContent = f.title
      titleEl.style.cssText = [
        "color:#fff",
        "font:600 11px/1.2 ui-monospace,monospace",
        "letter-spacing:.02em",
        `text-shadow:0 1px 4px rgba(0,0,0,.8),0 0 12px ${labelHex}88`,
      ].join(";")

      pill.appendChild(badge)
      pill.appendChild(titleEl)
      label.appendChild(tick)
      label.appendChild(pill)
      labelLayer.appendChild(label)

      // Keep references to sub-elements for per-frame updates
      ;(label as HTMLDivElement & { _tick: HTMLDivElement; _pill: HTMLDivElement; _hex: string })._tick = tick
      ;(label as HTMLDivElement & { _tick: HTMLDivElement; _pill: HTMLDivElement; _hex: string })._pill = pill
      ;(label as HTMLDivElement & { _tick: HTMLDivElement; _pill: HTMLDivElement; _hex: string })._hex = labelHex
      fishObjs.push({
        mesh: built.group,
        data: f,
        body: built.body,
        fin: built.fin,
        glow: built.glow,
        label,
      })
    }

    /**
     * Re-tint the live scene from freshly sampled CSS vars. Called one frame
     * after mount (and after any theme switch) because ThemeProvider writes the
     * new vars in a parent effect that runs after this child effect.
     */
    function applyPalette(p: TankThemePalette) {
      palette = p
      const lit = p.light
      scene.background = new THREE.Color(p.bg)
      if (scene.fog) {
        scene.fog.color.set(p.fogColor)
        scene.fog.density = p.fogDensity
      }
      ambient.color.set(p.ambientColor)
      ambient.intensity = p.ambientIntensity
      hemi.color.set(p.hemiSky)
      hemi.groundColor.set(p.hemiGround)
      hemi.intensity = p.hemiIntensity
      top.color.set(p.keyColor)
      top.intensity = p.keyIntensity
      fill.color.set(p.fillColor)
      fill.intensity = p.fillIntensity
      accentFill.color.set(p.accent)
      accentFill.intensity = lit ? 0.55 : 1.5
      bedBounce.color.set(p.cyan)
      bedBounce.intensity = lit ? 0.35 : 0.7
      backdropMat.color.set(p.deep)
      glassMat.color.set(p.glass)
      glassMat.opacity = lit ? 0.18 : 0.24
      waterMat.color.set(p.water)
      waterMat.emissive.set(p.water)
      waterMat.opacity = lit ? 0.28 : 0.38
      waterMat.emissiveIntensity = lit ? 0.08 : 0.18
      floorMat.color.set(p.floor)
      rockMat.color.set(p.rock)
      bubbleMat.color.set(p.bubble)
      bubbleMat.opacity = lit ? 0.5 : 0.85
      bubbleMat.size = lit ? 0.42 : 0.58
      moteMat.color.set(p.motes)
      moteMat.opacity = lit ? 0.3 : 0.7
      moteMat.size = lit ? 0.3 : 0.42
      rayMat.color.set(p.sun)
      if (causticMat) {
        causticMat.color.set(p.sun)
        causticMat.opacity = p.causticStrength
      }
      for (const weed of weeds) {
        weed.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            const m = o.material
            if (!Array.isArray(m) && m instanceof THREE.MeshStandardMaterial) {
              m.color.set(p.weed)
              m.emissive.set(p.weed)
            }
          }
        })
      }
    }
    const paletteFrame = requestAnimationFrame(() => {
      if (!disposed) applyPalette(resolveTankThemePalette())
    })

    const surfaceLook = stageOrbitTarget(0)
    const orbit = {
      // Default radius at surface: pulled back wide so the cat + rim reads well.
      yaw: 0,
      pitch: 0.1,
      radius: 36,
      yawT: 0,
      pitchT: 0.1,
      radiusT: 36,
      target: new THREE.Vector3(surfaceLook.x, surfaceLook.y, surfaceLook.z),
      targetT: new THREE.Vector3(surfaceLook.x, surfaceLook.y, surfaceLook.z),
      dragging: false,
      moved: 0,
      lx: 0,
      ly: 0,
      /** Track previous frame prog to detect surface-return crossing. */
      prevProg: 0,
    }
    const pointer = new THREE.Vector2(-2, -2)
    const raycaster = new THREE.Raycaster()
    const view = { shift: 0, applied: false }
    let selected: THREE.Group | null = null
    const clock = new THREE.Clock()
    let raf = 0
    let disposed = false
    let lastProg = -1
    const lastAnchor = { x: -9999, y: -9999, r: 0 }

    function release() {
      selected = null
      onFocusRef.current?.(null)
    }

    function catchFish(mesh: THREE.Group) {
      selected = mesh
      const data = mesh.userData.data as FishSpecimenInput
      onFocusRef.current?.(data.slug)
    }

    function resize() {
      const w = host.clientWidth || 640
      const h = immersive ? host.clientHeight || 480 : 320
      camera.aspect = w / Math.max(1, h)
      camera.updateProjectionMatrix()
      renderer.setSize(w, h, false)
    }
    resize()

    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => resize())
        : null
    ro?.observe(host)

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
    }
    function onWheel(e: WheelEvent) {
      // Stage owns surface→dive; canvas only zooms when already submerged.
      if (stageRef.current < 0.5) return
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
      const hits = raycaster.intersectObjects(
        fishObjs.map((o) => o.mesh),
        true,
      )
      if (!hits.length) {
        if (selected) release()
        return
      }
      let obj: THREE.Object3D | null = hits[0].object
      while (obj && !obj.userData?.slug) obj = obj.parent
      if (obj && obj.userData?.slug) catchFish(obj as THREE.Group)
    }

    renderer.domElement.addEventListener("pointerdown", onPointerDown)
    renderer.domElement.addEventListener("pointerup", onPointerUp)
    renderer.domElement.addEventListener("pointerleave", onPointerUp)
    renderer.domElement.addEventListener("pointermove", onPointerMove)
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false })
    renderer.domElement.addEventListener("click", onClick)

    const _v = new THREE.Vector3()
    const _v2 = new THREE.Vector3()

    function animate() {
      if (disposed) return
      raf = requestAnimationFrame(animate)
      const dt = Math.min(0.05, clock.getDelta())
      const t = clock.elapsedTime
      const prog = clamp(stageRef.current, 0, 1)

      // Camera reset on surface return: whenever the stage crosses back to the
      // surface (prog ≤ 0.05) from a deeper position, snap orbit targets back to
      // the open wide-angle rim framing so accumulated tank rotations don't bleed
      // through to the surface hero view.
      if (orbit.prevProg > 0.05 && prog <= 0.05 && !selected) {
        orbit.yawT = 0
        orbit.pitchT = 0.1
        orbit.radiusT = 36
      }
      orbit.prevProg = prog

      const want = focusedRef.current
      if (want) {
        const match = fishObjs.find((o) => o.data.slug === want)
        if (match && selected !== match.mesh) selected = match.mesh
      } else if (selected && !want) {
        selected = null
      }

      if (selected) {
        orbit.targetT.copy(selected.position)
        // Stand off proportionally to the specimen: a flat radius of 9 put the
        // camera inside big fish. Keeps the whole silhouette in frame.
        const sel = selected.userData.data as FishSpecimenInput
        orbit.radiusT = 15 + clamp01(sel?.size ?? 0.5) * 7
      } else {
        const st = stageOrbitTarget(prog)
        orbit.targetT.set(st.x, st.y, st.z)
        // At the surface (prog=0) radius=36 matches orbit default for the full
        // open rim view. Tightens to 24 at full depth so mid-water fish fill frame.
        const stageRadius = 24 + (1 - prog) * 12
        orbit.radiusT = clamp(
          prog < 0.5 ? stageRadius : orbit.radiusT,
          MIN_ORBIT_RADIUS,
          MAX_ORBIT_RADIUS,
        )
      }
      // Focus transitions ease; stage moves do NOT. stageProgress is already an
      // eased 0→1 from the controller, so lerping the target on top of it added
      // a second, much slower ramp — the surface framing arrived seconds late
      // (or never, if frames were throttled) and the cat sat above the frustum.
      if (selected) orbit.target.lerp(orbit.targetT, 0.06)
      else orbit.target.copy(orbit.targetT)
      orbit.yaw += (orbit.yawT - orbit.yaw) * 0.09
      orbit.pitch += (orbit.pitchT - orbit.pitch) * 0.09
      orbit.radius += (orbit.radiusT - orbit.radius) * 0.07

      const drift = orbit.dragging || selected ? 0 : Math.sin(t * 0.12) * 0.06
      const yaw = orbit.yaw + drift
      const pitch = clamp(orbit.pitch, MIN_PITCH, MAX_PITCH)
      camera.position.set(
        orbit.target.x + Math.sin(yaw) * Math.cos(pitch) * orbit.radius,
        orbit.target.y + Math.sin(pitch) * orbit.radius,
        orbit.target.z + Math.cos(yaw) * Math.cos(pitch) * orbit.radius,
      )
      camera.lookAt(orbit.target)

      const w = host.clientWidth || 640
      const h = immersive ? host.clientHeight || 480 : 320
      const wantShift = selected && w > 820 ? 1 : 0
      view.shift += (wantShift - view.shift) * 0.08
      if (view.shift > 0.002) {
        camera.setViewOffset(w, h, viewOffsetX(view.shift, w), 0, w, h)
        view.applied = true
      } else if (view.applied) {
        camera.clearViewOffset()
        view.applied = false
      }

      if (scene.fog instanceof THREE.FogExp2) {
        // Air is clear; water is not. At the surface (prog→0) the haze thins
        // right out so the cat on the rim reads crisply against the sky-side of
        // the scene — at full underwater density it just dissolved into teal.
        const base = palette.fogDensity * (0.18 + 0.82 * prog)
        const targetDensity = selected ? base * 1.45 : base
        scene.fog.density += (targetDensity - scene.fog.density) * 0.05
        scene.fog.color.set(mixHex(palette.bg, palette.fogColor, prog))
      }
      // Surroundings blend page-background (air, above the rim) → deep water.
      if (Math.abs(prog - lastProg) > 0.004) {
        lastProg = prog
        backdropMat.color.set(mixHex(palette.bg, palette.deep, prog))
      }

      const wp = water.geometry.attributes.position
      const base = water.userData.base as Float32Array
      for (let i = 0; i < wp.count; i++) {
        const x = base[i * 3]
        const z = base[i * 3 + 2]
        wp.setY(
          i,
          Math.sin(x * 0.35 + t * 1.4) * 0.22 +
            Math.cos(z * 0.4 + t * 1.1) * 0.18,
        )
      }
      wp.needsUpdate = true

      const bp = bubbles.geometry.attributes.position.array as Float32Array
      for (let i = 1; i < bp.length; i += 3) {
        bp[i] += dt * 1.6
        if (bp[i] > WATER_Y - 0.2) bp[i] = FLOOR_Y + 0.4
      }
      bubbles.geometry.attributes.position.needsUpdate = true

      // Marine snow drifts down and sideways — slower than bubbles rise, so the
      // two layers separate and the column reads as having volume.
      const mp = motes.geometry.attributes.position.array as Float32Array
      for (let i = 0; i < mp.length; i += 3) {
        mp[i] += Math.sin(t * 0.2 + mp[i + 1] * 0.1) * dt * 0.25
        mp[i + 1] -= dt * 0.35
        if (mp[i + 1] < FLOOR_Y) mp[i + 1] = WATER_Y - 0.5
      }
      motes.geometry.attributes.position.needsUpdate = true

      // Caustics crawl across the bed; rays sway with the surface.
      if (caustic) {
        caustic.offset.x = (t * 0.012) % 1
        caustic.offset.y = (Math.sin(t * 0.08) * 0.1 + t * 0.006) % 1
      }
      rays.rotation.y = Math.sin(t * 0.05) * 0.06
      rayMat.opacity = palette.rayStrength * (0.75 + Math.sin(t * 0.4) * 0.25)

      // Seaweed bends as a chain — each segment lags the one below it.
      for (const weed of weeds) {
        const { segs, seed } = weed.userData as { segs: number; seed: number }
        for (let s = 0; s < segs; s++) {
          const seg = weed.getObjectByName(`seg${s}`)
          if (!seg) continue
          const amp = 0.05 + (s / segs) * 0.16
          seg.rotation.z = Math.sin(t * 0.7 + seed * 0.9 + s * 0.45) * amp
        }
      }

      // Head sits above the rim, body implied below it — bobbing gently.
      cat.position.y = CAT_Y + Math.sin(t * 0.8) * 0.28
      // cat head-turn removed (no longer tracks mouse position)
      // Paw dip when locking a specimen
      const paw = cat.getObjectByName("paw")
      if (paw) {
        const dip = selected ? 0.55 : 0
        paw.rotation.z = 0.6 + dip
      }

      const hl = highlightRef.current
      const focus = focusedRef.current
      const litFn = litRef.current

      for (const o of fishObjs) {
        const focused = selected === o.mesh
        const pose = computeFishPose(o.data, t, {
          focused,
          timeScale: selected ? 0.15 : 1,
        })
        o.mesh.position.set(pose.position.x, pose.position.y, pose.position.z)
        o.mesh.rotation.y = pose.yaw
        if (!focused) {
          // Bank into the turn and pitch slightly with vertical drift — a fish
          // that stays perfectly level reads as a prop on a rail.
          const prev = o.mesh.userData.prevYaw as number | undefined
          const dYaw = prev == null ? 0 : shortestAngle(pose.yaw - prev)
          o.mesh.userData.prevYaw = pose.yaw
          const bank = clamp(dYaw * 9, -0.5, 0.5)
          o.mesh.rotation.z += (bank - o.mesh.rotation.z) * 0.08
          o.mesh.rotation.x = Math.sin(t * 1.4 * o.data.speed + o.data.depth * 6) * 0.06
        }

        const lit = litFn
          ? litFn(o.data)
          : defaultLit(o.data, hl, focus)
        const scaleMul = lit > 1 ? 1.12 : lit < 0.5 ? 0.72 : 1
        o.mesh.scale.setScalar(pose.scale * scaleMul)

        // Stay mostly opaque so ambient lighting reads; dim via emissive/glow.
        const opacityBase = lit < 0.3 ? 0.35 : 0.75 + Math.min(1, lit) * 0.25
        o.body.opacity = opacityBase
        o.fin.opacity = 0.45 + Math.min(1, lit) * 0.5
        o.body.emissiveIntensity =
          o.data.glow * 0.7 * Math.min(1, lit) * (light ? 0.55 : 0.95)
        o.fin.emissiveIntensity =
          o.data.glow * 0.95 * Math.min(1, lit) * (light ? 0.55 : 0.95)
        o.glow.intensity =
          o.data.glow *
          2.0 *
          Math.min(1, lit) *
          (focused ? 2.6 : 1) *
          (light ? 0.7 : 1.15)

        const tail = o.mesh.getObjectByName("tail")
        if (tail && !focused) {
          tail.rotation.y = Math.sin(t * 11 * o.data.speed) * 0.4
        }
        if (!focused) {
          const beat = Math.sin(t * 7 * (0.4 + o.data.speed)) * 0.3
          const pecL = o.mesh.getObjectByName("pecL")
          const pecR = o.mesh.getObjectByName("pecR")
          if (pecL) pecL.rotation.x = beat
          if (pecR) pecR.rotation.x = -beat
        }

        _v.copy(o.mesh.position)
        _v.y -= 1.6 * pose.scale
        _v.project(camera)
        const behind = _v.z > 1
        const inTank = prog > 0.55
        const hiddenByLock = selected && selected !== o.mesh
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
          // Brighten the pill glow for highlighted / focused fish
          const typedLabel = o.label as HTMLDivElement & {
            _tick: HTMLDivElement
            _pill: HTMLDivElement
            _hex: string
          }
          if (typedLabel._pill) {
            const isHot = focused || lit > 1
            const hex = typedLabel._hex
            typedLabel._pill.style.boxShadow = isHot
              ? `0 0 14px ${hex}88,0 0 4px ${hex}55,0 2px 10px rgba(0,0,0,.5)`
              : `0 2px 10px rgba(0,0,0,.4)`
            typedLabel._pill.style.borderColor = isHot
              ? `${hex}cc`
              : `${hex}99`
          }
        }
      }

      // Publish the locked fish's screen position so the dossier can dock beside
      // it. Throttled to real movement — this fires into React state.
      if (selected) {
        _v.copy(selected.position)
        _v.project(camera)
        const ax = (_v.x * 0.5 + 0.5) * w
        const ay = (-_v.y * 0.5 + 0.5) * h
        // Project a point one bounding-radius above the fish to measure how big
        // it actually is on screen. Docking off the centre alone put the panel
        // inside the specimen whenever it was close or large.
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
          onAnchorRef.current?.({ x: ax, y: ay, r: ar, w, h })
        }
      } else if (lastAnchor.x !== -9999) {
        lastAnchor.x = -9999
        lastAnchor.y = -9999
        onAnchorRef.current?.(null)
      }

      renderer.render(scene, camera)
    }
    animate()

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      cancelAnimationFrame(paletteFrame)
      ro?.disconnect()
      renderer.domElement.removeEventListener("pointerdown", onPointerDown)
      renderer.domElement.removeEventListener("pointerup", onPointerUp)
      renderer.domElement.removeEventListener("pointerleave", onPointerUp)
      renderer.domElement.removeEventListener("pointermove", onPointerMove)
      renderer.domElement.removeEventListener("wheel", onWheel)
      renderer.domElement.removeEventListener("click", onClick)
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
    }
  }, [fish, immersive, themeKey])

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
