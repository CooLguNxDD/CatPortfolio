/**
 * Beer-Lambert volumetric absorption.
 *
 *   I(λ, d) = I₀(λ) · e^(-σ(λ)·d)
 *
 * Red light dies within the first few metres of water, green survives further,
 * blue/cyan reaches the bed.
 *
 * Implemented by overriding three's `fog_fragment` chunk rather than as a
 * post-processing pass. A depth-texture pass had to sample the same target the
 * composer was writing into, which WebGL rejects as a framebuffer feedback
 * loop; and every fogged material already carries the one thing absorption
 * needs — camera distance — as `vFogDepth`. So this replaces exponential fog
 * with its physical form and reaches every surface, particle cloud and shader
 * material in the tank without per-material plumbing.
 *
 * `scene.fog.density` stays the strength knob the canvas already ramps with
 * dive progress, and `fogColor` becomes the in-scattered deep-water tone.
 */

import * as THREE from "three"

/** Extinction coefficients per world unit (red dies first). */
export const SIGMA_RGB: [number, number, number] = [0.35, 0.08, 0.02]

/**
 * Channel ratios normalised against red. `fogDensity` supplies the absolute
 * scale, so a palette can deepen the water (night dive) by raising density
 * without recompiling shaders.
 */
const SIGMA_RATIO: [number, number, number] = [
  1,
  SIGMA_RGB[1] / SIGMA_RGB[0],
  SIGMA_RGB[2] / SIGMA_RGB[0],
]

let installed = false

/**
 * Install the wavelength-aware fog chunk. Global to the three runtime and
 * idempotent — called once from the tank canvas, which is the only place in
 * the app that renders WebGL at all.
 */
export function installBeerLambertFog(): void {
  if (installed) return
  installed = true

  THREE.ShaderChunk.fog_fragment = /* glsl */ `
    #ifdef USE_FOG
      #ifdef FOG_EXP2
        // Beer-Lambert per-wavelength extinction, replacing three's grey
        // exponential-squared falloff: red is absorbed ~17x faster than blue,
        // which is what makes deep water read as blue rather than as haze.
        vec3 sigma = fogDensity * vec3(
          ${SIGMA_RATIO[0].toFixed(4)},
          ${SIGMA_RATIO[1].toFixed(4)},
          ${SIGMA_RATIO[2].toFixed(4)}
        );
        vec3 transmittance = exp(-sigma * vFogDepth);
        // What the water absorbs comes back as its own in-scattered colour,
        // otherwise distant geometry crushes to black instead of going blue.
        gl_FragColor.rgb = gl_FragColor.rgb * transmittance + fogColor * (1.0 - transmittance);
      #else
        float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor);
      #endif
    #endif
  `
}
