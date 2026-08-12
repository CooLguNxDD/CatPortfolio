import { describe, expect, it } from "vitest"

import {
  BITE_DIST,
  HUNT_TIMEOUT,
  RELEASE_DIST,
  SATED_SECONDS,
  SENSE_DIST,
  behaviorTimeScale,
  createFishBehavior,
  isPursuing,
  stepFishBehavior,
  swimTarget,
  type FishBehaviorState,
  type SensedFood,
} from "../fishBehavior"

const DT = 1 / 60

function food(distance: number, id = "pellet-1"): SensedFood {
  return { id, position: { x: distance, y: 0, z: 0 }, distance }
}

/** Run the machine for `seconds` with constant input. */
function run(
  state: FishBehaviorState,
  seconds: number,
  input: { focused?: boolean; food?: SensedFood | null; ate?: boolean } = {},
): FishBehaviorState {
  let out = state
  for (let t = 0; t < seconds; t += DT) {
    out = stepFishBehavior(out, {
      dt: DT,
      focused: input.focused ?? false,
      food: input.food ?? null,
      ate: input.ate ?? false,
    })
  }
  return out
}

describe("stepFishBehavior", () => {
  it("starts cruising with no commit", () => {
    const s = createFishBehavior()
    expect(s.state).toBe("cruise")
    expect(s.commit).toBe(0)
  })

  it("stays cruising while the water is empty", () => {
    const s = run(createFishBehavior(), 5)
    expect(s.state).toBe("cruise")
    expect(s.commit).toBe(0)
  })

  it("ignores food beyond the sense radius", () => {
    const s = run(createFishBehavior(), 1, { food: food(SENSE_DIST + 1) })
    expect(s.state).toBe("cruise")
    expect(s.targetId).toBeNull()
  })

  it("commits to food inside the sense radius", () => {
    const s = stepFishBehavior(createFishBehavior(), {
      dt: DT,
      focused: false,
      food: food(SENSE_DIST - 1),
      ate: false,
    })
    expect(s.state).toBe("hunt")
    expect(s.targetId).toBe("pellet-1")
  })

  it("ramps commit to 1 while hunting and decays it back to 0 after", () => {
    const hunting = run(createFishBehavior(), 1, { food: food(10) })
    expect(hunting.commit).toBe(1)

    // Pellet vanishes: sated cooldown, then cruise — commit unwinds either way.
    const after = run(hunting, SATED_SECONDS + 2)
    expect(after.state).toBe("cruise")
    expect(after.commit).toBe(0)
  })

  it("enters feed inside the bite radius", () => {
    const hunting = run(createFishBehavior(), 0.5, { food: food(10) })
    const biting = stepFishBehavior(hunting, {
      dt: DT,
      focused: false,
      food: food(BITE_DIST - 0.5),
      ate: false,
    })
    expect(biting.state).toBe("feed")
  })

  it("returns to hunt when it overshoots the pellet", () => {
    const feeding = run(run(createFishBehavior(), 0.5, { food: food(10) }), 0.2, {
      food: food(BITE_DIST - 0.5),
    })
    expect(feeding.state).toBe("feed")
    const overshot = stepFishBehavior(feeding, {
      dt: DT,
      focused: false,
      food: food(BITE_DIST * 2),
      ate: false,
    })
    expect(overshot.state).toBe("hunt")
  })

  it("goes sated on a bite and holds the cooldown against new food", () => {
    const hunting = run(createFishBehavior(), 0.5, { food: food(5) })
    const eaten = stepFishBehavior(hunting, {
      dt: DT,
      focused: false,
      food: food(5),
      ate: true,
    })
    expect(eaten.state).toBe("sated")
    expect(eaten.targetId).toBeNull()

    // Still sated well inside the cooldown, even with a pellet right there.
    const mid = run(eaten, SATED_SECONDS * 0.5, { food: food(2) })
    expect(mid.state).toBe("sated")

    const recovered = run(eaten, SATED_SECONDS + 0.2, { food: food(2) })
    expect(recovered.state).not.toBe("sated")
  })

  it("gives up on an unreachable pellet after the hunt timeout", () => {
    const s = run(createFishBehavior(), HUNT_TIMEOUT + 0.5, { food: food(20) })
    expect(s.state).toBe("sated")
    expect(s.targetId).toBeNull()
  })

  it("keeps hunting between the sense and release radii (hysteresis)", () => {
    const hunting = run(createFishBehavior(), 0.5, { food: food(SENSE_DIST - 1) })
    const drifting = stepFishBehavior(hunting, {
      dt: DT,
      focused: false,
      food: food(SENSE_DIST + 2),
      ate: false,
    })
    expect(drifting.state).toBe("hunt")

    const lost = stepFishBehavior(hunting, {
      dt: DT,
      focused: false,
      food: food(RELEASE_DIST + 1),
      ate: false,
    })
    expect(lost.state).toBe("sated")
  })

  it("suspends behaviour while focused and resumes on release", () => {
    const hunting = run(createFishBehavior(), 0.5, { food: food(5) })
    const locked = run(hunting, 0.5, { focused: true, food: food(5) })
    expect(locked.state).toBe("focused")
    expect(locked.targetId).toBeNull()
    expect(locked.commit).toBeLessThan(hunting.commit)

    const released = stepFishBehavior(locked, {
      dt: DT,
      focused: false,
      food: food(5),
      ate: false,
    })
    expect(released.state).toBe("hunt")
  })

  it("clamps a tab-restore frame so commit cannot jump", () => {
    const s = stepFishBehavior(createFishBehavior(), {
      dt: 30,
      focused: false,
      food: food(5),
      ate: false,
    })
    expect(s.commit).toBeLessThanOrEqual(1)
    expect(s.commit).toBeGreaterThan(0)
    expect(s.elapsed).toBeLessThanOrEqual(0.1)
  })
})

