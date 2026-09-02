import { describe, it, expect } from "vitest"
import * as THREE from "three"
import { buildFishMesh } from "../speciesMeshes"
import {
  RIG_FACING_EULER,
  applyRigFacing,
  isCreatureRig,
  type CreatureRig,
} from "../gltfFacing"
import {
  shouldLoadGltfAmbient,
  shouldLoadGltfHeroes,
  shouldLoadGltfScenery,
} from "../gltfQuality"

describe("gltfFacing", () => {
  it("has a finite Euler for every creature rig", () => {
    const rigs: CreatureRig[] = [
      "fish",
      "shark",
      "ray",
      "dolphin",
      "seahorse",
      "turtle",
      "lobster",
    ]
    for (const rig of rigs) {
      const e = RIG_FACING_EULER[rig]
      expect(Number.isFinite(e.x)).toBe(true)
      expect(Number.isFinite(e.y)).toBe(true)
      expect(Number.isFinite(e.z)).toBe(true)
    }
  })

  it("stands the seahorse up (not identity)", () => {
    expect(RIG_FACING_EULER.seahorse.x).not.toBe(0)
    expect(isCreatureRig("seahorse")).toBe(true)
    expect(isCreatureRig("Static")).toBe(false)
  })

  it("applyRigFacing writes the table onto an object", () => {
    const object = { rotation: { x: 1, y: 1, z: 1, set(x: number, y: number, z: number) {
      this.x = x
      this.y = y
      this.z = z
    } } }
    applyRigFacing(object, "lobster")
    expect(object.rotation.x).toBe(RIG_FACING_EULER.lobster.x)
    expect(object.rotation.y).toBe(0)
  })
})

describe("gltfQuality", () => {
  it("loads GLB heroes/scenery/ambient only on high tier", () => {
    expect(shouldLoadGltfHeroes("high")).toBe(true)
    expect(shouldLoadGltfScenery("high")).toBe(true)
    expect(shouldLoadGltfAmbient("high")).toBe(true)
    expect(shouldLoadGltfHeroes("low")).toBe(false)
    expect(shouldLoadGltfScenery("low")).toBe(false)
    expect(shouldLoadGltfAmbient("low")).toBe(false)
  })
})

describe("buildFishMesh GLB actor", () => {
  it("skips GLB fetch on loadGltf:false and cancelGltf is idempotent", () => {
    const built = buildFishMesh(
      {
        slug: "weltel-ai",
        title: "AI",
        species: "ai",
        size: 1,
        depth: 0.2,
        speed: 0.5,
        glow: 0.5,
        school: 0,
      },
      new THREE.Color(0xffaa00),
      { loadGltf: false },
    )
    expect(built.isGltf).toBeUndefined()
    expect(built.gltfMaterials).toEqual([])
    built.cancelGltf()
    built.cancelGltf()
    expect(built.isGltf).toBeUndefined()
  })
})
