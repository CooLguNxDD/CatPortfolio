import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import type { CatParts } from "./catGiantMesh"

export const RIGGED_CAT_URL = `${import.meta.env.BASE_URL}models/cat/reference-cat-rigged.glb`

function release(model: THREE.Group) {
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  model.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      geometries.add(node.geometry)
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
        materials.add(material)
      }
    }
  })
  geometries.forEach((geometry) => geometry.dispose())
  materials.forEach((material) => material.dispose())
}

/** Add offsets to the authored bone orientation; never overwrite its bind pose. */
export function bindGiantCat(model: THREE.Group, parts: CatParts) {
  const names = ["pelvis", "head", "spine", "ear.L", "ear.R", "front_upper.L", "front_lower.L", "front_paw.L",
    "front_upper.R", "front_lower.R", "front_paw.R", "hind_upper.L", "hind_upper.R",
    ...Array.from({ length: 7 }, (_, i) => `tail.${String(i + 1).padStart(2, "0")}`)]
  const bones = new Map<string, { node: THREE.Object3D; rest: THREE.Euler }>()
  // GLTFLoader sanitizes dots in names. Match only skeleton bones, never similarly named meshes.
  model.traverse((node) => {
    if (!(node as THREE.Bone).isBone) return
    const name = names.find((name) => node.name === name || node.name === name.replaceAll(".", ""))
    if (name) bones.set(name, { node, rest: node.rotation.clone() })
  })
  for (const name of names) {
    if (!bones.has(name)) throw new Error(`Rigged cat is missing bone: ${name}`)
  }
  const pose = (name: string, x: number, y: number, z: number) => {
    const bone = bones.get(name)!
    bone.node.rotation.set(bone.rest.x + x, bone.rest.y + y, bone.rest.z + z)
  }
  model.scale.setScalar(18)
  model.name = "reference_cat_rigged"
  model.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return
    node.castShadow = true
    node.receiveShadow = true
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      if (material instanceof THREE.MeshStandardMaterial) {
        // This mascot sits above the water; the tank's absorption fog is for submerged meshes.
        material.fog = false
        // A small albedo-matched fill keeps the charcoal coat readable above the dark tank.
        material.emissive.copy(material.color)
        material.emissiveIntensity = 0.65
      }
    }
  })
  const support = new THREE.Vector3()
  const update = () => {
    // Rear legs hang outside the glass; forelegs reach forward over its rim.
    pose("pelvis", -1.05, 0, 0)
    pose("head", 1.45 + parts.headPivot.rotation.x * 0.25, 0.25 + parts.headPivot.rotation.y * 0.25, parts.headPivot.rotation.z * 0.3)
    pose("spine", parts.body.rotation.x * 0.2, 0, parts.body.rotation.z * 0.2)
    pose("ear.L", (parts.earL.rotation.x - 0.08) * 0.3, 0, (parts.earL.rotation.z + 0.25) * 0.3)
    pose("ear.R", (parts.earR.rotation.x - 0.08) * 0.3, 0, (parts.earR.rotation.z - 0.25) * 0.3)
    pose("front_upper.R", -0.4, 0, 0)
    pose("front_lower.R", 0.75, 0, 0)
    pose("front_paw.R", 1.0, 0, 0)
    pose("front_upper.L", -0.4 + parts.pawActive.rotation.x * 0.3, 0, (parts.pawActive.rotation.z - 0.2) * 0.15)
    pose("front_lower.L", 0.75 + parts.pawActiveForearm.rotation.x * 0.3, 0, 0)
    pose("front_paw.L", 1.0 + parts.pawActiveHand.rotation.x * 0.25, 0, 0)
    pose("hind_upper.L", 0.65, 0, 0.12)
    pose("hind_upper.R", 0.45, 0, -0.12)
    parts.tailSegments.forEach((segment, i) => {
      pose(`tail.${String(i + 1).padStart(2, "0")}`, (i === 0 ? 1.85 : 0.12) + (segment.rotation.x + 0.18) * 0.3, 0, segment.rotation.y * 0.4)
    })
    // Anchor the supporting wrist to the glass instead of floating on the water.
    model.position.set(0, 0, 0)
    model.updateMatrixWorld(true)
    model.worldToLocal(bones.get("front_paw.R")!.node.getWorldPosition(support))
    model.position.set(0, 0.9 - support.y * 18, 2 - support.z * 18)
    parts.hitBox.position.set(0, 2, model.position.z)
    parts.hitBox.scale.set(1.6, 2, 1.6)
  }
  update()
  return update
}

/** Keep the procedural cat until loading succeeds; late loads cannot resurrect an unmounted scene. */
export function attachRiggedGiantCat(
  parts: CatParts,
  onStatus: (status: "loading" | "ready" | "fallback") => void,
  load: () => Promise<THREE.Group> = () => new GLTFLoader().loadAsync(RIGGED_CAT_URL).then((gltf) => gltf.scene),
) {
  let disposed = false
  const hitPosition = parts.hitBox.position.clone()
  const hitScale = parts.hitBox.scale.clone()
  let model: THREE.Group | undefined
  let sync: (() => void) | undefined
  onStatus("loading")
  const ready = load().then((loaded) => {
    if (disposed) { release(loaded); return }
    try {
      sync = bindGiantCat(loaded, parts)
    } catch (error) {
      release(loaded)
      throw error
    }
    model = loaded
    parts.group.add(model)
    sync()
    parts.rig.visible = false
    onStatus("ready")
  }).catch(() => {
    if (!disposed) onStatus("fallback")
  })
  return {
    ready,
    update: () => { if (!disposed) sync?.() },
    dispose: () => {
      disposed = true
      sync = undefined
      if (model) { parts.group.remove(model); release(model); model = undefined }
      parts.rig.visible = true
      parts.hitBox.position.copy(hitPosition)
      parts.hitBox.scale.copy(hitScale)
    },
  }
}
