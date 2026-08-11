/**
 * Procedural low-poly cyber-aquatic meshes with modular component design.
 * Spec-driven from GenUI domain mappings (ai, devops, mobile, platform).
 * Supports organic S-curve spine undulation, ribbon fins, cyber-flora, and interactive mascot.
 */

import * as THREE from "three"
import { resolveFishForm, type FishForm } from "./formFromDomain"
import type { FishSpecimenInput } from "@/blocks/fishTankLayout"

const geoCache = new Map<string, THREE.BufferGeometry>()

function cached(key: string, factory: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let g = geoCache.get(key)
  if (!g) {
    g = factory()
    geoCache.set(key, g)
  }
  return g
}

export interface BuiltFish {
  group: THREE.Group
  body: THREE.MeshStandardMaterial
  fin: THREE.MeshStandardMaterial
  glow: THREE.PointLight
  form: FishForm
  spineSegments: THREE.Object3D[]
  pecL?: THREE.Object3D
  pecR?: THREE.Object3D
  tentacles?: THREE.Object3D[]
}

function makeMaterials(color: THREE.Color, glow: number) {
  const body = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: Math.max(0.2, glow * 0.75),
    roughness: 0.45,
    metalness: 0.08,
    transparent: true,
    opacity: 0.98,
    flatShading: true,
  })
  const fin = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: Math.max(0.35, glow * 1.1),
    transparent: true,
    opacity: 0.85,
    roughness: 0.3,
    metalness: 0.05,
    side: THREE.DoubleSide,
    flatShading: true,
  })
  return { body, fin }
}

const EYE_WHITE = new THREE.MeshStandardMaterial({
  color: 0xf2f7fa,
  roughness: 0.25,
  metalness: 0,
})
const EYE_PUPIL = new THREE.MeshBasicMaterial({ color: 0x050810 })

function addEyes(g: THREE.Group, forward: number, spread: number, up = 0.18, r = 0.16) {
  for (const side of [-1, 1] as const) {
    const eye = new THREE.Mesh(
      cached("eyeball", () => new THREE.SphereGeometry(1, 8, 6)),
      EYE_WHITE,
    )
    eye.scale.setScalar(r)
    eye.position.set(side * spread, up, forward)
    g.add(eye)

    const pupil = new THREE.Mesh(
      cached("pupil", () => new THREE.SphereGeometry(1, 6, 5)),
      EYE_PUPIL,
    )
    pupil.scale.setScalar(r * 0.55)
    pupil.position.set(side * spread * 1.06, up, forward + r * 0.62)
    g.add(pupil)
  }
}

function addHitSphere(g: THREE.Group) {
  const hit = new THREE.Mesh(
    cached("hit", () => new THREE.SphereGeometry(2.4, 8, 6)),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
  )
  hit.name = "hit"
  g.add(hit)
}

