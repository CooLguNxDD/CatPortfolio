/**
 * Tank EffectComposer pipeline — selective bloom & postprocessing.
 * Enhances bioluminescent emissive elements (fins, eyes, corals, badges)
 * with a high-end neon glow while maintaining 60fps.
 */

import * as THREE from "three"
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js"
import { RenderPass } from "three/addons/postprocessing/RenderPass.js"
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js"
import { OutputPass } from "three/addons/postprocessing/OutputPass.js"

export interface TankComposerBundle {
  composer: EffectComposer
  bloomPass: UnrealBloomPass
  render: () => void
  setSize: (width: number, height: number) => void
  dispose: () => void
}

export function createTankComposer(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  width: number,
  height: number,
): TankComposerBundle {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
  
  const composer = new EffectComposer(renderer)
  composer.setPixelRatio(pixelRatio)
  composer.setSize(width, height)

  // 1. Base scene render pass
  const renderPass = new RenderPass(scene, camera)
  composer.addPass(renderPass)

  // 2. Selective UnrealBloomPass with soft radius & high threshold
  const resolution = new THREE.Vector2(width, height)
  const strength = 0.42 // delicate radiant glow
  const radius = 0.35 // soft gaussian dispersion
  const threshold = 0.72 // only bloom high-luminance emissive surfaces
  const bloomPass = new UnrealBloomPass(resolution, strength, radius, threshold)
  composer.addPass(bloomPass)

  // 3. Output pass (sRGB color space & tone mapping)
  const outputPass = new OutputPass()
  composer.addPass(outputPass)

  return {
    composer,
    bloomPass,
    render: () => {
      composer.render()
    },
    setSize: (w: number, h: number) => {
      composer.setSize(w, h)
      bloomPass.resolution.set(w, h)
    },
    dispose: () => {
      composer.dispose()
    },
  }
}
