/**
 * Procedural Voronoi Caustics Shader
 * Domain-warped, multi-octave water caustics with dual-layer wave interference,
 * subtle chromatic dispersion, and a radial mask so the plane's square edge never
 * cuts a straight line across the seabed.
 */

import * as THREE from "three"

import { clampOctaves, withDefines } from "./noiseCommon"
import { CAUSTIC_GLSL } from "./causticProjection"

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`

const FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uSpeed;
  uniform float uScale;
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uOpacity;

  varying vec2 vUv;
  varying vec3 vWorldPosition;

  ${CAUSTIC_GLSL}

  void main() {
    vec2 uv = vWorldPosition.xz * uScale * 0.1;
    float t = uTime * uSpeed;

    // Chromatic dispersion: sample R, G, B channels with small offset
    float r = causticOctaves(uv + vec2(0.003, 0.0), t);
    float g = causticOctaves(uv, t * 1.05);
    float b = causticOctaves(uv - vec2(0.003, 0.002), t * 0.95);

    // Slow breathing tied to the same noise field that drives the god rays.
    float breathe = 0.72 + 0.45 * fbm(uv * 0.35 + vec2(t * 0.05, -t * 0.04));

    // Radial mask — hides the plane's square boundary on the seabed.
    float edge = 1.0 - smoothstep(0.34, 0.5, length(vUv - 0.5));

    vec3 causticCol = vec3(r, g, b) * uColor * uIntensity * 2.2 * breathe;
    float alpha = max(max(r, g), b) * uOpacity * breathe * edge;

    gl_FragColor = vec4(causticCol * edge, alpha);
  }
`

export const CausticShader = {
  uniforms: {
    uTime: { value: 0 },
    uSpeed: { value: 0.65 },
    uScale: { value: 0.35 },
    uColor: { value: new THREE.Color(0x6ee7b7) },
    uIntensity: { value: 0.75 },
    uOpacity: { value: 0.45 },
  },
  vertexShader: VERTEX,
  fragmentShader: withDefines(FRAGMENT, { NOISE_OCTAVES: 4 }),
}

export interface CausticMaterialBundle extends THREE.ShaderMaterial {
  uniforms: {
    uTime: { value: number }
    uSpeed: { value: number }
    uScale: { value: number }
    uColor: { value: THREE.Color }
    uIntensity: { value: number }
    uOpacity: { value: number }
  }
}

/** Build the seabed caustic material; `octaves` comes from the quality tier. */
export function createCausticMaterial(
  color: THREE.Color,
  intensity: number,
  opacity: number,
  octaves = 4,
): CausticMaterialBundle {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSpeed: { value: 0.65 },
      uScale: { value: 0.35 },
      uColor: { value: color },
      uIntensity: { value: intensity },
      uOpacity: { value: opacity },
    },
    vertexShader: VERTEX,
    fragmentShader: withDefines(FRAGMENT, { NOISE_OCTAVES: clampOctaves(octaves) }),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  }) as unknown as CausticMaterialBundle
}
