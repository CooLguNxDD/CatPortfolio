/**
 * Shared GLSL noise chunks for the fish tank shaders.
 * String constants only — no runtime cost; each material concatenates what it needs
 * so hash/value-noise/fbm exist in exactly one place.
 */

/** 2D signed hash — used by both the Voronoi caustics and value noise. */
export const HASH_GLSL = /* glsl */ `
  vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }

  float hash1(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }
`

/** Quintic-smoothstep value noise in [0,1]. Requires HASH_GLSL. */
export const VALUE_NOISE_GLSL = /* glsl */ `
  float noise2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    // Quintic fade — C2 continuous, no lattice creases.
    vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
    float a = hash1(i);
    float b = hash1(i + vec2(1.0, 0.0));
    float c = hash1(i + vec2(0.0, 1.0));
    float d = hash1(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }
`

/**
 * Fractal brownian motion over `noise2`. Octave count is the compile-time
 * `NOISE_OCTAVES` define so the low quality tier compiles a cheaper shader
 * instead of branching per pixel. Requires VALUE_NOISE_GLSL.
 */
export const FBM_GLSL = /* glsl */ `
  #ifndef NOISE_OCTAVES
  #define NOISE_OCTAVES 4
  #endif

  float fbm(vec2 p) {
    float sum = 0.0;
    float amp = 0.5;
    float norm = 0.0;
    for (int i = 0; i < NOISE_OCTAVES; i++) {
      sum += noise2(p) * amp;
      norm += amp;
      p *= 2.02;
      amp *= 0.5;
    }
    return sum / max(norm, 1e-4);
  }
`

/** Domain warp — offsets a coordinate by two decorrelated fbm lookups. Requires FBM_GLSL. */
export const DOMAIN_WARP_GLSL = /* glsl */ `
  vec2 warp(vec2 p, float t, float amp) {
    vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3 - t)));
    return p + amp * (q * 2.0 - 1.0);
  }
`

/** Everything, in dependency order. Most shaders just want this. */
export const NOISE_GLSL = `${HASH_GLSL}\n${VALUE_NOISE_GLSL}\n${FBM_GLSL}\n${DOMAIN_WARP_GLSL}`

/** Prepend compile-time defines (octave count etc.) to a shader source. */
export function withDefines(source: string, defines: Record<string, number | string>): string {
  const head = Object.entries(defines)
    .map(([k, v]) => `#define ${k} ${v}`)
    .join("\n")
  return head ? `${head}\n${source}` : source
}

/** Clamp an octave count to what the shaders are built for. */
export function clampOctaves(octaves: number): number {
  return Math.max(1, Math.min(6, Math.round(octaves) || 4))
}
