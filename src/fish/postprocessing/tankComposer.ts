/**
 * Tank post-processing chain.
 *
 *   RenderPass
 *     → Bokeh        depth-of-field around the focused specimen
 *     → Bloom        bioluminescent lift on emissive surfaces
 *     → Wobble       underwater UV shimmer + chromatic split
 *     → OutputPass   tone mapping + sRGB
 *
 * Beer-Lambert absorption is NOT a pass here: it lives in the fog chunk
 * (fish/shaders/absorption.ts), because a depth-sampling pass would read the
 * same target the composer writes into — a framebuffer feedback loop.
 *
 * On the low quality tier this collapses to `RenderPass → OutputPass`, which is
 * what mobile used to get from the old direct-render path — every optional pass
 * is disabled rather than constructed, so the extra render targets are never
 * allocated. Under `prefers-reduced-motion` the tier already reports
 * `timeScale: 0`, so the caller feeds a frozen clock and nothing animates.
 */

import * as THREE from "three"
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js"
import { RenderPass } from "three/addons/postprocessing/RenderPass.js"
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js"
import { BokehPass } from "three/addons/postprocessing/BokehPass.js"
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js"
import { OutputPass } from "three/addons/postprocessing/OutputPass.js"

import { createUnderwaterShader, MAX_WOBBLE_OFFSET } from "@/fish/shaders/underwaterPass"

export interface TankComposerOptions {
  width: number
  height: number
  /** fbm octaves compiled into the wobble pass. */
  octaves?: number
  /** Low tier renders scene + output only. */
  effects?: boolean
  /** Wobble is separately gated (it is also off for reduced motion). */
  wobble?: boolean
}

/** Per-frame inputs — everything the passes need that changes over time. */
export interface TankFrameState {
  /** Shader clock, already multiplied by the tier time scale. */
  time: number
  /** Underwater wobble amount, 0..1. */
  wobble: number
  /** Distance from camera to the focused specimen; 0 disables the bokeh blur. */
  focusDistance: number
}

export interface TankComposerBundle {
  render(state: TankFrameState): void
  setSize(width: number, height: number): void
  dispose(): void
}

/** Bokeh strength when a specimen is locked; 0 outside focus mode. */
const FOCUS_MAX_BLUR = 0.012

export function createTankComposer(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  options: TankComposerOptions,
): TankComposerBundle {
  const width = Math.max(1, Math.floor(options.width) || 1)
  const height = Math.max(1, Math.floor(options.height) || 1)
  const effects = options.effects !== false
  const wobbleEnabled = effects && options.wobble !== false
  const pixelRatio = Math.min(window.devicePixelRatio || 1, effects ? 1.5 : 2)

  const target = new THREE.WebGLRenderTarget(
    Math.max(1, Math.floor(width * pixelRatio)),
    Math.max(1, Math.floor(height * pixelRatio)),
    {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      stencilBuffer: false,
      depthBuffer: true,
    },
  )
  const composer = new EffectComposer(renderer, target)
  composer.setPixelRatio(pixelRatio)
  composer.setSize(width, height)

  composer.addPass(new RenderPass(scene, camera))

  let bokeh: BokehPass | null = null
  let bloom: UnrealBloomPass | null = null
  let wobble: ShaderPass | null = null
  const aspect = new THREE.Vector2(1, height / Math.max(1, width))

  if (effects) {
    // Aperture stays modest: a shallow depth of field on a wide tank reads as
    // a broken renderer, not as a camera.
    bokeh = new BokehPass(scene, camera, { focus: 20, aperture: 0.0004, maxblur: 0 })
    composer.addPass(bokeh)

    bloom = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      0.42, // delicate radiant glow
      0.35, // soft gaussian dispersion
      0.72, // only bloom high-luminance emissive surfaces
    )
    composer.addPass(bloom)
  }

  if (wobbleEnabled) {
    wobble = new ShaderPass(createUnderwaterShader(options.octaves ?? 4))
    wobble.uniforms.uAspect.value = aspect
    composer.addPass(wobble)
  }

  composer.addPass(new OutputPass())

  return {
    render(state: TankFrameState) {
      if (bokeh) {
        // Blur only while a specimen is locked; free-swimming views stay sharp.
        const focusing = state.focusDistance > 0
        bokeh.uniforms.focus.value = focusing ? state.focusDistance : 20
        bokeh.uniforms.maxblur.value = focusing ? FOCUS_MAX_BLUR : 0
      }
      if (wobble) {
        wobble.uniforms.uTime.value = state.time
        wobble.uniforms.uAmount.value =
          Math.max(0, Math.min(1, state.wobble)) * MAX_WOBBLE_OFFSET
      }
      composer.render()
    },
    setSize(w: number, h: number) {
      const cw = Math.max(1, Math.floor(w))
      const ch = Math.max(1, Math.floor(h))
      composer.setSize(cw, ch)
      bloom?.resolution.set(cw, ch)
      bokeh?.setSize(cw, ch)
      aspect.set(1, ch / cw)
    },
    dispose() {
      bokeh?.dispose()
      wobble?.dispose()
      target.dispose()
      composer.dispose()
    },
  }
}