function buildForm(
  form: FishForm,
  body: THREE.MeshStandardMaterial,
  fin: THREE.MeshStandardMaterial,
): {
  group: THREE.Group
  spineSegments: THREE.Object3D[]
  pecL?: THREE.Object3D
  pecR?: THREE.Object3D
  tentacles?: THREE.Object3D[]
} {
  const group = new THREE.Group()
  const spineSegments: THREE.Object3D[] = []
  let pecL: THREE.Object3D | undefined
  let pecR: THREE.Object3D | undefined
  const tentacles: THREE.Object3D[] = []

  switch (form) {
    // 1. AI & AGENTS: Cyber-Manta Ray with glowing circuit dorsal ridges and antennae
    case "manta":
    case "grouper": {
      const s = new THREE.Shape()
      s.moveTo(0, 1.4)
      s.lineTo(2.5, -0.3)
      s.lineTo(0, -1.6)
      s.lineTo(-2.5, -0.3)
      s.closePath()

      const wingGeo = cached("manta_wing", () => {
        const e = new THREE.ExtrudeGeometry(s, {
          depth: 0.28,
          bevelEnabled: true,
          bevelSize: 0.12,
          bevelThickness: 0.12,
          bevelSegments: 1,
          steps: 1,
        })
        e.rotateX(Math.PI / 2)
        return e
      })

      const head = new THREE.Mesh(
        cached("manta_head", () => {
          const c = new THREE.ConeGeometry(0.7, 1.8, 6)
          c.rotateX(Math.PI / 2)
          return c
        }),
        body,
      )
      head.position.z = 0.6
      head.name = "spine_head"
      group.add(head)
      spineSegments.push(head)

      const wing = new THREE.Mesh(wingGeo, body)
      wing.name = "spine_mid"
      group.add(wing)
      spineSegments.push(wing)

      // Tail spine
      const tail = new THREE.Mesh(
        cached("manta_tail", () => new THREE.CylinderGeometry(0.06, 0.02, 2.4, 5)),
        fin,
      )
      tail.position.set(0, 0, -2.4)
      tail.rotation.x = Math.PI / 2
      tail.name = "spine_tail"
      group.add(tail)
      spineSegments.push(tail)

      // Cyber Lure Antenna
      const rod = new THREE.Mesh(
        cached("manta_rod", () => new THREE.CylinderGeometry(0.03, 0.03, 1.2, 4)),
        fin,
      )
      rod.position.set(0, 0.6, 1.2)
      rod.rotation.x = 0.5
      group.add(rod)

      const lure = new THREE.Mesh(
        cached("manta_lure", () => new THREE.SphereGeometry(0.2, 8, 6)),
        new THREE.MeshBasicMaterial({ color: 0xfffbeb }),
      )
      lure.position.set(0, 1.1, 1.7)
      group.add(lure)

      addEyes(group, 1.1, 0.55, 0.22, 0.18)
      break
    }

    // 2. DEVOPS & INFRA: Armored Cyber-Eel / Nautilus with segmented kinetic shell plates
    case "eel": {
      for (let i = 0; i < 7; i++) {
        const segMat = i % 2 === 0 ? body : fin
        const seg = new THREE.Mesh(
          cached(`eel_seg_${i}`, () => new THREE.SphereGeometry(0.48 * (1 - i * 0.08), 8, 6)),
          segMat,
        )
        seg.position.z = -i * 0.58
        seg.name = `spine_seg_${i}`
        group.add(seg)
        spineSegments.push(seg)
      }
      addEyes(group, 0.25, 0.32, 0.18, 0.14)
      break
    }

    // 3. MOBILE: Agile Streamlined Neon Dartfish with glowing ribbon fins
    case "angelfish":
    case "tetra":
    case "tuna":
    case "shark": {
      const head = new THREE.Mesh(
        cached("dart_head", () => {
          const s = new THREE.SphereGeometry(0.85, 10, 8)
          s.scale(0.35, 0.9, 1.2)
          return s
        }),
        body,
      )
      head.position.z = 0.4
      head.name = "spine_head"
      group.add(head)
      spineSegments.push(head)

      const mid = new THREE.Mesh(
        cached("dart_mid", () => {
          const s = new THREE.SphereGeometry(0.7, 8, 6)
          s.scale(0.28, 0.75, 1.0)
          return s
        }),
        body,
      )
      mid.position.z = -0.5
      mid.name = "spine_mid"
      group.add(mid)
      spineSegments.push(mid)

      // Dorsal ribbon fin
      const topFin = new THREE.Mesh(
        cached("dart_topfin", () => new THREE.ConeGeometry(0.45, 1.6, 3)),
        fin,
      )
      topFin.position.set(0, 0.95, -0.2)
      topFin.rotation.x = -0.65
      group.add(topFin)

      // Dual tail flukes
      const tail = new THREE.Mesh(
        cached("dart_tail", () => new THREE.ConeGeometry(0.7, 1.4, 3)),
        fin,
      )
      tail.position.set(0, 0, -1.4)
      tail.rotation.x = Math.PI / 2
      tail.name = "spine_tail"
      group.add(tail)
      spineSegments.push(tail)

      // Pectoral fins
      for (const side of [-1, 1] as const) {
        const pec = new THREE.Mesh(
          cached("dart_pec", () => {
            const c = new THREE.ConeGeometry(0.35, 1.1, 3)
            c.rotateZ(Math.PI / 2)
            return c
          }),
          fin,
        )
        pec.position.set(side * 0.42, -0.05, 0.35)
        pec.rotation.y = side * 0.45
        group.add(pec)
        if (side < 0) pecL = pec
        else pecR = pec
      }

      addEyes(group, 0.85, 0.24, 0.22, 0.16)
      break
    }

    // 4. PLATFORM: Translucent Bioluminescent Jellyfish / Octo with glowing tentacles
    case "jellyfish":
    default: {
      const dome = new THREE.Mesh(
        cached("jelly_dome", () =>
          new THREE.SphereGeometry(1.1, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.58),
        ),
        fin,
      )
      dome.name = "jelly_dome"
      group.add(dome)
      spineSegments.push(dome)

      const core = new THREE.Mesh(
        cached("jelly_core", () => new THREE.SphereGeometry(0.45, 8, 6)),
        body,
      )
      core.position.y = -0.2
      group.add(core)

      for (let i = 0; i < 8; i++) {
        const ten = new THREE.Mesh(
          cached("jelly_ten", () => new THREE.CylinderGeometry(0.045, 0.015, 2.6, 5)),
          fin,
        )
        const a = (i / 8) * Math.PI * 2
        ten.position.set(Math.cos(a) * 0.6, -1.3, Math.sin(a) * 0.6)
        ten.name = `tentacle_${i}`
        group.add(ten)
        tentacles.push(ten)
      }
      break
    }
  }

  addHitSphere(group)
  return { group, spineSegments, pecL, pecR, tentacles }
}

