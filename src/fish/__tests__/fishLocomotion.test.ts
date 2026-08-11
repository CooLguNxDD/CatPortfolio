import { describe, expect, it } from "vitest"

import {
  DEFAULT_LOCOMOTION,
  bodySpeed,
  clampToBounds,
  createSwimBody,
  maxSpeedFor,
  minSpeedFor,
  shortestAngle,
  stepSwimBody,
  type SwimBody,
} from "../fishLocomotion"

const DT = 1 / 60

function dist(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
}

/** Drive a body at a fixed target for `seconds`, returning the largest single-frame jump. */
function chase(
  body: SwimBody,
  target: { x: number; y: number; z: number },
  seconds: number,
  params = DEFAULT_LOCOMOTION,
): number {
  let biggest = 0
  for (let t = 0; t < seconds; t += DT) {
    const prev = { ...body.position }
    stepSwimBody(body, target, DT, params)
    biggest = Math.max(biggest, dist(prev, body.position))
  }
  return biggest
}

describe("stepSwimBody", () => {
  it("closes on a static target and holds station on it", () => {
    const body = createSwimBody({ x: 0, y: 0, z: 0 })
    const target = { x: 20, y: 5, z: -10 }
    chase(body, target, 8)
    // It cannot park: a fish with no way on has no heading to steer with, so it
    // keeps a tight circuit of the target instead. Radius is roughly
    // minSpeed / turnRate.
    expect(dist(body.position, target)).toBeLessThan(1.5)
  })

  it("never stalls, so a heading always means something", () => {
    const body = createSwimBody({ x: 0, y: 0, z: 0 })
    const target = { x: 3, y: 0, z: 0 }
    let slowest = Infinity
    for (let t = 0; t < 8; t += DT) {
      stepSwimBody(body, target, DT)
      if (t > 1) slowest = Math.min(slowest, bodySpeed(body))
    }
    expect(slowest).toBeGreaterThan(0)
  })

  it("does not pirouette when a steering bias flips sign", () => {
    // The reported bug: two fish pass, separation reverses, and the fish spins
    // on the spot instead of banking around the shove.
    const params = { ...DEFAULT_LOCOMOTION }
    const body = createSwimBody({ x: 0, y: 0, z: 0 })
    const target = { x: 0, y: 0, z: 0 }
    const bias = { x: 0, y: 0, z: 0 }
    let winding = 0
    let prevYaw = body.yaw
    for (let t = 0; t < 12; t += DT) {
      // A cruise path plus a separation term that reverses twice a second.
      target.x = Math.sin(t * 0.6) * 9
      target.z = Math.cos(t * 0.6 * 0.7) * 6
      const flip = Math.sin(t * 3.1) > 0 ? 1 : -1
      bias.x += (flip * params.maxSpeed * 0.18 - bias.x) * 0.08
      bias.z += (-flip * params.maxSpeed * 0.18 - bias.z) * 0.08
      stepSwimBody(body, target, DT, params, bias)
      winding += shortestAngle(body.yaw - prevYaw)
      prevYaw = body.yaw
    }
    // Net rotation: a wag cancels out, a pirouette accumulates. The path itself
    // is a closed loop worth ~1.1 turns over this window.
    expect(Math.abs(winding) / (Math.PI * 2)).toBeLessThan(2)
  })

  it("reads a steering bias as a turn, never as sideways drift", () => {
    const body = createSwimBody({ x: 0, y: 0, z: 0 })
    // Drive it straight along +Z, then shove hard along +X.
    chase(body, { x: 0, y: 0, z: 60 }, 2)
    const bias = { x: DEFAULT_LOCOMOTION.maxSpeed, y: 0, z: 0 }
    stepSwimBody(body, { x: 0, y: 0, z: 60 }, DT, DEFAULT_LOCOMOTION, bias)
    // Velocity stays locked to the heading — the body swims where it points.
    expect(Math.atan2(body.velocity.x, body.velocity.z)).toBeCloseTo(body.yaw, 6)
  })

  it("never jumps: a target that teleports still costs travel time", () => {
    const body = createSwimBody({ x: 0, y: 0, z: 0 })
    // The whole point of the integrator — this is the bug it exists to prevent.
    const far = { x: 60, y: 0, z: 0 }
    const biggest = chase(body, far, 1)
    const perFrameCeiling = DEFAULT_LOCOMOTION.maxSpeed * DT * 1.05
    expect(biggest).toBeLessThanOrEqual(perFrameCeiling)
    expect(body.position.x).toBeLessThan(60)
    expect(body.position.x).toBeGreaterThan(0)
  })

  it("obeys the speed ceiling", () => {
    const body = createSwimBody({ x: 0, y: 0, z: 0 })
    chase(body, { x: 500, y: 0, z: 0 }, 3)
    expect(bodySpeed(body)).toBeLessThanOrEqual(DEFAULT_LOCOMOTION.maxSpeed + 1e-6)
  })

  it("turns at a limited rate rather than snapping heading", () => {
    const body = createSwimBody({ x: 0, y: 0, z: 0 })
    chase(body, { x: 0, y: 0, z: 50 }, 2)
    expect(body.yaw).toBeCloseTo(0, 1)

    // Reverse the target: yaw must sweep, so one frame later it is nowhere near π.
    const before = body.yaw
    stepSwimBody(body, { x: 0, y: 0, z: -50 }, DT)
    expect(Math.abs(shortestAngle(body.yaw - before))).toBeLessThanOrEqual(
      DEFAULT_LOCOMOTION.turnRate * DT + 1e-6,
    )
  })

  it("holds a cruise path tightly by matching its velocity, not just its position", () => {
    const body = createSwimBody({ x: 0, y: 0, z: 0 })
    const target = { x: 0, y: 0, z: 0 }
    // Orbit-like motion at roughly the fastest tangential speed a path produces.
    for (let t = 0; t < 8; t += DT) {
      target.x = Math.sin(t * 0.75) * 11.4
      target.z = Math.cos(t * 0.75 * 0.7) * 6.8
      stepSwimBody(body, target, DT)
    }
    // Velocity matching means it arrives at path speed rather than braking on
    // arrival and being left behind: position-only seeking trails by metres.
    expect(dist(body.position, target)).toBeLessThan(1)
  })

  it("ignores a zero or negative frame delta", () => {
    const body = createSwimBody({ x: 1, y: 2, z: 3 })
    stepSwimBody(body, { x: 50, y: 50, z: 50 }, 0)
    expect(body.position).toEqual({ x: 1, y: 2, z: 3 })
    stepSwimBody(body, { x: 50, y: 50, z: 50 }, -5)
    expect(body.position).toEqual({ x: 1, y: 2, z: 3 })
  })

  it("clamps a tab-restore frame to one slow frame of travel", () => {
    const body = createSwimBody({ x: 0, y: 0, z: 0 })
    stepSwimBody(body, { x: 500, y: 0, z: 0 }, 30)
    expect(body.position.x).toBeLessThanOrEqual(DEFAULT_LOCOMOTION.maxSpeed * 0.1 + 1e-6)
  })

  it("holds yaw when effectively stopped", () => {
    const body = createSwimBody({ x: 0, y: 0, z: 0 }, 1.23)
    stepSwimBody(body, { x: 0, y: 0, z: 0 }, DT)
    expect(body.yaw).toBe(1.23)
  })
})

