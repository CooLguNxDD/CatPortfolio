/**
 * Volumetric god-ray shader for the tank's light shafts.
 * One material per cone: a per-ray seed desyncs the shimmer, fbm bands drift down
 * the shaft, and the silhouette term dissolves the hard cone outline that additive
 * blending would otherwise expose.
 */

import * as THREE from "three"

import { FBM_GLSL, HASH_GLSL, VALUE_NOISE_GLSL, clampOctaves, withDefines } from "./noiseCommon"

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vViewNormal;
  varying vec3 vViewDir;

  void main() {
    vUv = uv;
    vec4 viewPos = modelViewMatrix * vec4(position, 1.0);
    vViewNormal = normalize(normalMatrix * normal);
    vViewDir = normalize(-viewPos.xyz);
    gl_Position = projectionMatrix * viewPos;
  }
`

const FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uStrength;
  uniform float uSeed;

  varying vec2 vUv;
  varying vec3 vViewNormal;
  varying vec3 vViewDir;

  ${HASH_GLSL}
  ${VALUE_NOISE_GLSL}
  ${FBM_GLSL}

  void main() {
    // Cone uv.y: 0 at the wide base (seabed), 1 at the apex (water surface).
    float depth = vUv.y;

    // Bright just under the surface, dissolved before the tip touches the floor.
    float vertical = smoothstep(0.02, 0.30, depth) * smoothstep(1.0, 0.72, depth);

    // Silhouette soften: fade where the shell turns edge-on to the camera.
    float facing = abs(dot(normalize(vViewNormal), normalize(vViewDir)));
    float rim = smoothstep(0.0, 0.35, facing);

    // Volumetric breakup — bands drift downward along the shaft.
    float n = fbm(vec2(vUv.x * 4.0 + uSeed * 3.7, depth * 2.0 - uTime * 0.25 + uSeed));
    float bands = mix(0.35, 1.0, smoothstep(0.30, 0.85, n));

    // Per-ray shimmer, phase-offset by seed so the shafts never pulse in lockstep.
    float shimmer = 0.78 + 0.22 * sin(uTime * 0.4 + uSeed * 6.2831);

    float alpha = uStrength * vertical * rim * bands * shimmer;
    if (alpha <= 0.0005) discard;

    gl_FragColor = vec4(uColor * (0.85 + 0.35 * bands), alpha);
  }
`

export interface GodRayMaterial extends THREE.ShaderMaterial {
  uniforms: {
    uTime: { value: number }
    uColor: { value: THREE.Color }
    uStrength: { value: number }
    uSeed: { value: number }
  }
}

/** Build one god-ray material; `seed` in 0..1 desyncs this shaft from its neighbours. */
export function createGodRayMaterial(
  color: THREE.Color,
  strength: number,
  seed: number,
  octaves = 4,
): GodRayMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: color },
      uStrength: { value: strength },
      uSeed: { value: seed },
    },
    vertexShader: VERTEX,
    fragmentShader: withDefines(FRAGMENT, { NOISE_OCTAVES: clampOctaves(octaves) }),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
  }) as unknown as GodRayMaterial
}
