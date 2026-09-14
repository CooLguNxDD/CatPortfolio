import { readFileSync } from "node:fs"
import { describe, expect, it, vi } from "vitest"
import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { buildGiantCatMesh, createCatAnimationState, stepCatAnimation } from "../../src/object3D/Cat/mesh/catGiantMesh"
import { attachRiggedGiantCat, bindGiantCat } from "../../src/object3D/Cat/mesh/riggedGiantCat"

async function asset() {
  const bytes = readFileSync("public/models/cat/reference-cat-rigged.glb")
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  return new Promise<THREE.Group>((resolve, reject) => {
    new GLTFLoader().parse(buffer, "", (gltf) => resolve(gltf.scene), reject)
  })
}

describe("rigged giant cat", () => {
  it("turns and nods on the mascot axes without cross-axis tilt or pose drift", async () => {
    const model = await asset()
    const { group, parts } = buildGiantCatMesh(12)
    group.rotation.y = -0.8
    group.add(model)
    parts.headPivot.rotation.set(0, 0, 0)
    const update = bindGiantCat(model, parts)
    const head = model.getObjectByName("head")!
    const neutral = head.getWorldQuaternion(new THREE.Quaternion())
    const modelWorld = model.getWorldQuaternion(new THREE.Quaternion())
    const movement = () => {
      const delta = modelWorld.clone().invert()
        .multiply(head.getWorldQuaternion(new THREE.Quaternion()))
        .multiply(neutral.clone().invert()).multiply(modelWorld)
      return new THREE.Vector3(0, 0, 1).applyQuaternion(delta)
    }
    for (const yaw of [-0.4, 0.4]) {
      parts.headPivot.rotation.set(0, yaw, 0)
      update()
      expect(movement().x).toBeCloseTo(Math.sin(yaw))
      expect(movement().y).toBeCloseTo(0)
      update()
      expect(movement().x).toBeCloseTo(Math.sin(yaw))
    }
    for (const pitch of [-0.3, 0.3]) {
      parts.headPivot.rotation.set(pitch, 0, 0)
      update()
      expect(movement().y).toBeCloseTo(-Math.sin(pitch))
      expect(movement().x).toBeCloseTo(0)
    }
  })

  it("loads the shipped skinned asset and drives its authored skeleton without accumulating rotations", async () => {
    const model = await asset()
    const { parts } = buildGiantCatMesh(12)
    const update = bindGiantCat(model, parts)
    const head = model.getObjectByName("head")!
    const rest = head.rotation.clone()
    stepCatAnimation(parts, createCatAnimationState(), {
      t: 1, dt: 0.1, catWorldPos: { x: 0, y: 12, z: 0 },
      targetPos: { x: 8, y: 8, z: 12 }, isHunting: true, triggerSwat: true,
    })
    update()
    expect(head.rotation.y).not.toBe(rest.y)
    const first = head.rotation.clone()
    update()
    expect(head.rotation.x).toBe(first.x)
    expect(head.rotation.y).toBe(first.y)
    const support = model.getObjectByName("front_pawR")!.getWorldPosition(new THREE.Vector3())
    expect(support.y).toBeCloseTo(0.9)
    expect(support.z).toBeCloseTo(2)
    let skinned = 0
    model.traverse((node) => {
      if ((node as THREE.SkinnedMesh).isSkinnedMesh) {
        skinned++
        expect((node as THREE.SkinnedMesh).skeleton.bones.length).toBeGreaterThan(20)
      }
    })
    expect(skinned).toBeGreaterThan(0)
  })

  it("preserves the fallback when loading fails", async () => {
    const { parts } = buildGiantCatMesh(12)
    const status = vi.fn()
    const instance = attachRiggedGiantCat(parts, status, () => Promise.reject(new Error("offline")))
    await instance.ready
    expect(parts.rig.visible).toBe(true)
    expect(status).toHaveBeenLastCalledWith("fallback")
    instance.dispose()
  })

  it("disposes a late model instead of adding it after unmount", async () => {
    const { group, parts } = buildGiantCatMesh(12)
    const model = await asset()
    let complete!: (model: THREE.Group) => void
    const status = vi.fn()
    const instance = attachRiggedGiantCat(parts, status, () => new Promise((resolve) => { complete = resolve }))
    instance.dispose()
    complete(model)
    await instance.ready
    expect(group.children).not.toContain(model)
    expect(status).not.toHaveBeenCalledWith("ready")
  })

  it("swaps only a valid rig and removes it on disposal", async () => {
    const { group, parts } = buildGiantCatMesh(12)
    const model = await asset()
    const status = vi.fn()
    const instance = attachRiggedGiantCat(parts, status, async () => model)
    await instance.ready
    expect(parts.rig.visible).toBe(false)
    expect(group.children).toContain(model)
    expect(status).toHaveBeenLastCalledWith("ready")
    instance.dispose()
    expect(group.children).not.toContain(model)
  })
})
