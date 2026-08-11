/**
 * Ambient "commit-minnow" shoal — one InstancedMesh, all motion on the GPU.
 *
 * Each minnow stands for a micro-contribution swimming around the hero
 * specimens. Path *and* spine deformation are evaluated in the vertex shader
 * (fish/shaders/spineDeform.ts), so the frame loop writes exactly one uniform
 * per frame regardless of population — CPU cost is O(1), not O(count).
 *
 * `buildMinnowAttributes` is deterministic and DOM/three-free so the swarm is
 * stable across reloads and unit-testable without a GL context.
 */

import * as THREE from "three"

import { hashToUnit } from "@/blocks/scene2dLayout"
import {
  SWIM_Y_MAX,
  SWIM_Y_MIN,
  TANK_HALF_D,
  TANK_HALF_W,
} from "@/blocks/fishTankLayout"
import { SPINE_ATTRIBUTES_GLSL, SPINE_GLSL } from "./shaders/spineDeform"

/** Per-instance buffers consumed by the vertex shader. */
export interface MinnowAttributes {
  count: number
  /** Cruise rate multiplier — drives both tail beat and path speed. */
  speed: Float32Array
  /** Desynchronising phase offset, radians. */
  phase: Float32Array
  /** Spatial frequency of the spine wave along the body. */
  frequency: Float32Array
  /** Lateral tail sweep in object units. */
  amplitude: Float32Array
  /** Uniform body scale. */
  scale: Float32Array
  /** World Y the orbit is centred on. */
  depth: Float32Array
  /** (centerX, centerZ, radiusX, radiusZ) — 4 floats per instance. */
  orbit: Float32Array
  /** Index into the palette list supplied by the caller. */
  paletteIndex: Uint8Array
}

/**
 * Deterministic per-instance traits. The same (count, seed) pair always yields
 * the same shoal, so a reload does not reshuffle the ambient layer.
 */
export function buildMinnowAttributes(
  count: number,
  seed: string,
  paletteSize = 4,
): MinnowAttributes {
  const n = Math.max(0, Math.floor(count) || 0)
  const palettes = Math.max(1, Math.floor(paletteSize) || 1)
  const speed = new Float32Array(n)
  const phase = new Float32Array(n)
  const frequency = new Float32Array(n)
  const amplitude = new Float32Array(n)
  const scale = new Float32Array(n)
  const depth = new Float32Array(n)
  const orbit = new Float32Array(n * 4)
  const paletteIndex = new Uint8Array(n)

  for (let i = 0; i < n; i++) {
    const key = `${seed}:${i}`
    const u = hashToUnit(key)
    const v = hashToUnit(`${key}:z`)
    const w = hashToUnit(`${key}:r`)
    const p = hashToUnit(`${key}:ph`)
    const d = hashToUnit(`${key}:d`)
    const s = hashToUnit(`${key}:s`)

    speed[i] = 0.45 + u * 0.75
    phase[i] = p * Math.PI * 2
    // Higher frequency than the hero fish: small bodies beat faster.
    frequency[i] = 3.2 + v * 2.6
    amplitude[i] = 0.18 + w * 0.16
    scale[i] = 0.28 + s * 0.34
    // Keep the shoal inside the usable swim band, biased to mid-water.
    depth[i] = SWIM_Y_MIN + 2 + d * (SWIM_Y_MAX - SWIM_Y_MIN - 4)

    orbit[i * 4] = (u - 0.5) * (TANK_HALF_W * 1.5)
    orbit[i * 4 + 1] = (v - 0.5) * (TANK_HALF_D * 1.4)
    orbit[i * 4 + 2] = TANK_HALF_W * (0.1 + w * 0.28)
    orbit[i * 4 + 3] = TANK_HALF_D * (0.1 + p * 0.26)

    paletteIndex[i] = Math.floor(hashToUnit(`${key}:c`) * palettes) % palettes
  }

  return { count: n, speed, phase, frequency, amplitude, scale, depth, orbit, paletteIndex }
}

/**
 * Minimal position/normal merge — avoids the BufferGeometryUtils addon for two
 * primitives whose attribute sets we fully control.
 */
function mergeParts(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const positions: number[] = []
  const normals: number[] = []
  for (const part of parts) {
    const flat = part.index ? part.toNonIndexed() : part
    const pos = flat.getAttribute("position")
    const nrm = flat.getAttribute("normal")
    for (let i = 0; i < pos.count; i++) {
      positions.push(pos.getX(i), pos.getY(i), pos.getZ(i))
      normals.push(nrm.getX(i), nrm.getY(i), nrm.getZ(i))
    }
    if (flat !== part) flat.dispose()
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3))
  return geo
}

/** Low-poly minnow: diamond hull stretched along +Z with a flat tail fin. */
function buildMinnowGeometry(): THREE.BufferGeometry {
  const body = new THREE.OctahedronGeometry(0.5, 0)
  body.scale(0.55, 0.7, 1.8)
  const tail = new THREE.ConeGeometry(0.42, 0.7, 3)
  // Cone points +Y by default; lay it along -Z, behind the body.
  tail.rotateX(Math.PI / 2)
  tail.translate(0, 0, -1.1)
  const merged = mergeParts([body, tail])
  body.dispose()
  tail.dispose()
  return merged
}

