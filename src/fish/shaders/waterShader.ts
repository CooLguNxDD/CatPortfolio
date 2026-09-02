/**
 * Water surface shader — GPU wave displacement with analytic normals.
 * Replaces the old CPU per-frame vertex loop: height is two directional swells plus
 * an fbm perturbation, and the normal comes from finite differences of the same
 * height function, so no computeVertexNormals() per frame.
 */

import * as THREE from "three"

import { FBM_GLSL, HASH_GLSL, VALUE_NOISE_GLSL, clampOctaves, withDefines } from "./noiseCommon"
import { WATER_CONFIG } from "@/blocks/fishTankConfig"

/** Height field shared by the displacement and the finite-difference normal. */
const HEIGHT_GLSL = /* glsl */ `
  float waveHeight(vec2 p, float t) {
    float h = sin(p.x * 0.35 + t * 1.4) * 0.22
            + cos(p.y * 0.40 + t * 1.1) * 0.18;
    // Chop: breaks the two-sine regularity that made the surface read as corrugation.
    h += (fbm(p * 0.22 + vec2(t * 0.07, -t * 0.05)) - 0.5) * 0.34;
    return h;
  }
`

const VERTEX = /* glsl */ `
  uniform float uTime;

  varying vec3 vNormalW;
  varying vec3 vViewDir;
  varying vec2 vPlane;

  ${HASH_GLSL}
  ${VALUE_NOISE_GLSL}
  ${FBM_GLSL}
  ${HEIGHT_GLSL}

  #include <fog_pars_vertex>

  void main() {
    // Geometry is pre-rotated into XZ, so local y is up and (x, z) is the plane.
    vec2 p = vec2(position.x, position.z);
    float h = waveHeight(p, uTime);

    // Analytic-ish normal from finite differences of the same height field.
    float e = 0.35;
    float hx = waveHeight(p + vec2(e, 0.0), uTime);
    float hz = waveHeight(p + vec2(0.0, e), uTime);
    vec3 n = normalize(vec3(h - hx, e, h - hz));

    vec3 displaced = vec3(position.x, position.y + h, position.z);
    vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
    vec4 mvPosition = viewMatrix * worldPos;

    vNormalW = normalize(mat3(modelMatrix) * n);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    vPlane = p;

    gl_Position = projectionMatrix * mvPosition;

    #include <fog_vertex>
  }
`

const FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  uniform vec3 uSun;
  uniform vec3 uSunDir;
  uniform float uOpacity;
  uniform float uSparkle;

  varying vec3 vNormalW;
  varying vec3 vViewDir;
  varying vec2 vPlane;

  ${HASH_GLSL}
  ${VALUE_NOISE_GLSL}
  ${FBM_GLSL}

  #include <fog_pars_fragment>

  void main() {
    vec3 n = normalize(vNormalW);
    vec3 v = normalize(vViewDir);
    vec3 l = normalize(uSunDir);

    vec3 col;
    float alpha;

    if (gl_FrontFacing) {
      // Seen from above (surface stage) — Fresnel + Blinn specular glint.
      float fres = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 3.0);

      vec3 hVec = normalize(l + v);
      float spec = pow(max(dot(n, hVec), 0.0), 64.0);

      // Noise-gated glint so only some crests catch the light.
      float gate = smoothstep(0.62, 0.92, fbm(vPlane * 0.6 + vec2(uTime * 0.12, -uTime * 0.09)));

      col = uColor;
      col = mix(col, uSun, fres * 0.55);
      col += uSun * spec * 0.9;
      col += uSun * gate * uSparkle;

      alpha = clamp(uOpacity + fres * 0.25 + spec * 0.35, 0.0, 1.0);
    } else {
      // Seen from below (the tank's normal submerged state) — Snell's
      // window: a cone of the above-water world directly overhead, total
      // internal reflection (a mirror of the water itself) outside it.
      // v points from this surface point toward the camera, so a camera
      // below looking straight up makes v point straight down.
      float snellCos = clamp(-v.y, 0.0, 1.0);
      float window = smoothstep(${WATER_CONFIG.snellCosLo.toFixed(4)}, ${WATER_CONFIG.snellCosHi.toFixed(4)}, snellCos);
      vec3 skyBleed = mix(uColor, uSun, ${WATER_CONFIG.windowSkyMix.toFixed(4)});
      vec3 mirror = uColor * ${WATER_CONFIG.mirrorDarken.toFixed(4)};
      col = mix(mirror, skyBleed, window);
      alpha = mix(uOpacity + ${WATER_CONFIG.underAlphaOuter.toFixed(4)}, uOpacity * ${WATER_CONFIG.underAlphaInnerMul.toFixed(4)}, window);
    }

    gl_FragColor = vec4(col, alpha);

    #include <fog_fragment>
  }
`

export interface WaterMaterial extends THREE.ShaderMaterial {
  uniforms: {
    uTime: { value: number }
    uColor: { value: THREE.Color }
    uSun: { value: THREE.Color }
    uSunDir: { value: THREE.Vector3 }
    uOpacity: { value: number }
    uSparkle: { value: number }
    [key: string]: THREE.IUniform
  }
}

export interface WaterMaterialOptions {
  color: THREE.Color
  sun: THREE.Color
  opacity: number
  /** Light theme dials the sparkle down — daylight water is not bioluminescent. */
  light?: boolean
  octaves?: number
}

/** Build the animated water-surface material (fog-wired, double-sided, transparent). */
export function createWaterMaterial(opts: WaterMaterialOptions): WaterMaterial {
  const { color, sun, opacity, light = false, octaves = 4 } = opts
  const oct = clampOctaves(octaves)

  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uTime: { value: 0 },
        uColor: { value: color.clone() },
        uSun: { value: sun.clone() },
        uSunDir: { value: new THREE.Vector3(0.25, 1.0, 0.35).normalize() },
        uOpacity: { value: opacity },
        uSparkle: { value: light ? 0.12 : 0.3 },
      },
    ]),
    vertexShader: withDefines(VERTEX, { NOISE_OCTAVES: oct }),
    fragmentShader: withDefines(FRAGMENT, { NOISE_OCTAVES: oct }),
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    // Raw ShaderMaterials drop three's fog unless it is opted back in here *and*
    // via the <fog_*> includes above; without it the surface pops out of the haze.
    fog: true,
  }) as unknown as WaterMaterial

  mat.uniforms.uColor.value = color
  mat.uniforms.uSun.value = sun
  return mat
}