export function buildFishMesh(
  data: FishSpecimenInput,
  color: THREE.Color,
): BuiltFish {
  const form = resolveFishForm(data.species)
  const { body, fin } = makeMaterials(color, data.glow)
  const { group, spineSegments, pecL, pecR, tentacles } = buildForm(form, body, fin)
  const glow = new THREE.PointLight(color, Math.max(0.6, data.glow * 1.6), 8)
  group.add(glow)
  group.userData = { slug: data.slug, data, form }
  return { group, body, fin, glow, form, spineSegments, pecL, pecR, tentacles }
}

/**
 * Procedural caustic texture fallback.
 */
export function buildCausticTexture(size = 256): THREE.Texture | null {
  if (typeof document === "undefined") return null
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = size
  const ctx = canvas.getContext("2d")
  if (!ctx) return null
  ctx.fillStyle = "#000000"
  ctx.fillRect(0, 0, size, size)
  const img = ctx.getImageData(0, 0, size, size)
  const d = img.data
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * Math.PI * 2
      const v = (y / size) * Math.PI * 2
      const a = Math.sin(u * 3 + Math.cos(v * 2)) + Math.sin(v * 3 + Math.cos(u * 2))
      const b = Math.sin((u + v) * 2.5) * 0.6
      const n = (a + b) / 3.2
      const lit = Math.pow(Math.max(0, n), 3)
      const val = Math.min(255, Math.round(lit * 255))
      const i = (y * size + x) * 4
      d[i] = d[i + 1] = d[i + 2] = val
      d[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(3, 3)
  return tex
}

/**
 * Soft round sprite for Points clouds (bubbles & bio-particles).
 */
export function buildPointSprite(size = 64): THREE.Texture | null {
  if (typeof document === "undefined") return null
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = size
  const ctx = canvas.getContext("2d")
  if (!ctx) return null
  ctx.clearRect(0, 0, size, size)
  const r = size / 2
  const grad = ctx.createRadialGradient(r, r, 0, r, r, r)
  grad.addColorStop(0, "rgba(255, 255, 255, 1)")
  grad.addColorStop(0.35, "rgba(255, 255, 255, 0.75)")
  grad.addColorStop(0.7, "rgba(255, 255, 255, 0.2)")
  grad.addColorStop(1, "rgba(255, 255, 255, 0)")
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

/** Swaying multi-stem kelp forest with organic wave sway. */
export function buildSeaweed(
  height: number,
  color: THREE.Color,
  seed: number,
): THREE.Group {
  const stalk = new THREE.Group()
  const segs = 7
  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.18,
    roughness: 0.75,
    metalness: 0.05,
    side: THREE.DoubleSide,
    flatShading: true,
    transparent: true,
    opacity: 0.94,
  })
  const segH = height / segs
  for (let i = 0; i < segs; i++) {
    const w = 0.5 * (1 - i / (segs + 3))
    const blade = new THREE.Mesh(new THREE.BoxGeometry(w, segH, 0.08), mat)
    blade.position.y = segH * (i + 0.5)
    blade.name = `seg${i}`
    stalk.add(blade)
  }
  stalk.userData = { segs, seed, segH }
  return stalk
}

