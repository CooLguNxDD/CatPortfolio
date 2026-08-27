/**
 * Skybox shader for the fish tank's surface stage — the inverted dome behind
 * the tank above the waterline. Light themes get a sunny lagoon sky (sun disc
 * + drifting cloud over a sea horizon); dark themes get a star field + moon.
 * The look is keyed by theme mode (baked per layout), not a day/night clock —
 * `uStarDensity`/`uCloud` alone gate which look is on, no separate crossfade
 * uniform.
 *
 * `vDir` is the *local* (object-space) direction to the fragment, not a
 * camera-relative one, so stars and the sun/moon disc hold still in world
 * space as the visitor orbits — only `uDive` moves the horizon.
 */

import * as THREE from "three"

import { FBM_GLSL, HASH3_GLSL, HASH_GLSL, VALUE_NOISE_GLSL, clampOctaves, withDefines } from "./noiseCommon"

const VERTEX = /* glsl */ `
  varying vec3 vDir;

  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform vec3 uSkyTop;
  uniform vec3 uSkyHorizon;
  uniform vec3 uDeep;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform float uSunSize;
  uniform float uStarDensity;
  uniform float uCloud;
  uniform float uDive;

  varying vec3 vDir;

  ${HASH_GLSL}
  ${HASH3_GLSL}
  ${VALUE_NOISE_GLSL}
  ${FBM_GLSL}

  #ifndef SKY_DETAIL
  #define SKY_DETAIL 1
  #endif

  /** One star layer: quantize direction into cells, sparsely light one point per cell. */
  float starLayer(vec3 dir, float cellScale, float threshold, float twinkleRate, float sizeSharp) {
    vec3 cell = floor(dir * cellScale);
    float h = hash3(cell);
    if (h < threshold) return 0.0;
    vec3 local = fract(dir * cellScale) - 0.5;
    // Jitter the star's position within its cell so the grid doesn't read as a grid.
    vec2 jitter = (vec2(hash3(cell + 3.1), hash3(cell + 7.7)) - 0.5) * 0.7;
    float d = length(local.xy - jitter);
    float core = smoothstep(0.14, 0.0, d) * pow(smoothstep(0.14, 0.0, d), sizeSharp);
    float twinkle = 0.55 + 0.45 * sin(uTime * twinkleRate + h * 6.2831);
    return core * twinkle;
  }

  void main() {
    vec3 dir = normalize(vDir);
    float elevation = clamp(dir.y, 0.0, 1.0);

    // Vertical gradient, horizon-warm to zenith-cool.
    vec3 sky = mix(uSkyHorizon, uSkyTop, pow(elevation, 0.8));

    // Sun / moon disc — one shape, two looks, colour/size driven by the
    // theme-derived palette so the water's shared uSunDir always has
    // something visibly overhead to match.
    float sd = clamp(dot(dir, normalize(uSunDir)), 0.0, 1.0);
    float core = smoothstep(uSunSize, uSunSize + 0.004, sd);
    float halo = pow(sd, 48.0);
    sky += uSunColor * (core * 1.4 + halo * 0.5);

    // Clouds — day only, banded toward the horizon so they thin near the zenith.
    #if SKY_DETAIL
    if (uCloud > 0.001 && dir.y > 0.0) {
      vec2 cuv = dir.xz / max(dir.y, 0.08) * 0.06 + vec2(uTime * 0.012, 0.0);
      float c = fbm(cuv) * fbm(cuv * 2.3 + 4.1);
      float band = smoothstep(0.05, 0.4, dir.y) * smoothstep(1.0, 0.35, dir.y);
      sky = mix(sky, uSkyTop + uSunColor * 0.15, smoothstep(0.5, 0.85, c) * band * uCloud);
    }
    #endif

    // Stars — dark themes only, above the horizon.
    if (uStarDensity > 0.001 && dir.y > -0.02) {
      float above = smoothstep(-0.02, 0.08, dir.y);
      float stars = starLayer(dir, 42.0, 1.0 - 0.028 * uStarDensity, 1.6, 3.0);
      #if SKY_DETAIL
      stars += starLayer(dir, 110.0, 1.0 - 0.06 * uStarDensity, 2.4, 1.5) * 0.55;
      #endif
      sky += vec3(stars) * above;
    }

    // Sea horizon: fade the dome's lower hemisphere to the tank's deep-water
    // colour so the join with the water plane's edge reads as a horizon line,
    // not a floating sphere seam.
    float horizonFade = smoothstep(0.05, -0.15, dir.y);
    sky = mix(sky, uDeep, horizonFade);

    // Diving hides the sky entirely behind the same deep tone the backdrop
    // used to carry alone.
    sky = mix(sky, uDeep, uDive);

    gl_FragColor = vec4(sky, 1.0);
  }
`

export interface SkyMaterial extends THREE.ShaderMaterial {
  uniforms: {
    uTime: { value: number }
    uSkyTop: { value: THREE.Color }
    uSkyHorizon: { value: THREE.Color }
    uDeep: { value: THREE.Color }
    uSunDir: { value: THREE.Vector3 }
    uSunColor: { value: THREE.Color }
    uSunSize: { value: number }
    uStarDensity: { value: number }
    uCloud: { value: number }
    uDive: { value: number }
    [key: string]: THREE.IUniform
  }
}

export interface SkyMaterialOptions {
  skyTop: THREE.Color
  skyHorizon: THREE.Color
  deep: THREE.Color
  sunDir: THREE.Vector3
  sunColor: THREE.Color
  sunSize: number
  starDensity: number
  cloudStrength: number
  octaves?: number
}

/** Build the sky-dome material. `octaves` below 3 drops clouds + the dense star layer. */
export function createSkyMaterial(opts: SkyMaterialOptions): SkyMaterial {
  const {
    skyTop,
    skyHorizon,
    deep,
    sunDir,
    sunColor,
    sunSize,
    starDensity,
    cloudStrength,
    octaves = 4,
  } = opts
  const oct = clampOctaves(octaves)
  const detail = oct >= 3 ? 1 : 0

  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSkyTop: { value: skyTop.clone() },
      uSkyHorizon: { value: skyHorizon.clone() },
      uDeep: { value: deep.clone() },
      uSunDir: { value: sunDir.clone() },
      uSunColor: { value: sunColor.clone() },
      uSunSize: { value: sunSize },
      uStarDensity: { value: starDensity },
      uCloud: { value: cloudStrength },
      uDive: { value: 0 },
    },
    vertexShader: VERTEX,
    fragmentShader: withDefines(FRAGMENT, { NOISE_OCTAVES: oct, SKY_DETAIL: detail }),
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  }) as unknown as SkyMaterial
}