describe("behaviorTimeScale", () => {
  it("dashes while hunting and feeding, coasts while sated", () => {
    expect(behaviorTimeScale("cruise")).toBe(1)
    expect(behaviorTimeScale("focused")).toBe(1)
    expect(behaviorTimeScale("hunt")).toBeGreaterThan(1)
    expect(behaviorTimeScale("feed")).toBeGreaterThan(behaviorTimeScale("hunt"))
    expect(behaviorTimeScale("sated")).toBeLessThan(1)
  })
})

describe("swimTarget", () => {
  const orbit = { x: 1, y: 2, z: 3 }
  const pellet = { x: 10, y: 20, z: 30 }

  it("returns the orbit pose while cruising", () => {
    expect(swimTarget(createFishBehavior(), orbit, pellet)).toBe(orbit)
  })

  it("returns the pellet while hunting or feeding", () => {
    const hunting = run(createFishBehavior(), 0.5, { food: food(10) })
    expect(hunting.state).toBe("hunt")
    expect(swimTarget(hunting, orbit, pellet)).toBe(pellet)
  })

  it("falls back to the orbit when the pellet is gone", () => {
    const hunting = run(createFishBehavior(), 0.5, { food: food(10) })
    expect(swimTarget(hunting, orbit, null)).toBe(orbit)
  })

  it("returns the orbit again once sated", () => {
    const sated = stepFishBehavior(run(createFishBehavior(), 0.5, { food: food(5) }), {
      dt: DT,
      focused: false,
      food: food(5),
      ate: true,
    })
    expect(sated.state).toBe("sated")
    expect(swimTarget(sated, orbit, pellet)).toBe(orbit)
  })
})

describe("isPursuing", () => {
  it("covers exactly the food-committed states", () => {
    expect(isPursuing("hunt")).toBe(true)
    expect(isPursuing("feed")).toBe(true)
    expect(isPursuing("cruise")).toBe(false)
    expect(isPursuing("sated")).toBe(false)
    expect(isPursuing("focused")).toBe(false)
  })
})