/** Glowing fiber-optic branching corals with neon tips. */
export function buildCoral(color: THREE.Color, scale = 1): THREE.Group {
  const coral = new THREE.Group()
  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.45,
    roughness: 0.5,
    metalness: 0.1,
    flatShading: true,
  })
  const tipMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.9,
  })

  const arms = 6
  for (let i = 0; i < arms; i++) {
    const a = (i / arms) * Math.PI * 2
    const arm = new THREE.Mesh(new THREE.ConeGeometry(0.28, 2.4, 5), mat)
    arm.position.set(Math.cos(a) * 0.55, 1.1, Math.sin(a) * 0.55)
    arm.rotation.z = Math.cos(a) * 0.4
    arm.rotation.x = -Math.sin(a) * 0.4
    coral.add(arm)

    // Glowing fiber-optic tip bulb
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), tipMat)
    tip.position.set(Math.cos(a) * 1.1, 2.2, Math.sin(a) * 1.1)
    coral.add(tip)
  }
  const base = new THREE.Mesh(new THREE.SphereGeometry(0.65, 8, 6), mat)
  base.scale.y = 0.5
  coral.add(base)
  coral.scale.setScalar(scale)
  return coral
}

/** Glowing cyber-crystal / relic shard on seabed. */
export function buildCyberCrystal(color: THREE.Color, scale = 1): THREE.Group {
  const crystal = new THREE.Group()
  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.65,
    roughness: 0.2,
    metalness: 0.3,
    transparent: true,
    opacity: 0.92,
    flatShading: true,
  })
  const mesh = new THREE.Mesh(
    cached("crystal_geo", () => {
      const geo = new THREE.OctahedronGeometry(1.2, 0)
      geo.scale(0.6, 2.2, 0.6)
      return geo
    }),
    mat,
  )
  mesh.position.y = 1.0
  crystal.add(mesh)
  crystal.scale.setScalar(scale)
  return crystal
}

/** Low-poly cat on the rim with animatable tail, ears, and paw. */
export function buildCatMesh(waterY: number): THREE.Group {
  const cat = new THREE.Group()
  const fur = new THREE.MeshStandardMaterial({
    color: 0x4a5f80,
    emissive: 0x1d2a44,
    emissiveIntensity: 0.55,
    roughness: 0.72,
    flatShading: true,
  })
  const pink = new THREE.MeshStandardMaterial({
    color: 0xf472b6,
    emissive: 0x7a2350,
    emissiveIntensity: 0.5,
    roughness: 0.6,
  })

  const head = new THREE.Mesh(new THREE.SphereGeometry(3.2, 16, 12), fur)
  cat.add(head)

  for (const side of [-1, 1] as const) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.2, 4), fur)
    ear.position.set(side * 1.6, 2.8, 0)
    ear.rotation.z = side * 0.25
    ear.name = side < 0 ? "earL" : "earR"
    cat.add(ear)

    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.62, 10, 8),
      new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.85,
      }),
    )
    eye.position.set(side * 1.1, 0.4, 2.6)
    eye.name = side < 0 ? "eyeL" : "eyeR"
    cat.add(eye)
  }

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.5, 4), pink)
  nose.position.set(0, -0.4, 3.1)
  nose.rotation.x = Math.PI / 2
  cat.add(nose)

  // Paw
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.68, 5.2, 8), fur)
  arm.position.set(-2.6, -3.6, 1.8)
  arm.rotation.z = 0.22
  arm.name = "paw"
  cat.add(arm)

  const pad = new THREE.Mesh(new THREE.SphereGeometry(1.05, 12, 10), fur)
  pad.position.set(-3.3, -6.0, 1.9)
  arm.add(pad)

  // Animated tail
  const tailGroup = new THREE.Group()
  tailGroup.position.set(2.4, -1.0, -1.8)
  tailGroup.name = "cat_tail"
  for (let i = 0; i < 4; i++) {
    const tSeg = new THREE.Mesh(new THREE.SphereGeometry(0.5 - i * 0.08, 8, 6), fur)
    tSeg.position.set(i * 0.6, Math.sin(i * 0.8) * 0.4, -i * 0.5)
    tailGroup.add(tSeg)
  }
  cat.add(tailGroup)

  cat.position.set(0, waterY + 3.6, 0)
  return cat
}
