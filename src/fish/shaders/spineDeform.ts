/**
 * Vertebral spine deformation — GLSL chunks only, no runtime cost.
 *
 * ABZÛ-style swimming: the S-curve travels down the body in the vertex shader
 * instead of rotating a chain of `Object3D` bones on the CPU. The instanced
 * minnow field (fish/minnowField.ts) is the only consumer today; the ≤40 hero
 * specimens keep their CPU rig because their per-fish materials, glow lights
 * and raycast targets hang off those nodes.
 *
 * Coordinate convention matches speciesMeshes: +Z is the swim direction, so the
 * spine runs along Z and the tail sweep displaces X.
 */

/**
 * Per-instance attributes the deform reads. Declared separately so a material
 * patch can inject them into the `#include <common>` slot of a stock three
 * shader without duplicating the function body.
 */
export const SPINE_ATTRIBUTES_GLSL = /* glsl */ `
  attribute float aSpeed;
  attribute float aPhase;
  attribute float aFrequency;
  attribute float aAmplitude;
`

/**
 * Tail-weighted lateral wave. `zBody` is the vertex's object-space Z, expected
 * roughly in [-0.5, 1.0] (nose forward). The smoothstep falloff keeps the head
 * steady while the tail sweeps — a uniform sine reads as a wobbling banana.
 */
export const SPINE_DEFORM_GLSL = /* glsl */ `
  float spineWave(float zBody, float time, float speed, float frequency, float phase) {
    return sin(time * speed * 6.2831853 + zBody * frequency + phase);
  }

  float spineFalloff(float zBody) {
    // Tail (low Z) moves most; nose (high Z) barely at all.
    return 1.0 - smoothstep(-0.2, 1.0, zBody);
  }

  vec3 applySpineDeform(vec3 pos, float time, float speed, float frequency, float phase, float amplitude) {
    vec3 p = pos;
    float wave = spineWave(p.z, time, speed, frequency, phase);
    float falloff = spineFalloff(p.z);
    p.x += wave * amplitude * falloff;
    // Slight yaw into the sweep so the silhouette reads as a fish, not a ribbon.
    p.z += wave * amplitude * falloff * 0.12;
    return p;
  }
`

/**
 * Elliptical cruise path evaluated per instance, entirely on the GPU.
 * `orbit` packs (centerX, centerZ, radiusX, radiusZ); `depth` is the world Y.
 * Returns the world offset; the heading is derived by the caller from the
 * path derivative so the mesh faces where it swims.
 */
export const SPINE_ORBIT_GLSL = /* glsl */ `
  vec3 orbitPosition(vec4 orbit, float depth, float t) {
    return vec3(
      orbit.x + sin(t) * orbit.z,
      depth + sin(t * 1.6) * 0.6,
      orbit.y + cos(t * 0.7) * orbit.w
    );
  }

  float orbitHeading(vec4 orbit, float t) {
    // Analytic derivative of orbitPosition:
    // dx/dt = cos(t) * orbit.z
    // dz/dt = -0.7 * sin(t * 0.7) * orbit.w
    float dx = cos(t) * orbit.z;
    float dz = -0.7 * sin(t * 0.7) * orbit.w;
    return atan(dx, dz);
  }

  mat3 yawMatrix(float yaw) {
    float s = sin(yaw);
    float c = cos(yaw);
    return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c);
  }
`

/** Everything the minnow vertex patch needs, in dependency order. */
export const SPINE_GLSL = `${SPINE_DEFORM_GLSL}\n${SPINE_ORBIT_GLSL}`