describe("minSpeedFor", () => {
  it("stays under the slowest cruise path speed", () => {
    // A slow specimen's orbit point momentarily travels near zero at the path
    // extremes; a floor above that makes the fish overshoot and curve back
    // twice a lap, which is a visible wag.
    expect(minSpeedFor(maxSpeedFor(0.2))).toBeLessThan(0.6)
    expect(minSpeedFor(maxSpeedFor(1))).toBeLessThanOrEqual(0.45)
    expect(minSpeedFor(maxSpeedFor(0))).toBeGreaterThan(0)
  })
})

describe("maxSpeedFor", () => {
  it("outruns the orbit tangential speed at every specimen speed", () => {
    // Path radii × angular rate peak near 9 u/s at speed 1 (see fishPathSeed).
    expect(maxSpeedFor(1)).toBeGreaterThan(9)
    expect(maxSpeedFor(0)).toBeGreaterThan(0)
    expect(maxSpeedFor(1)).toBeGreaterThan(maxSpeedFor(0))
  })

  it("clamps out-of-range input", () => {
    expect(maxSpeedFor(-3)).toBe(maxSpeedFor(0))
    expect(maxSpeedFor(9)).toBe(maxSpeedFor(1))
  })
})

describe("clampToBounds", () => {
  const min = { x: -10, y: -10, z: -10 }
  const max = { x: 10, y: 10, z: 10 }

  it("pins the position inside the box", () => {
    const body = createSwimBody({ x: 40, y: -40, z: 12 })
    clampToBounds(body, min, max)
    expect(body.position).toEqual({ x: 10, y: -10, z: 10 })
  })

  it("kills the velocity component pointing into the wall", () => {
    const body = createSwimBody({ x: 40, y: 0, z: 0 })
    body.velocity = { x: 5, y: 2, z: -3 }
    clampToBounds(body, min, max)
    expect(body.velocity.x).toBe(0)
    // Tangential motion survives, so the fish slides along the glass.
    expect(body.velocity.y).toBe(2)
    expect(body.velocity.z).toBe(-3)
  })

  it("leaves a body inside the box untouched", () => {
    const body = createSwimBody({ x: 1, y: 2, z: 3 })
    body.velocity = { x: 1, y: 1, z: 1 }
    clampToBounds(body, min, max)
    expect(body.position).toEqual({ x: 1, y: 2, z: 3 })
    expect(body.velocity).toEqual({ x: 1, y: 1, z: 1 })
  })
})

describe("shortestAngle", () => {
  it("wraps to (-π, π]", () => {
    expect(shortestAngle(0)).toBe(0)
    expect(shortestAngle(Math.PI * 2)).toBeCloseTo(0)
    expect(shortestAngle(Math.PI * 1.5)).toBeCloseTo(-Math.PI / 2)
    expect(shortestAngle(-Math.PI * 1.5)).toBeCloseTo(Math.PI / 2)
  })
})
