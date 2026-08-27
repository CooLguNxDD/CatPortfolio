/**
 * 3D Holographic World-Space Target Reticle
 * Sleek circular targeting rings, precision corner brackets, and pulsing scanline
 * tracking focused specimens in 3D space.
 */

import * as THREE from "three"

export interface HoloReticleBundle {
  group: THREE.Group
  update: (time: number, targetPos: THREE.Vector3, targetScale: number, isVisible: boolean) => void
  dispose: () => void
}

/** Builds the animated targeting-reticle group (rings, corner brackets, scanline) that tracks a focused specimen in world space via `update()`. */
export function createHoloReticle(): HoloReticleBundle {
  const group = new THREE.Group()
  group.visible = false

  // 1. Outer dashed circular targeting ring
  const ringGeo = new THREE.RingGeometry(2.2, 2.32, 48)
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const ring = new THREE.Mesh(ringGeo, ringMat)
  group.add(ring)

  // 2. Inner concentric precision ring
  const innerRingGeo = new THREE.RingGeometry(1.4, 1.48, 36)
  const innerRingMat = new THREE.MeshBasicMaterial({
    color: 0x06b6d4,
    transparent: true,
    opacity: 0.65,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat)
  group.add(innerRing)

  // 3. Four precision corner crosshair brackets
  const cornerMat = new THREE.LineBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })

  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + Math.PI / 4
    const r = 2.6
    const px = Math.cos(angle) * r
    const py = Math.sin(angle) * r
    
    const pts = [
      new THREE.Vector3(px - 0.35 * Math.sign(px), py, 0),
      new THREE.Vector3(px, py, 0),
      new THREE.Vector3(px, py - 0.35 * Math.sign(py), 0),
    ]
    const lineGeo = new THREE.BufferGeometry().setFromPoints(pts)
    const line = new THREE.Line(lineGeo, cornerMat)
    group.add(line)
  }

  // 4. Center lock pip
  const pipGeo = new THREE.SphereGeometry(0.1, 8, 6)
  const pipMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
  })
  const pip = new THREE.Mesh(pipGeo, pipMat)
  group.add(pip)

  return {
    group,
    update: (time: number, targetPos: THREE.Vector3, targetScale: number, isVisible: boolean) => {
      group.visible = isVisible
      if (!isVisible) return

      group.position.lerp(targetPos, 0.25)
      
      const targetSize = Math.max(1.0, targetScale * 2.0)
      group.scale.setScalar(targetSize)

      // Smooth counter-rotating holographic rings
      ring.rotation.z = time * 0.6
      innerRing.rotation.z = -time * 1.0
      
      const pulse = 0.85 + 0.15 * Math.sin(time * 3.5)
      ringMat.opacity = 0.55 * pulse
      innerRingMat.opacity = 0.6 * pulse
    },
    dispose: () => {
      ringGeo.dispose()
      ringMat.dispose()
      innerRingGeo.dispose()
      innerRingMat.dispose()
      cornerMat.dispose()
      pipGeo.dispose()
      pipMat.dispose()
    },
  }
}
