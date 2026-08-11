/**
 * Procedural Voronoi Caustics Shader
 * Generates dynamic, multi-octave water caustics with dual-layer wave interference
 * and subtle chromatic dispersion for the underwater seabed.
 */

import * as THREE from "three"

export const CausticShader = {
  uniforms: {
    uTime: { value: 0 },
    uSpeed: { value: 0.65 },
    uScale: { value: 0.35 },
    uColor: { value: new THREE.Color(0x6ee7b7) },
    uIntensity: { value: 0.75 },
    uOpacity: { value: 0.45 },
  },

  vertexShader: /* glsl */ `
    varying vec2 vUv;
    varying vec3 vWorldPosition;

    void main() {
      vUv = uv;
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,

  fragmentShader: /* glsl */ `
    uniform float uTime;
    uniform float uSpeed;
    uniform float uScale;
    uniform vec3 uColor;
    uniform float uIntensity;
    uniform float uOpacity;

    varying vec2 vUv;
    varying vec3 vWorldPosition;

    // 2D Hash
    vec2 hash2(vec2 p) {
      p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
      return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
    }

    // 2D Voronoi / Cellular noise
    float voronoi(vec2 x, float t) {
      vec2 n = floor(x);
      vec2 f = fract(x);
      float m = 8.0;
      for(int j = -1; j <= 1; j++) {
        for(int i = -1; i <= 1; i++) {
          vec2 g = vec2(float(i), float(j));
          vec2 o = hash2(n + g);
          // Animate cell points with sinusoidal orbit
          vec2 r = g + 0.5 + 0.45 * sin(t + 6.2831 * o) - f;
          float d = dot(r, r);
          m = min(m, d);
        }
      }
      return sqrt(m);
    }

    // Layered caustic pattern with chromatic dispersion
    float causticOctaves(vec2 uv, float t) {
      float c1 = voronoi(uv * 3.5, t * 1.2);
      float c2 = voronoi((uv + vec2(0.3, 0.7)) * 5.0, t * 1.8);
      // Sharp caustic crest lines
      float f1 = pow(1.0 - c1, 3.5);
      float f2 = pow(1.0 - c2, 3.0);
      return (f1 * 0.65 + f2 * 0.35);
    }

    void main() {
      vec2 uv = vWorldPosition.xz * uScale * 0.1;
      float t = uTime * uSpeed;

      // Chromatic dispersion: sample R, G, B channels with small offset
      float r = causticOctaves(uv + vec2(0.003, 0.0), t);
      float g = causticOctaves(uv, t * 1.05);
      float b = causticOctaves(uv - vec2(0.003, 0.002), t * 0.95);

      vec3 causticCol = vec3(r, g, b) * uColor * uIntensity * 2.2;
      float alpha = max(max(r, g), b) * uOpacity;

      gl_FragColor = vec4(causticCol, alpha);
    }
  `,
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

export function createCausticMaterial(color: THREE.Color, intensity: number, opacity: number): CausticMaterialBundle {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSpeed: { value: 0.65 },
      uScale: { value: 0.35 },
      uColor: { value: color },
      uIntensity: { value: intensity },
      uOpacity: { value: opacity },
    },
    vertexShader: CausticShader.vertexShader,
    fragmentShader: CausticShader.fragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  }) as unknown as CausticMaterialBundle
}
