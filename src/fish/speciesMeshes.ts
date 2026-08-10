/**
 * Procedural low-poly fish meshes — ported from Open Design tank3d.html `buildFish`.
 * Geometry is cached per form; materials are per-specimen so filter tint stays independent.
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
}

function makeMaterials(color: THREE.Color, glow: number) {
  // Low metalness so ambient/hemi lights actually lift the mesh (PBR metals stay black).
  const body = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: glow * 0.65,
    roughness: 0.55,
    metalness: 0.05,
    transparent: true,
    opacity: 1,
    flatShading: true,
  })
  const fin = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: glow * 0.9,
    transparent: true,
    opacity: 0.9,
    roughness: 0.4,
    metalness: 0.02,
    side: THREE.DoubleSide,
    flatShading: true,
  })
  return { body, fin }
}

/**
 * Eyes read as "creature" more than any amount of body detail — a fish without
 * them looks like a floating cone. Cheap: two spheres, no per-specimen material.
 */
const EYE_WHITE = new THREE.MeshStandardMaterial({
  color: 0xf2f7fa,
  roughness: 0.35,
  metalness: 0,
})
const EYE_PUPIL = new THREE.MeshBasicMaterial({ color: 0x0a0f14 })

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

/** Paired pectoral fins — the caller flaps them via `name`. */
function addPectorals(
  g: THREE.Group,
  fin: THREE.MeshStandardMaterial,
  x: number,
  z: number,
  scale = 1,
) {
  for (const side of [-1, 1] as const) {
    const pec = new THREE.Mesh(
      cached("pectoral", () => {
        const c = new THREE.ConeGeometry(0.3, 0.9, 3)
        c.rotateZ(Math.PI / 2)
        return c
      }),
      fin,
    )
    pec.position.set(side * x, -0.05, z)
    pec.rotation.y = side * 0.4
    pec.scale.setScalar(scale)
    pec.name = side < 0 ? "pecL" : "pecR"
    g.add(pec)
  }
}

function addHitSphere(g: THREE.Group) {
  const hit = new THREE.Mesh(
    cached("hit", () => new THREE.SphereGeometry(2.2, 8, 6)),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
  )
  hit.name = "hit"
  g.add(hit)
}

