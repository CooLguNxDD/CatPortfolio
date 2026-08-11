import { describe, expect, it, vi } from "vitest"
import {
  buildGiantCatMesh,
  createCatAnimationState,
  stepCatAnimation,
} from "../catMesh"

describe("buildGiantCatMesh", () => {
  it("constructs the giant teddy cat with all required skeletal parts and named objects", () => {
    const { group, parts } = buildGiantCatMesh(12)
    expect(group).toBeDefined()
    expect(parts.rig).toBeDefined()
    expect(parts.body).toBeDefined()
    expect(parts.headPivot).toBeDefined()
    expect(parts.head).toBeDefined()
    expect(parts.muzzle).toBeDefined()
    expect(parts.earL).toBeDefined()
    expect(parts.earR).toBeDefined()
    expect(parts.eyeL).toBeDefined()
    expect(parts.eyeR).toBeDefined()
    expect(parts.pupilL).toBeDefined()
    expect(parts.pupilR).toBeDefined()
    expect(parts.pawActive).toBeDefined()
    expect(parts.pawSupport).toBeDefined()
    expect(parts.tailGroup).toBeDefined()
    expect(parts.tailSegments).toHaveLength(7)
    expect(parts.hitBox).toBeDefined()
    expect(parts.hitBox.name).toBe("cat_hit")
  })

  it("features glowing yellow eyes as its hero radiant element", () => {
    const { parts } = buildGiantCatMesh(12)
    expect(parts.materials.eye.emissiveIntensity).toBeGreaterThan(2.0)
    expect(parts.materials.eye.color.getHexString().toLowerCase()).toMatch(/ffd000|fbbf24/)
  })

  it("positions root at the water rim level", () => {
    const { group } = buildGiantCatMesh(12)
    expect(group.position.y).toBeCloseTo(12.6)
  })
})

describe("stepCatAnimation", () => {
  it("calculates 3D head IK towards target position within biomechanical bounds", () => {
    const { parts } = buildGiantCatMesh(12)
    const state = createCatAnimationState()
    const catPos = { x: 12, y: 12, z: 0 }

    // Target to the left and below the cat in the water
    const target = { x: -4, y: 4, z: 8 }

    for (let i = 0; i < 30; i++) {
      stepCatAnimation(parts, state, {
        t: i * 0.016,
        dt: 0.016,
        catWorldPos: catPos,
        targetPos: target,
        isHunting: true,
      })
    }

    // Head pivot should rotate towards the target (yaw and pitch)
    expect(parts.headPivot.rotation.y).toBeLessThan(0) // looking left towards negative X
    expect(parts.headPivot.rotation.x).toBeGreaterThan(0) // looking down towards lower Y
    expect(parts.headPivot.rotation.y).toBeGreaterThanOrEqual(-1.25)
    expect(parts.headPivot.rotation.x).toBeLessThanOrEqual(0.85)
  })

  it("grows and dilates pupils when hunting or locking onto fish", () => {
    const { parts } = buildGiantCatMesh(12)
    const state = createCatAnimationState()
    const initialPupilScale = parts.pupilL.scale.x

    for (let i = 0; i < 40; i++) {
      stepCatAnimation(parts, state, {
        t: i * 0.016,
        dt: 0.016,
        catWorldPos: { x: 12, y: 12, z: 0 },
        targetPos: { x: 8, y: 8, z: 2 },
        isHunting: true,
      })
    }

    expect(state.huntCommit).toBeGreaterThan(0.8)
    expect(parts.pupilL.scale.x).toBeGreaterThan(initialPupilScale * 1.5)
    expect(parts.pupilR.scale.x).toBeGreaterThan(initialPupilScale * 1.5)
  })

  it("executes paw swat strike and triggers onWaterSplash callback", () => {
    const { parts } = buildGiantCatMesh(12)
    const state = createCatAnimationState()
    const onSplash = vi.fn()

    // Step with triggerSwat
    stepCatAnimation(parts, state, {
      t: 1.0,
      dt: 0.016,
      catWorldPos: { x: 12, y: 12, z: 0 },
      targetPos: { x: 8, y: 10, z: 2 },
      isHunting: true,
      triggerSwat: true,
      onWaterSplash: onSplash,
    })

    expect(state.swatProgress).toBeGreaterThan(0)

    // Advance through the strike down to the splash point
    for (let i = 0; i < 20; i++) {
      stepCatAnimation(parts, state, {
        t: 1.0 + (i + 1) * 0.016,
        dt: 0.016,
        catWorldPos: { x: 12, y: 12, z: 0 },
        targetPos: { x: 8, y: 10, z: 2 },
        isHunting: true,
        onWaterSplash: onSplash,
      })
    }

    expect(onSplash).toHaveBeenCalled()
  })
})
