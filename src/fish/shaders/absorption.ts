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

/** Extinction coefficients per world unit (red dies first). Fallback/default ratio. */
export const SIGMA_RGB: [number, number, number] = [0.35, 0.08, 0.02]

/** Build the normalised-against-red channel ratio from an [r,g,b] sigma triple. */
function toRatio(sigma: readonly [number, number, number]): [number, number, number] {
  const r = sigma[0] || 1
  return [1, sigma[1] / r, sigma[2] / r]
}

let installedRatioKey = ""

/**
 * Install the wavelength-aware fog chunk with the given per-wavelength
 * extinction ratio (`TankThemePalette.sigma`, day vs night vs circadian
 * blend). `fogDensity` supplies the absolute scale, so this only needs to
 * recompile when the *ratio* changes, not on every density/theme tick.
 *
 * `THREE.ShaderChunk.fog_fragment` is global text baked into a material's
 * shader program at compile time — rewriting it does nothing to materials
 * already compiled. Callers that resample the palette mid-life (no scene
 * remount) must force affected materials' `.needsUpdate = true` afterward;
 * see `FishTankCanvas.tsx::applyPalette`.
 *
 * Returns whether the installed ratio actually changed (i.e. a recompile is
 * needed), so callers can skip that materials pass when it didn't.
 */
export function installBeerLambertFog(sigma: readonly [number, number, number] = SIGMA_RGB): boolean {
  const ratio = toRatio(sigma)
  const key = ratio.map((v) => v.toFixed(4)).join(",")
  if (key === installedRatioKey) return false
  installedRatioKey = key

  THREE.ShaderChunk.fog_fragment = /* glsl */ `
    #ifdef USE_FOG
      #ifdef FOG_EXP2
        // Beer-Lambert per-wavelength extinction, replacing three's grey
        // exponential-squared falloff: red is absorbed ~17x faster than blue,
        // which is what makes deep water read as blue rather than as haze.
        vec3 sigma = fogDensity * vec3(${ratio[0].toFixed(4)}, ${ratio[1].toFixed(4)}, ${ratio[2].toFixed(4)});
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
  return true
}
