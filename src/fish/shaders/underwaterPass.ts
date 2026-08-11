/**
 * Underwater wobble — a scrolling-noise UV displacement with a chromatic split,
 * so everything below the waterline shimmers. Cheaper than true refraction: one
 * fullscreen quad, never a second scene render.
 *
 * This used to own a render target and drive its own blit. It is now a
 * `ShaderPass` definition inside the tank composer chain
 * (fish/postprocessing/tankComposer.ts), which owns the targets for every pass.
 */

import * as THREE from "three"

import { FBM_GLSL, HASH_GLSL, VALUE_NOISE_GLSL, clampOctaves, withDefines } from "./noiseCommon"

/** Maximum UV displacement at amount = 1; small enough that labels stay legible. */
export const MAX_WOBBLE_OFFSET = 0.012

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FRAGMENT = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform float uTime;
  uniform float uAmount;
  uniform vec2 uAspect;

  varying vec2 vUv;

  ${HASH_GLSL}
  ${VALUE_NOISE_GLSL}
  ${FBM_GLSL}

  void main() {
    vec2 p = vUv * uAspect;
    // Two decorrelated fbm lookups → a smooth, non-repeating offset field.
    float nx = fbm(p * 2.6 + vec2(uTime * 0.09, uTime * 0.05));
    float ny = fbm(p * 2.6 + vec2(-uTime * 0.07, 4.7 + uTime * 0.06));
    vec2 offset = (vec2(nx, ny) * 2.0 - 1.0) * uAmount;

    // Chromatic split scales with the wobble so calm water stays clean.
    float split = uAmount * 0.35;
    vec2 uvR = clamp(vUv + offset * (1.0 + split), 0.0, 1.0);
    vec2 uvG = clamp(vUv + offset, 0.0, 1.0);
    vec2 uvB = clamp(vUv + offset * (1.0 - split), 0.0, 1.0);

    gl_FragColor = vec4(
      texture2D(tDiffuse, uvR).r,
      texture2D(tDiffuse, uvG).g,
      texture2D(tDiffuse, uvB).b,
      1.0
    );
  }
`

export interface UnderwaterShaderDef {
  name: string
  uniforms: Record<string, { value: unknown }>
  vertexShader: string
  fragmentShader: string
}

/**
 * Build the wobble shader definition for a `ShaderPass`.
 * `octaves` comes from the quality tier and is compiled in, not branched.
 */
export function createUnderwaterShader(octaves = 4): UnderwaterShaderDef {
  return {
    name: "UnderwaterWobbleShader",
    uniforms: {
      tDiffuse: { value: null },
      uTime: { value: 0 },
      uAmount: { value: 0 },
      uAspect: { value: new THREE.Vector2(1, 1) },
    },
    vertexShader: VERTEX,
    fragmentShader: withDefines(FRAGMENT, { NOISE_OCTAVES: clampOctaves(octaves) }),
  }
}
