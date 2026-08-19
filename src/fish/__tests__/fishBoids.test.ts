import { describe, expect, it } from "vitest"
import {
  computeSteeringForce,
  type BoidAgent,
  type FoodPellet,
} from "../fishBoids"

describe("fishBoids steering engine", () => {
  const baseAgent: BoidAgent = {
    id: "fish-1",
    school: 0,
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 1, y: 0, z: 0 },
    size: 0.5,
    speed: 0.5,
  }

  it("calculates separation when peers are too close", () => {
    const closePeer: BoidAgent = {
      id: "fish-2",
      school: 0,
      position: { x: 1, y: 0, z: 0 },
      velocity: { x: 1, y: 0, z: 0 },
      size: 0.5,
      speed: 0.5,
    }

    const force = computeSteeringForce(baseAgent, [baseAgent, closePeer])
    // Should steer in negative X direction away from the peer
    expect(force.x).toBeLessThan(0)
  })

  it("produces strictly greater separation magnitude for a nearer peer", () => {
    const nearPeer: BoidAgent = {
      id: "fish-near",
      school: -1,
      position: { x: 0.5, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      size: 0.5,
      speed: 0.5,
    }
    const farPeer: BoidAgent = {
      id: "fish-far",
      school: -1,
      position: { x: 2.5, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      size: 0.5,
      speed: 0.5,
    }

    const nearForce = computeSteeringForce(baseAgent, [baseAgent, nearPeer])
    const farForce = computeSteeringForce(baseAgent, [baseAgent, farPeer])
    expect(Math.abs(nearForce.x)).toBeGreaterThan(Math.abs(farForce.x))
  })

  it("calculates cohesion towards school center of mass", () => {
    const distantCohort: BoidAgent = {
      id: "fish-2",
      school: 0,
      position: { x: 8, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      size: 0.5,
      speed: 0.5,
    }

    const force = computeSteeringForce(baseAgent, [baseAgent, distantCohort])
    // Should steer in positive X direction towards cohort
    expect(force.x).toBeGreaterThan(0)
  })

  it("does not cohere with different school when distant", () => {
    const otherSchool: BoidAgent = {
      id: "fish-3",
      school: 1,
      position: { x: 8, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      size: 0.5,
      speed: 0.5,
    }

    const force = computeSteeringForce(baseAgent, [baseAgent, otherSchool])
    expect(force.x).toBe(0)
  })

  it("steers away from 3D cursor position", () => {
    const cursor3D = { x: 2, y: 0, z: 0 }
    const force = computeSteeringForce(baseAgent, [baseAgent], cursor3D)
    expect(force.x).toBeLessThan(0)
  })

  it("attracts towards nearest food pellet", () => {
    const food: FoodPellet[] = [
      { id: "pellet-1", x: 5, y: -2, z: 0, vy: -0.5, active: true },
      { id: "pellet-2", x: -20, y: -5, z: 0, vy: -0.5, active: false },
    ]

    const force = computeSteeringForce(baseAgent, [baseAgent], null, food)
    expect(force.x).toBeGreaterThan(0)
    expect(force.y).toBeLessThan(0)
  })

  it("enforces soft boundary repulsions near glass edges", () => {
    const edgeAgent: BoidAgent = {
      id: "fish-edge",
      school: 0,
      position: { x: 37, y: 0, z: 0 },
      velocity: { x: 1, y: 0, z: 0 },
      size: 0.5,
      speed: 0.5,
    }

    const force = computeSteeringForce(edgeAgent, [edgeAgent])
    expect(force.x).toBeLessThan(0)
  })
})

describe("cursor intent modes", () => {
  const agent: BoidAgent = {
    id: "a",
    school: 1,
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    size: 0.5,
    speed: 0.5,
  }
  const cursor = { x: 8, y: 0, z: 0 }

  it("pushes away from the cursor by default", () => {
    const f = computeSteeringForce(agent, [agent], cursor, [])
    expect(f.x).toBeLessThan(0)
  })

  it("pulls toward a still cursor when curious", () => {
    const f = computeSteeringForce(agent, [agent], cursor, [], { cursorMode: "curious" })
    expect(f.x).toBeGreaterThan(0)
  })

  it("scatters harder when fleeing than when idle", () => {
    const idle = computeSteeringForce(agent, [agent], cursor, [], { cursorMode: "idle" })
    const flee = computeSteeringForce(agent, [agent], cursor, [], { cursorMode: "flee" })
    expect(Math.abs(flee.x)).toBeGreaterThan(Math.abs(idle.x))
  })
})
