/**
 * World-space caustic projection shared by the seabed plane and every lit
 * surface in the tank.
 *
 * The pattern function used to live inside causticShader.ts and only reached
 * the floor. Extracting it lets `patchMaterialCaustics` inject the same field
 * into any `MeshStandardMaterial` via `onBeforeCompile`, so light ripples run
 * across rocks, coral, and fish bodies instead of stopping at the sand.
 *
 * Sampling is world-space XZ, so the pattern stays continuous where surfaces
 * meet rather than swimming with each object's UVs.
 */

import * as THREE from "three"

import { FBM_GLSL, HASH_GLSL, VALUE_NOISE_GLSL, clampOctaves } from "./noiseCommon"

/** Animated Voronoi cell distance — the caustic crest generator. */
export const VORONOI_GLSL = /* glsl */ `
  float voronoi(vec2 x, float t) {
    vec2 n = floor(x);
    vec2 f = fract(x);
    float m = 8.0;
    for(int j = -1; j <= 1; j++) {
      for(int i = -1; i <= 1; i++) {
        vec2 g = vec2(float(i), float(j));
        vec2 o = hash2(n + g);
        // Animate cell points with a sinusoidal orbit
        vec2 r = g + 0.5 + 0.45 * sin(t + 6.2831 * o) - f;
        float d = dot(r, r);
        m = min(m, d);
      }
    }
    return sqrt(m);
  }
`

/** Layered, domain-warped caustic pattern. Requires VORONOI_GLSL + FBM_GLSL. */
export const CAUSTIC_PATTERN_GLSL = /* glsl */ `
  float causticOctaves(vec2 uv, float t) {
    vec2 q = uv + 0.35 * (vec2(
      fbm(uv * 1.5 + vec2(0.0, t * 0.2)),
      fbm(uv * 1.5 + vec2(5.2, 1.3 - t * 0.2))
    ) * 2.0 - 1.0);
    float c1 = voronoi(q * 3.5, t * 1.2);
    float c2 = voronoi((q + vec2(0.3, 0.7)) * 5.0, t * 1.8);
    // Sharp caustic crest lines
    float f1 = pow(1.0 - c1, 3.5);
    float f2 = pow(1.0 - c2, 3.0);
    return (f1 * 0.65 + f2 * 0.35);
  }
`

/** Everything the caustic field needs, in dependency order. */
export const CAUSTIC_GLSL = `${HASH_GLSL}\n${VALUE_NOISE_GLSL}\n${FBM_GLSL}\n${VORONOI_GLSL}\n${CAUSTIC_PATTERN_GLSL}`

export interface CausticPatchOptions {
  /** Shared clock uniform — pass the same object to every patched material. */
  time: { value: number }
  color: THREE.Color
  /** Additive light strength; 0 disables without recompiling. */
  strength: { value: number }
  octaves?: number
  /** World-space sampling scale; matches the seabed plane default. */
  scale?: number
}

/**
 * Inject world-space caustics into a standard material.
 *
 * Chains onto any existing `onBeforeCompile` (the minnow field installs its own
 * vertex patch first), and gives the material a distinct program cache key so
 * patched and unpatched standard materials do not share a compiled program.
 */
export function patchMaterialCaustics(
  material: THREE.Material & {
    onBeforeCompile?: THREE.Material["onBeforeCompile"]
    customProgramCacheKey?: () => string
  },
  options: CausticPatchOptions,
): void {
  const octaves = clampOctaves(options.octaves ?? 4)
  const scale = options.scale ?? 0.35
  const prevCompile = material.onBeforeCompile
  const prevKey = material.customProgramCacheKey

  material.onBeforeCompile = (shader, renderer) => {
    prevCompile?.call(material, shader, renderer)

    shader.uniforms.uCausticTime = options.time
    shader.uniforms.uCausticColor = { value: options.color }
    shader.uniforms.uCausticStrength = options.strength
    shader.uniforms.uCausticScale = { value: scale }

    // World position varying — three only provides one when a feature needs it.
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
         varying vec3 vCausticWorld;`,
      )
      .replace(
        "#include <worldpos_vertex>",
        `#include <worldpos_vertex>
         vCausticWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
      )

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
         #ifndef NOISE_OCTAVES
         #define NOISE_OCTAVES ${octaves}
         #endif
         varying vec3 vCausticWorld;
         uniform float uCausticTime;
         uniform vec3 uCausticColor;
         uniform float uCausticStrength;
         uniform float uCausticScale;
         ${CAUSTIC_GLSL}`,
      )
      .replace(
        "#include <dithering_fragment>",
        `#include <dithering_fragment>
         {
           float ct = uCausticTime * 0.65;
           vec2 cuv = vCausticWorld.xz * uCausticScale * 0.1;
           float caustic = causticOctaves(cuv, ct);
           // Up-facing surfaces catch the most light, walls glance it.
           // normal is view-space here (and exists under FLAT_SHADED, where
           // vNormal is not declared), so compare against world-up in view space.
           vec3 upView = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
           float facing = clamp(dot(normal, upView) * 0.5 + 0.5, 0.0, 1.0);
           gl_FragColor.rgb += uCausticColor * caustic * uCausticStrength * facing;
         }`,
      )
  }

  material.customProgramCacheKey = () =>
    `${prevKey ? prevKey.call(material) : ""}|caustic-${octaves}`
  material.needsUpdate = true
}