export interface MinnowField {
  mesh: THREE.InstancedMesh
  /** Advance the shared shader clock (already scaled by the quality tier). */
  update(shaderTime: number): void
  /** Retint the shoal after a theme / circadian palette resample. */
  setColors(colors: THREE.Color[]): void
  dispose(): void
}

export interface MinnowFieldOptions {
  count: number
  colors: THREE.Color[]
  /** Compile-time fbm octaves, forwarded to injected pattern chunks. */
  octaves?: number
  seed?: string
  /** Emissive floor so the shoal still reads in a night-dive palette. */
  emissiveIntensity?: number
  /** Emissive tint; keep it dark so instance colours stay readable. */
  emissiveTint?: number
}

/**
 * Build the instanced shoal. The material is a patched `MeshStandardMaterial`
 * rather than a raw `ShaderMaterial` so it keeps scene lighting, fog and the
 * world-space caustic injection every other tank surface receives.
 */
export function createMinnowField(options: MinnowFieldOptions): MinnowField {
  const { colors, octaves = 4, seed = "commit-minnows" } = options
  const count = Math.max(0, Math.floor(options.count) || 0)
  const attrs = buildMinnowAttributes(count, seed, Math.max(1, colors.length))

  const geometry = buildMinnowGeometry()
  geometry.setAttribute("aSpeed", new THREE.InstancedBufferAttribute(attrs.speed, 1))
  geometry.setAttribute("aPhase", new THREE.InstancedBufferAttribute(attrs.phase, 1))
  geometry.setAttribute("aFrequency", new THREE.InstancedBufferAttribute(attrs.frequency, 1))
  geometry.setAttribute("aAmplitude", new THREE.InstancedBufferAttribute(attrs.amplitude, 1))
  geometry.setAttribute("aScale", new THREE.InstancedBufferAttribute(attrs.scale, 1))
  geometry.setAttribute("aDepth", new THREE.InstancedBufferAttribute(attrs.depth, 1))
  geometry.setAttribute("aOrbit", new THREE.InstancedBufferAttribute(attrs.orbit, 4))
  // The shader places every instance, so bounds derived from the base geometry
  // are meaningless — cover the tank volume instead.
  geometry.boundingSphere = new THREE.Sphere(
    new THREE.Vector3(0, (SWIM_Y_MAX + SWIM_Y_MIN) / 2, 0),
    Math.hypot(TANK_HALF_W, TANK_HALF_D) * 1.6,
  )

  const uTime = { value: 0 }
  const material = new THREE.MeshStandardMaterial({
    roughness: 0.42,
    metalness: 0.05,
    // A white emissive at any strength washes the per-instance colour out to
    // grey, so the glow is tinted and kept low — the shoal reads as domain
    // colour first, bioluminescence second.
    emissive: new THREE.Color(options.emissiveTint ?? 0x0b3b4a),
    emissiveIntensity: options.emissiveIntensity ?? 0.35,
    flatShading: true,
  })

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uTime
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
         uniform float uTime;
         attribute float aScale;
         attribute float aDepth;
         attribute vec4 aOrbit;
         ${SPINE_ATTRIBUTES_GLSL}
         ${SPINE_GLSL}
         float minnowPathTime() { return uTime * aSpeed * 0.35 + aPhase; }`,
      )
      .replace(
        "#include <beginnormal_vertex>",
        `#include <beginnormal_vertex>
         objectNormal = yawMatrix(orbitHeading(aOrbit, minnowPathTime())) * objectNormal;`,
      )
      .replace(
        "#include <begin_vertex>",
        `vec3 transformed = position * aScale;
         transformed = applySpineDeform(transformed, uTime, aSpeed, aFrequency, aPhase, aAmplitude * aScale);
         float minnowT = minnowPathTime();
         transformed = yawMatrix(orbitHeading(aOrbit, minnowT)) * transformed;
         transformed += orbitPosition(aOrbit, aDepth, minnowT);`,
      )
  }
  // Keep patched and unpatched standard materials in separate program buckets.
  material.customProgramCacheKey = () => `minnow-${octaves}`

  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, count))
  mesh.count = count
  mesh.frustumCulled = false
  mesh.name = "commit-minnows"

  // Instance transforms stay identity: placement happens in the vertex shader.
  const identity = new THREE.Matrix4()
  for (let i = 0; i < count; i++) mesh.setMatrixAt(i, identity)
  mesh.instanceMatrix.needsUpdate = true

  function setColors(next: THREE.Color[]) {
    if (!next.length || count === 0) return
    for (let i = 0; i < count; i++) {
      mesh.setColorAt(i, next[attrs.paletteIndex[i] % next.length])
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }
  setColors(colors)

  return {
    mesh,
    update(shaderTime: number) {
      uTime.value = shaderTime
    },
    setColors,
    dispose() {
      geometry.dispose()
      material.dispose()
      mesh.dispose()
    },
  }
}
