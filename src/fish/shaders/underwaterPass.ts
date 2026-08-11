/**
 * Fullscreen underwater wobble pass.
 * Renders the tank to an offscreen target, then blits it through a scrolling-noise
 * UV offset so everything below the waterline shimmers. Cheaper than true
 * refraction — one extra fullscreen quad, never a second scene render.
 */

import * as THREE from "three"

import { FBM_GLSL, HASH_GLSL, VALUE_NOISE_GLSL, clampOctaves, withDefines } from "./noiseCommon"

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const FRAGMENT = /* glsl */ `
  uniform sampler2D uScene;
  uniform float uTime;
  uniform float uAmount;
  uniform vec2 uAspect;

  varying vec2 vUv;

  ${HASH_GLSL}
  ${VALUE_NOISE_GLSL}
  ${FBM_GLSL}

  void main() {
    vec2 p = vUv * uAspect;
    // Two decorrelated fbm lookups → a smooth, non-repeating offset field.
    float nx = fbm(p * 2.6 + vec2(uTime * 0.09, uTime * 0.05));
    float ny = fbm(p * 2.6 + vec2(-uTime * 0.07, 4.7 + uTime * 0.06));
    vec2 offset = (vec2(nx, ny) * 2.0 - 1.0) * uAmount;

    // Chromatic split scales with the wobble so calm water stays clean.
    float split = uAmount * 0.35;
    vec2 uvR = clamp(vUv + offset * (1.0 + split), 0.0, 1.0);
    vec2 uvG = clamp(vUv + offset, 0.0, 1.0);
    vec2 uvB = clamp(vUv + offset * (1.0 - split), 0.0, 1.0);

    gl_FragColor = vec4(
      texture2D(uScene, uvR).r,
      texture2D(uScene, uvG).g,
      texture2D(uScene, uvB).b,
      1.0
    );
  }
`

export interface UnderwaterPass {
  /** Resize the offscreen target to match the canvas. */
  setSize(width: number, height: number): void
  /** Render `scene` through the wobble. `amount` 0 renders straight to screen. */
  render(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    time: number,
    amount: number,
  ): void
  dispose(): void
}

/** Maximum UV displacement at amount = 1; kept small so text/labels stay legible. */
const MAX_OFFSET = 0.012

/** Build the underwater wobble pass (own render target, ortho camera, fullscreen quad). */
export function createUnderwaterPass(width: number, height: number, octaves = 4): UnderwaterPass {
  const target = new THREE.WebGLRenderTarget(Math.max(1, width), Math.max(1, height), {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: true,
    stencilBuffer: false,
  })

  const aspect = new THREE.Vector2(1, 1)
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uScene: { value: target.texture },
      uTime: { value: 0 },
      uAmount: { value: 0 },
      uAspect: { value: aspect },
    },
    vertexShader: VERTEX,
    fragmentShader: withDefines(FRAGMENT, { NOISE_OCTAVES: clampOctaves(octaves) }),
    depthTest: false,
    depthWrite: false,
  })

  const quadScene = new THREE.Scene()
  const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const quadGeo = new THREE.PlaneGeometry(2, 2)
  quadScene.add(new THREE.Mesh(quadGeo, material))

  function setSize(w: number, h: number) {
    const cw = Math.max(1, Math.floor(w))
    const ch = Math.max(1, Math.floor(h))
    target.setSize(cw, ch)
    aspect.set(1, ch / cw)
  }
  setSize(width, height)

  return {
    setSize,
    render(renderer, scene, camera, time, amount) {
      // No wobble → skip the target entirely; identical to a plain direct render.
      if (amount <= 0.0005) {
        renderer.setRenderTarget(null)
        renderer.render(scene, camera)
        return
      }
      material.uniforms.uTime.value = time
      material.uniforms.uAmount.value = amount * MAX_OFFSET
      renderer.setRenderTarget(target)
      renderer.clear()
      renderer.render(scene, camera)
      renderer.setRenderTarget(null)
      renderer.render(quadScene, quadCamera)
    },
    dispose() {
      target.dispose()
      quadGeo.dispose()
      material.dispose()
    },
  }
}
