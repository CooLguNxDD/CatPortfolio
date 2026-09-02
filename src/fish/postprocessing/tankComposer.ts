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

export interface BloomSettings {
  strength: number
  radius: number
  threshold: number
}

export interface TankComposerBundle {
  render(state: TankFrameState): void
  setSize(width: number, height: number): void
  /** Retune bloom in place (day/night resample) — no-op on the low tier (no bloom pass). */
  setBloom(settings: BloomSettings): void
  dispose(): void
}

/** Bokeh strength when a specimen is locked; 0 outside focus mode. */
const FOCUS_MAX_BLUR = 0.016

/**
 * Background-Only Depth-of-Field Shader:
 * Keeps the focused specimen 100% crisp within a generous focal deadband (±4.0 units),
 * and smoothly applies creamy bokeh blur ONLY to the background behind the subject.
 */
const BACKGROUND_BOKEH_FRAGMENT = /* glsl */ `
  #include <common>
  #include <packing>

  varying vec2 vUv;
  uniform sampler2D tColor;
  uniform sampler2D tDepth;

  uniform float maxblur;
  uniform float aperture;
  uniform float nearClip;
  uniform float farClip;
  uniform float focus;
  uniform float aspect;

  float getDepth( const in vec2 screenPosition ) {
    #if DEPTH_PACKING == 1
    return unpackRGBAToDepth( texture2D( tDepth, screenPosition ) );
    #else
    return texture2D( tDepth, screenPosition ).x;
    #endif
  }

  float getViewZ( const in float depth ) {
    #if PERSPECTIVE_CAMERA == 1
    return perspectiveDepthToViewZ( depth, nearClip, farClip );
    #else
    return orthographicDepthToViewZ( depth, nearClip, farClip );
    #endif
  }

  void main() {
    vec4 centerCol = texture2D( tColor, vUv );
    if ( focus <= 0.0 || maxblur <= 0.0 ) {
      gl_FragColor = centerCol;
      return;
    }

    vec2 aspectcorrect = vec2( 1.0, aspect );
    float viewZ = getViewZ( getDepth( vUv ) );
    float dist = -viewZ; // positive distance from camera
    float diff = dist - focus;

    // FOCAL DEADBAND: ±4.2 world units around focused fish is 100% SHARP (ZERO BLUR!)
    float focalBand = 4.2;
    if ( abs(diff) <= focalBand ) {
      gl_FragColor = centerCol;
      return;
    }

    // Only blur the background (objects behind the focused specimen)
    float blurAmount = 0.0;
    if ( diff > focalBand ) {
      float bgDelta = diff - focalBand;
      blurAmount = clamp( bgDelta * aperture * 2.2, 0.0, maxblur );
    }

    if ( blurAmount <= 0.0001 ) {
      gl_FragColor = centerCol;
      return;
    }

    vec2 dofblur = vec2( blurAmount );
    vec2 dofblur9 = dofblur * 0.9;
    vec2 dofblur7 = dofblur * 0.7;
    vec2 dofblur4 = dofblur * 0.4;

    vec4 col = vec4( 0.0 );
    col += texture2D( tColor, vUv.xy );
    col += texture2D( tColor, vUv.xy + ( vec2(  0.0,   0.4  ) * aspectcorrect ) * dofblur );
    col += texture2D( tColor, vUv.xy + ( vec2(  0.15,  0.37 ) * aspectcorrect ) * dofblur );
    col += texture2D( tColor, vUv.xy + ( vec2(  0.29,  0.29 ) * aspectcorrect ) * dofblur );
    col += texture2D( tColor, vUv.xy + ( vec2( -0.37,  0.15 ) * aspectcorrect ) * dofblur );
    col += texture2D( tColor, vUv.xy + ( vec2(  0.40,  0.0  ) * aspectcorrect ) * dofblur );
    col += texture2D( tColor, vUv.xy + ( vec2(  0.37, -0.15 ) * aspectcorrect ) * dofblur );
    col += texture2D( tColor, vUv.xy + ( vec2(  0.29, -0.29 ) * aspectcorrect ) * dofblur );
    col += texture2D( tColor, vUv.xy + ( vec2( -0.15, -0.37 ) * aspectcorrect ) * dofblur );
    col += texture2D( tColor, vUv.xy + ( vec2(  0.0,  -0.4  ) * aspectcorrect ) * dofblur );
    col += texture2D( tColor, vUv.xy + ( vec2( -0.15,  0.37 ) * aspectcorrect ) * dofblur );
    col += texture2D( tColor, vUv.xy + ( vec2( -0.29,  0.29 ) * aspectcorrect ) * dofblur );
    col += texture2D( tColor, vUv.xy + ( vec2(  0.37,  0.15 ) * aspectcorrect ) * dofblur );
    col += texture2D( tColor, vUv.xy + ( vec2( -0.4,   0.0  ) * aspectcorrect ) * dofblur );
    col += texture2D( tColor, vUv.xy + ( vec2( -0.37, -0.15 ) * aspectcorrect ) * dofblur );
    col += texture2D( tColor, vUv.xy + ( vec2( -0.29, -0.29 ) * aspectcorrect ) * dofblur );
    col += texture2D( tColor, vUv.xy + ( vec2(  0.15, -0.37 ) * aspectcorrect ) * dofblur );

    col += texture2D( tColor, vUv.xy + ( vec2(  0.15,  0.37 ) * aspectcorrect ) * dofblur9 );
    col += texture2D( tColor, vUv.xy + ( vec2( -0.37,  0.15 ) * aspectcorrect ) * dofblur9 );
    col += texture2D( tColor, vUv.xy + ( vec2(  0.37, -0.15 ) * aspectcorrect ) * dofblur9 );
    col += texture2D( tColor, vUv.xy + ( vec2( -0.15, -0.37 ) * aspectcorrect ) * dofblur9 );
    col += texture2D( tColor, vUv.xy + ( vec2( -0.15,  0.37 ) * aspectcorrect ) * dofblur7 );
    col += texture2D( tColor, vUv.xy + ( vec2(  0.37,  0.15 ) * aspectcorrect ) * dofblur7 );
    col += texture2D( tColor, vUv.xy + ( vec2( -0.37, -0.15 ) * aspectcorrect ) * dofblur7 );
    col += texture2D( tColor, vUv.xy + ( vec2(  0.15, -0.37 ) * aspectcorrect ) * dofblur7 );
    col += texture2D( tColor, vUv.xy + ( vec2(  0.29,  0.29 ) * aspectcorrect ) * dofblur4 );
    col += texture2D( tColor, vUv.xy + ( vec2(  0.40,  0.0  ) * aspectcorrect ) * dofblur4 );
    col += texture2D( tColor, vUv.xy + ( vec2( -0.29,  0.29 ) * aspectcorrect ) * dofblur4 );
    col += texture2D( tColor, vUv.xy + ( vec2(  0.0,   0.4  ) * aspectcorrect ) * dofblur4 );
    col += texture2D( tColor, vUv.xy + ( vec2( -0.29, -0.29 ) * aspectcorrect ) * dofblur4 );
    col += texture2D( tColor, vUv.xy + ( vec2(  0.0,  -0.4  ) * aspectcorrect ) * dofblur4 );
    col += texture2D( tColor, vUv.xy + ( vec2(  0.29, -0.29 ) * aspectcorrect ) * dofblur4 );
    col += texture2D( tColor, vUv.xy + ( vec2( -0.4,   0.0  ) * aspectcorrect ) * dofblur4 );

    gl_FragColor = col / 33.0;
  }
`

/**
 * Builds the tank's post-processing chain: `RenderPass` always, then bokeh +
 * bloom + wobble only when `options.effects` is on (quality-tier gated —
 * `tier: "low"` gets `RenderPass -> OutputPass` only) plus an `OutputPass`.
 */
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
    // Bokeh pass patched with background-only depth of field
    bokeh = new BokehPass(scene, camera, { focus: 20, aperture: 0.0012, maxblur: 0 })
    const mat = (bokeh as unknown as { materialBokeh?: THREE.ShaderMaterial }).materialBokeh
    if (mat) {
      mat.fragmentShader = BACKGROUND_BOKEH_FRAGMENT
      mat.needsUpdate = true
    }
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
        // Blur only background while a specimen is locked; focused specimen stays 100% sharp.
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
    setBloom(settings: BloomSettings) {
      if (!bloom) return
      bloom.strength = settings.strength
      bloom.radius = settings.radius
      bloom.threshold = settings.threshold
    },
    dispose() {
      bokeh?.dispose()
      wobble?.dispose()
      target.dispose()
      composer.dispose()
    },
  }
}