function buildForm(form: FishForm, body: THREE.MeshStandardMaterial, fin: THREE.MeshStandardMaterial) {
  const g = new THREE.Group()
  switch (form) {
    case "grouper":
    case "tuna":
    case "shark": {
      const b = new THREE.Mesh(
        cached("cone", () => {
          const c = new THREE.ConeGeometry(0.8, 2.6, 8)
          c.rotateX(Math.PI / 2)
          return c
        }),
        body,
      )
      g.add(b)
      const tail = new THREE.Mesh(
        cached("tailfin", () => new THREE.ConeGeometry(0.85, 1.3, 3)),
        fin,
      )
      tail.rotation.x = -Math.PI / 2
      tail.position.z = -1.9
      tail.name = "tail"
      g.add(tail)
      const dors = new THREE.Mesh(
        cached("dorsal", () => new THREE.ConeGeometry(0.45, 1.2, 3)),
        fin,
      )
      dors.position.set(0, 0.7, -0.2)
      g.add(dors)
      addPectorals(g, fin, 0.62, 0.35, 1.1)
      addEyes(g, 1.02, 0.4, 0.24, 0.18)
      break
    }
    case "manta": {
      const s = new THREE.Shape()
      s.moveTo(0, 1.3)
      s.lineTo(2.4, -0.4)
      s.lineTo(0, -1.4)
      s.lineTo(-2.4, -0.4)
      s.closePath()
      const wing = cached("manta", () => {
        const e = new THREE.ExtrudeGeometry(s, {
          depth: 0.22,
          bevelEnabled: true,
          bevelSize: 0.1,
          bevelThickness: 0.1,
          bevelSegments: 1,
          steps: 1,
        })
        e.rotateX(Math.PI / 2)
        return e
      })
      const m = new THREE.Mesh(wing, body)
      m.name = "wing"
      g.add(m)
      break
    }
    case "eel": {
      for (let i = 0; i < 6; i++) {
        const seg = new THREE.Mesh(
          cached("eelseg", () => new THREE.SphereGeometry(0.42, 8, 6)),
          body,
        )
        seg.position.z = -i * 0.62
        seg.scale.set(1, 1 - i * 0.07, 1)
        seg.name = `seg${i}`
        g.add(seg)
      }
      break
    }
    case "pufferfish": {
      const b = new THREE.Mesh(
        cached("puff", () => new THREE.IcosahedronGeometry(1.05, 1)),
        body,
      )
      b.name = "puff"
      g.add(b)
      for (let i = 0; i < 12; i++) {
        const spike = new THREE.Mesh(
          cached("spike", () => new THREE.ConeGeometry(0.13, 0.6, 4)),
          fin,
        )
        const a = (i / 12) * Math.PI * 2
        const ty = i % 2 ? 0.5 : -0.4
        spike.position.set(Math.cos(a) * 1.0, ty, Math.sin(a) * 1.0)
        spike.lookAt(spike.position.clone().multiplyScalar(2))
        g.add(spike)
      }
      break
    }
    case "crab": {
      const b = new THREE.Mesh(
        cached("crabbody", () => {
          const s = new THREE.SphereGeometry(1, 10, 8)
          s.scale(1.2, 0.55, 1)
          return s
        }),
        body,
      )
      g.add(b)
      for (let i = 0; i < 6; i++) {
        const leg = new THREE.Mesh(
          cached("leg", () => new THREE.CylinderGeometry(0.08, 0.05, 1.4, 5)),
          fin,
        )
        const side = i < 3 ? -1 : 1
        leg.position.set(side * 1.1, -0.25, -0.7 + (i % 3) * 0.7)
        leg.rotation.z = side * 0.9
        g.add(leg)
      }
      break
    }
    case "jellyfish": {
      const dome = new THREE.Mesh(
        cached("dome", () =>
          new THREE.SphereGeometry(1.0, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.58),
        ),
        fin,
      )
      dome.name = "dome"
      g.add(dome)
      for (let i = 0; i < 7; i++) {
        const ten = new THREE.Mesh(
          cached("tentacle", () => new THREE.CylinderGeometry(0.05, 0.012, 2.2, 5)),
          fin,
        )
        const a = (i / 7) * Math.PI * 2
        ten.position.set(Math.cos(a) * 0.55, -1.1, Math.sin(a) * 0.55)
        ten.name = `ten${i}`
        g.add(ten)
      }
      break
    }
    case "anglerfish": {
      const b = new THREE.Mesh(
        cached("anglerbody", () => {
          const s = new THREE.SphereGeometry(1.1, 10, 8)
          s.scale(1, 0.85, 1.35)
          return s
        }),
        body,
      )
      g.add(b)
      const rod = new THREE.Mesh(
        cached("rod", () => new THREE.CylinderGeometry(0.05, 0.05, 2.2, 4)),
        fin,
      )
      rod.position.set(0, 1.3, 0.6)
      rod.rotation.x = 0.7
      g.add(rod)
      const lure = new THREE.Mesh(
        cached("lure", () => new THREE.SphereGeometry(0.26, 8, 6)),
        new THREE.MeshBasicMaterial({ color: 0xfff3b0 }),
      )
      lure.position.set(0, 2.2, 1.5)
      lure.name = "lure"
      g.add(lure)
      break
    }
    default: {
      // angelfish / clownfish / tetra / sardine
      const b = new THREE.Mesh(
        cached("disc", () => {
          const s = new THREE.SphereGeometry(0.9, 12, 10)
          s.scale(0.32, 1, 1.15)
          return s
        }),
        body,
      )
      g.add(b)
      const top = new THREE.Mesh(
        cached("topfin", () => new THREE.ConeGeometry(0.5, 1.4, 3)),
        fin,
      )
      top.position.set(0, 0.95, -0.15)
      top.rotation.x = -0.7
      g.add(top)
      const tail = new THREE.Mesh(
        cached("tailfin2", () => new THREE.ConeGeometry(0.55, 1.0, 3)),
        fin,
      )
      tail.rotation.x = Math.PI / 2
      tail.position.z = -1.2
      tail.name = "tail"
      g.add(tail)
      addPectorals(g, fin, 0.34, 0.3, 0.85)
      addEyes(g, 0.72, 0.22, 0.3, 0.15)
      break
    }
  }
  addHitSphere(g)
  return g
}

/** Build one lead fish mesh (school siblings handled by caller if needed). */
export function buildFishMesh(
  data: FishSpecimenInput,
  color: THREE.Color,
): BuiltFish {
  const form = resolveFishForm(data.species)
  const { body, fin } = makeMaterials(color, data.glow)
  const group = buildForm(form, body, fin)
  const glow = new THREE.PointLight(color, data.glow * 1.4, 7)
  group.add(glow)
  group.userData = { slug: data.slug, data, form }
  return { group, body, fin, glow, form }
}

