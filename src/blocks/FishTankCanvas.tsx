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
  CAT_Y,
  clamp01,
  WATER_Y,
  FLOOR_Y,
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
  buildCoral,
  buildCyberCrystal,
  buildFishMesh,
  buildPointSprite,
  buildSeaweed,
  type BuiltFish,
} from "@/fish/speciesMeshes"
import { createCausticMaterial } from "@/fish/shaders/causticShader"
import { createHoloReticle } from "@/fish/components/HoloReticle"
import type { DomainIdType } from "@/content/schema"

export interface FishTankCanvasProps {
  fish: FishSpecimenInput[]
  immersive?: boolean
  /** Bake highlight set — layout-derived, changes together with `fish`. */
  highlightSlugs?: string[]
  /** Theme id / accent stamp — remounts lights when the shell theme changes. */
  themeKey?: string
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
  highlightSlugs = [],
  themeKey = "default",
}: FishTankCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const root = hostRef.current
    if (!root) return
    const host: HTMLDivElement = root

    // Discrete interaction state, read imperatively
    const focusedRef = { current: useFishTankStore.getState().focus }
    const filterRef = { current: filterFromStore() }
    function filterFromStore(): FishFilter {
      const s = useFishTankStore.getState()
      return { query: s.query, domain: s.domain, highlightSlugs, bakeActive: s.bakeActive }
    }
    const unsubStore = useFishTankStore.subscribe((s) => {
      focusedRef.current = s.focus
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

    let palette: TankThemePalette = resolveTankThemePalette()
    const light = palette.light

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

    // Water surface plane with harmonic wave displacement
    const waterGeo = new THREE.PlaneGeometry(glassW, glassD, 48, 32)
    waterGeo.rotateX(-Math.PI / 2)
    const waterMat = new THREE.MeshStandardMaterial({
      color: palette.water,
      transparent: true,
      opacity: light ? 0.32 : 0.42,
      roughness: 0.2,
      metalness: 0.1,
      side: THREE.DoubleSide,
      emissive: new THREE.Color(palette.water),
      emissiveIntensity: light ? 0.1 : 0.22,
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

    const floorMat = new THREE.MeshStandardMaterial({
      color: palette.floor,
      roughness: 0.88,
      metalness: 0.05,
      flatShading: true,
    })
    const floor = new THREE.Mesh(floorGeo, floorMat)
    floor.position.y = FLOOR_Y
    tank.add(floor)

    // Procedural Voronoi Caustics Shader Plane
    const causticMat = createCausticMaterial(
      new THREE.Color(palette.sun),
      palette.causticStrength * 1.3,
      palette.causticStrength,
    )
    const causticPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(glassW - 0.6, glassD - 0.6),
      causticMat,
    )
    causticPlane.rotation.x = -Math.PI / 2
    causticPlane.position.y = FLOOR_Y + 0.35
    causticPlane.name = "caustics"
    tank.add(causticPlane)

    // Volumetric God Rays
    const rayMat = new THREE.MeshBasicMaterial({
      color: palette.sun,
      transparent: true,
      opacity: palette.rayStrength * 1.1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    })
    const rays = new THREE.Group()
    for (let i = 0; i < 9; i++) {
      const h = TANK_HEIGHT * (1.18 + (i % 3) * 0.15)
      const ray = new THREE.Mesh(
        new THREE.ConeGeometry(1.8 + (i % 4) * 0.6, h, 14, 1, true),
        rayMat,
      )
      ray.position.set(
        (i - 4) * (TANK_HALF_W * 0.26),
        WATER_Y - h / 2 + 3,
        ((i % 4) - 1.5) * 8.5,
      )
      ray.rotation.z = (i - 4) * 0.032
      rays.add(ray)
    }
    tank.add(rays)

    // Seabed Rocks & Glowing Cyber-Crystals
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
    const weeds: THREE.Group[] = []
    for (let i = 0; i < 20; i++) {
      const stalk = buildSeaweed(5.5 + (i % 4) * 2.8, weedColor, i)
      stalk.position.set(
        (i / 19 - 0.5) * (glassW - 4),
        FLOOR_Y + 0.2,
        ((i % 6) - 2.5) * (TANK_HALF_D * 0.32),
      )
      tank.add(stalk)
      weeds.push(stalk)
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

    // 3D Holographic Reticle for Focused Fish
    const holoReticle = createHoloReticle()
    tank.add(holoReticle.group)

    // Interactive Cat Mascot on Rim
    const cat = buildCatMesh(WATER_Y)
    cat.position.x = CAT_X
    scene.add(cat)

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

    // Deferred palette resample
    let paletteFrame = requestAnimationFrame(() => {
      palette = resolveTankThemePalette()
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
      bedBounce.color.set(palette.cyan)
      glassMat.color.set(palette.glass)
      waterMat.color.set(palette.water)
      waterMat.emissive.set(palette.water)
      floorMat.color.set(palette.floor)
      rayMat.color.set(palette.sun)
      causticMat.uniforms.uColor.value.set(palette.sun)
      bubbleMat.color.set(palette.bubble)
      moteMat.color.set(palette.motes)
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
            }
          })
        : null
    ro?.observe(host)

    // Interaction handlers
    const pointer = new THREE.Vector2(-9999, -9999)
    const raycaster = new THREE.Raycaster()
    const clock = new THREE.Clock()
    let raf = 0
    let disposed = false
    let selected: THREE.Group | null = null
    const lastAnchor = { x: -9999, y: -9999, r: -9999 }
    let lastProg = -1

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
      if (!isSubmerged(progRef.current)) return
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
        orbit.targetT.set(st.x, st.y, st.z)
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

      // Water surface wave animation
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
      causticMat.uniforms.uTime.value = t
      rays.rotation.y = Math.sin(t * 0.05) * 0.06
      rayMat.opacity = palette.rayStrength * (0.8 + Math.sin(t * 0.4) * 0.2)

      // Seaweed swaying
      for (const weed of weeds) {
        const { segs, seed } = weed.userData as { segs: number; seed: number }
        for (let s = 0; s < segs; s++) {
          const seg = weed.getObjectByName(`seg${s}`)
          if (!seg) continue
          const amp = 0.06 + (s / segs) * 0.18
          seg.rotation.z = Math.sin(t * 0.75 + seed * 0.9 + s * 0.45) * amp
        }
      }

      // Cat mascot animation
      cat.position.y = CAT_Y + Math.sin(t * 0.8) * 0.28
      const paw = cat.getObjectByName("paw")
      if (paw) {
        const dip = selected ? 0.55 : 0
        paw.rotation.z = 0.22 + dip + Math.sin(t * 1.5) * 0.05
      }
      const catTail = cat.getObjectByName("cat_tail")
      if (catTail) {
        catTail.rotation.y = Math.sin(t * 1.2) * 0.35
      }
      // Blinking eye
      const eyeL = cat.getObjectByName("eyeL")
      const eyeR = cat.getObjectByName("eyeR")
      const blink = Math.sin(t * 0.5) > 0.98 ? 0.1 : 1
      if (eyeL) eyeL.scale.y = blink
      if (eyeR) eyeR.scale.y = blink

      // 3D Holographic Reticle Update
      if (selected) {
        const selData = selected.userData.data as FishSpecimenInput | undefined
        holoReticle.update(t, selected.position, selData?.size ?? 0.5, true)
      } else {
        holoReticle.update(t, _v, 1, false)
      }

      const focus = focusedRef.current
      const filter = filterRef.current

      // Fish swimming & organic S-curve deformation
      for (const o of fishObjs) {
        const focused = selected === o.mesh
        const pose = computeFishPose(o.data, t, {
          focused,
          timeScale: selected ? 0.15 : 1,
        })
        o.mesh.position.set(pose.position.x, pose.position.y, pose.position.z)
        o.mesh.rotation.y = pose.yaw

        if (!focused) {
          const prev = o.mesh.userData.prevYaw as number | undefined
          const dYaw = prev == null ? 0 : shortestAngle(pose.yaw - prev)
          o.mesh.userData.prevYaw = pose.yaw
          const bank = clamp(dYaw * 9, -0.5, 0.5)
          o.mesh.rotation.z += (bank - o.mesh.rotation.z) * 0.08
          o.mesh.rotation.x = Math.sin(t * 1.4 * o.data.speed + o.data.depth * 6) * 0.06
        }

        // Organic S-Curve Spine & Segment Undulation
        const { spineSegments, pecL, pecR, tentacles } = o.built
        const swimSpeed = (o.data.speed || 0.5) * 7.5
        
        if (spineSegments.length > 1) {
          spineSegments.forEach((seg, sIdx) => {
            const phaseLag = sIdx * 0.65
            const amp = 0.08 + sIdx * 0.07
            seg.rotation.y = Math.sin(t * swimSpeed - phaseLag) * amp
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

        const lit = fishLitFactor(o.data, filter, focus)
        const scaleMul = lit > 1 ? 1.15 : lit < 0.5 ? 0.72 : 1
        o.mesh.scale.setScalar(pose.scale * scaleMul)

        const opacityBase = lit < 0.3 ? 0.35 : 0.75 + Math.min(1, lit) * 0.25
        o.built.body.opacity = opacityBase
        o.built.fin.opacity = 0.5 + Math.min(1, lit) * 0.45
        o.built.body.emissiveIntensity =
          Math.max(0.25, o.data.glow * 0.85 * Math.min(1, lit) * (light ? 0.6 : 1.1))
        o.built.fin.emissiveIntensity =
          Math.max(0.35, o.data.glow * 1.2 * Math.min(1, lit) * (light ? 0.6 : 1.25))
        o.built.glow.intensity =
          o.data.glow *
          2.4 *
          Math.min(1, lit) *
          (focused ? 2.8 : 1) *
          (light ? 0.75 : 1.25)

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

      renderer.render(scene, camera)
    }
    animate()

    return () => {
      disposed = true
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
      holoReticle.dispose()
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
  }, [fish, immersive, themeKey, highlightSlugs])

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
