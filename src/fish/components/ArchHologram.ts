/**
 * Spatial architecture hologram for the focused specimen.
 *
 * A wireframe cage around the fish plus a ring of callout nodes joined to it by
 * glowing filaments — one node per tag/metric already carried on the specimen
 * (`FishSpecimenInput.tags` / `.metrics`), so nothing new enters the layout
 * contract.
 *
 * The nodes are deliberately wordless. The dossier opens with the same metrics
 * and tags the moment a specimen locks, so drawing them again as floating pills
 * only stacked text over the fish. Labels survive as node *count* and as the
 * accessible name a caller can reuse — not as rendered text.
 *
 * Same `{ group, update, dispose }` shape as HoloReticle, so the canvas can
 * swap between them without special-casing either.
 */

import * as THREE from "three"

import type { FishSpecimenInput } from "@/blocks/fishTankLayout"

/** How many callout nodes a hologram will show before it starts truncating. */
export const MAX_HOLO_NODES = 5

export interface HoloNode {
  /** What this node stands for. Not rendered — see the module header. */
  label: string
  /** Node centre in world space — recomputed every update. */
  position: THREE.Vector3
}

export interface ArchHologramBundle {
  group: THREE.Group
  /** Live node list; empty while hidden. */
  nodes: HoloNode[]
  /** Rebuild the callout set when the focused specimen changes. */
  setSpecimen(fish: FishSpecimenInput | null): void
  update(time: number, targetPos: THREE.Vector3, targetScale: number, visible: boolean): void
  dispose(): void
}

/** Callout labels from whatever the specimen already carries. */
export function holoLabelsFor(fish: FishSpecimenInput | null): string[] {
  if (!fish) return []
  const fromMetrics = (fish.metrics ?? []).map((m) => `${m.label}: ${m.value}`)
  const fromTags = (fish.tags ?? []).map((t) => t)
  return [...fromMetrics, ...fromTags].slice(0, MAX_HOLO_NODES)
}

/** Builds the wireframe-cage + callout-node hologram (hidden until `update()` targets a specimen). See file header. */
export function createArchHologram(accent = 0x38bdf8): ArchHologramBundle {
  const group = new THREE.Group()
  group.visible = false

  const cageMat = new THREE.LineBasicMaterial({
    color: accent,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const cage = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(2.6, 2.0, 3.6)),
    cageMat,
  )
  group.add(cage)

  const nodeGeo = new THREE.OctahedronGeometry(0.16, 0)
  const nodeMat = new THREE.MeshBasicMaterial({
    color: accent,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const filamentMat = new THREE.LineBasicMaterial({
    color: accent,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })

  const nodeMeshes: THREE.Mesh[] = []
  const filaments: THREE.Line[] = []
  const nodes: HoloNode[] = []
  const NODE_RADIUS = 3.2

  /** Grow the pool to `count` nodes; meshes are reused across specimens. */
  function ensurePool(count: number) {
    while (nodeMeshes.length < count) {
      const mesh = new THREE.Mesh(nodeGeo, nodeMat)
      group.add(mesh)
      nodeMeshes.push(mesh)

      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 0),
      ])
      const line = new THREE.Line(geo, filamentMat)
      group.add(line)
      filaments.push(line)
    }
  }

  let labels: string[] = []

  function setSpecimen(fish: FishSpecimenInput | null) {
    labels = holoLabelsFor(fish)
    ensurePool(labels.length)
    nodes.length = 0
    for (let i = 0; i < nodeMeshes.length; i++) {
      const active = i < labels.length
      nodeMeshes[i].visible = active
      filaments[i].visible = active
      if (active) nodes.push({ label: labels[i], position: nodeMeshes[i].position })
    }
  }

  return {
    group,
    nodes,
    setSpecimen,
    update(time, targetPos, targetScale, visible) {
      group.visible = visible && labels.length > 0
      if (!group.visible) return

      group.position.lerp(targetPos, 0.25)
      const size = Math.max(1, targetScale * 1.6)
      cage.scale.setScalar(size)
      cage.rotation.y = time * 0.25

      for (let i = 0; i < labels.length; i++) {
        // Nodes ride a slowly precessing ring so the callouts read as a system
        // orbiting the specimen rather than a static badge cluster.
        const a = (i / labels.length) * Math.PI * 2 + time * 0.35
        const lift = Math.sin(time * 1.2 + i) * 0.35
        const mesh = nodeMeshes[i]
        mesh.position.set(
          Math.cos(a) * NODE_RADIUS * size * 0.6,
          lift + 1.2 * size * 0.4,
          Math.sin(a) * NODE_RADIUS * size * 0.6,
        )
        mesh.scale.setScalar(size * 0.8)

        const geo = filaments[i].geometry
        const pos = geo.attributes.position
        const arr = pos.array as Float32Array
        // Filament runs from the cage centre out to the node.
        arr[0] = 0
        arr[1] = 0
        arr[2] = 0
        arr[3] = mesh.position.x
        arr[4] = mesh.position.y
        arr[5] = mesh.position.z
        pos.needsUpdate = true
      }

      const pulse = 0.75 + 0.25 * Math.sin(time * 2.6)
      cageMat.opacity = 0.45 * pulse
      filamentMat.opacity = 0.35 * pulse
    },
    dispose() {
      cage.geometry.dispose()
      cageMat.dispose()
      nodeGeo.dispose()
      nodeMat.dispose()
      filamentMat.dispose()
      for (const line of filaments) line.geometry.dispose()
    },
  }
}