/**
 * Procedural caustic texture — the dappled light pattern the surface casts on
 * the seabed. Generated once on a canvas (no external asset, no shader), then
 * scrolled/rotated per frame by the renderer.
 */
export function buildCausticTexture(size = 256): THREE.Texture | null {
  if (typeof document === "undefined") return null
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = size
  const ctx = canvas.getContext("2d")
  if (!ctx) return null
  ctx.fillStyle = "#000000"
  ctx.fillRect(0, 0, size, size)
  // Sum a few sine bands at different angles → interference cells that read as
  // water caustics once tiled and drifted.
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
 * Soft round sprite for Points clouds. Without a map, `PointsMaterial` draws
 * hard squares — bubbles and marine snow read as floating pixels.
 */
export function buildPointSprite(size = 64): THREE.Texture | null {
  if (typeof document === "undefined") return null
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = size
  const ctx = canvas.getContext("2d")
  if (!ctx) return null
  const r = size / 2
  const grad = ctx.createRadialGradient(r, r, 0, r, r, r)
  grad.addColorStop(0, "rgba(255,255,255,1)")
  grad.addColorStop(0.45, "rgba(255,255,255,0.55)")
  grad.addColorStop(1, "rgba(255,255,255,0)")
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(canvas)
}

/** A swaying seaweed stalk; caller animates via `userData.segments`. */
export function buildSeaweed(
  height: number,
  color: THREE.Color,
  seed: number,
): THREE.Group {
  const stalk = new THREE.Group()
  const segs = 6
  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.12,
    roughness: 0.85,
    metalness: 0,
    side: THREE.DoubleSide,
    flatShading: true,
    transparent: true,
    opacity: 0.92,
  })
  const segH = height / segs
  for (let i = 0; i < segs; i++) {
    const w = 0.42 * (1 - i / (segs + 2))
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(w, segH, 0.08),
      mat,
    )
    blade.position.y = segH * (i + 0.5)
    blade.name = `seg${i}`
    stalk.add(blade)
  }
  stalk.userData = { segs, seed, segH }
  return stalk
}

/** Soft coral fan — static seabed prop in an accent tint. */
export function buildCoral(color: THREE.Color, scale = 1): THREE.Group {
  const coral = new THREE.Group()
  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.22,
    roughness: 0.7,
    metalness: 0.02,
    flatShading: true,
  })
  const arms = 5
  for (let i = 0; i < arms; i++) {
    const a = (i / arms) * Math.PI * 2
    const arm = new THREE.Mesh(new THREE.ConeGeometry(0.26, 2.2, 5), mat)
    arm.position.set(Math.cos(a) * 0.5, 1.0, Math.sin(a) * 0.5)
    arm.rotation.z = Math.cos(a) * 0.35
    arm.rotation.x = -Math.sin(a) * 0.35
    coral.add(arm)
  }
  const base = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), mat)
  base.scale.y = 0.5
  coral.add(base)
  coral.scale.setScalar(scale)
  return coral
}

/** Low-poly cat on the rim — ported from tank3d `buildCat`. */
export function buildCatMesh(waterY: number): THREE.Group {
  const cat = new THREE.Group()
  // Mid-tone fur with a lift: at 0x1b2a44 the cat was indistinguishable from
  // the night-dive background it sits against.
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
  // Built centred on the group origin. The caller owns where the cat sits —
  // baking an x offset in here as well put it a full head-width off frame.
  const head = new THREE.Mesh(new THREE.SphereGeometry(3.2, 16, 12), fur)
  cat.add(head)
  for (const side of [-1, 1] as const) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.2, 4), fur)
    ear.position.set(side * 1.6, 2.8, 0)
    ear.rotation.z = side * 0.25
    cat.add(ear)
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.62, 10, 8),
      new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.8,
      }),
    )
    eye.position.set(side * 1.1, 0.4, 2.6)
    cat.add(eye)
  }
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.5, 4), pink)
  nose.position.set(0, -0.4, 3.1)
  nose.rotation.x = Math.PI / 2
  cat.add(nose)
  // Foreleg hangs down past the chin toward the water rather than across the
  // face — at 0.6rad it read as a stick laid over the head.
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.68, 5.2, 8), fur)
  arm.position.set(-2.6, -3.6, 1.8)
  arm.rotation.z = 0.22
  arm.name = "paw"
  cat.add(arm)
  const pad = new THREE.Mesh(new THREE.SphereGeometry(1.05, 12, 10), fur)
  pad.position.set(-3.3, -6.0, 1.9)
  cat.add(pad)
  cat.position.set(0, waterY + 3.6, 0)
  return cat
}
