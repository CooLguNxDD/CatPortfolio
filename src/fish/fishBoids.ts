/**
 * Pure boids steering and flocking engine for fish specimens.
 * DOM-free and Three-free for full unit testability.
 */

import type { CursorIntent } from "./cursorIntent"
import type { Vec3 } from "@/blocks/fishTankLayout"
import {
  SWIM_Y_MAX,
  SWIM_Y_MIN,
  TANK_HALF_D,
  TANK_HALF_W,
} from "@/blocks/fishTankLayout"

export interface BoidAgent {
  id: string
  school: number
  position: Vec3
  velocity: Vec3
  size: number
  speed: number
}

export interface FoodPellet {
  id: string
  x: number
  y: number
  z: number
  vy: number
  active: boolean
}

export interface SteeringParams {
  separationDist?: number
  separationWeight?: number
  cohesionDist?: number
  cohesionWeight?: number
  alignmentDist?: number
  alignmentWeight?: number
  cursorAvoidDist?: number
  cursorAvoidWeight?: number
  foodSenseDist?: number
  foodWeight?: number
  maxForce?: number
  /**
   * How the shoal reads the cursor (see fish/cursorIntent.ts).
   *   "idle"    — legacy behaviour: gentle avoidance
   *   "curious" — approach a cursor that has been still
   *   "flee"    — hard scatter from a fast cursor
   */
  cursorMode?: CursorIntent
  /** Attraction weight in the curious state. */
  cursorCuriousWeight?: number
  /** Multiplier applied to the avoid weight in the flee state. */
  cursorFleeMultiplier?: number
  /** Sense radius in the curious state — wider than the avoid radius. */
  cursorCuriousDist?: number
}

const DEFAULTS: Required<SteeringParams> = {
  separationDist: 3.8,
  separationWeight: 1.4,
  cohesionDist: 14.0,
  cohesionWeight: 0.8,
  alignmentDist: 12.0,
  alignmentWeight: 0.9,
  cursorAvoidDist: 11.0,
  cursorAvoidWeight: 2.2,
  foodSenseDist: 28.0,
  foodWeight: 2.8,
  maxForce: 0.65,
  cursorMode: "idle",
  cursorCuriousWeight: 1.1,
  cursorFleeMultiplier: 2.4,
  cursorCuriousDist: 22.0,
}

function distSq(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = a.z - b.z
  return dx * dx + dy * dy + dz * dz
}

function clampLength(v: Vec3, maxLen: number): Vec3 {
  const lenSq = v.x * v.x + v.y * v.y + v.z * v.z
  if (lenSq > maxLen * maxLen && lenSq > 0.000001) {
    const scale = maxLen / Math.sqrt(lenSq)
    return { x: v.x * scale, y: v.y * scale, z: v.z * scale }
  }
  return v
}

/**
 * Compute the net steering acceleration vector for one boid given all peers.
 */
export function computeSteeringForce(
  agent: BoidAgent,
  peers: BoidAgent[],
  cursor3D?: Vec3 | null,
  foodPellets?: FoodPellet[],
  params?: SteeringParams,
): Vec3 {
  const cfg = { ...DEFAULTS, ...params }

  let sepX = 0
  let sepY = 0
  let sepZ = 0
  let sepCount = 0

  let cohX = 0
  let cohY = 0
  let cohZ = 0
  let cohCount = 0

  let aliX = 0
  let aliY = 0
  let aliZ = 0
  let aliCount = 0

  const sepDistSq = cfg.separationDist * cfg.separationDist
  const cohDistSq = cfg.cohesionDist * cfg.cohesionDist
  const aliDistSq = cfg.alignmentDist * cfg.alignmentDist

  for (const other of peers) {
    if (other.id === agent.id) continue
    const dSq = distSq(agent.position, other.position)
    if (dSq < 0.0001) continue

    // Separation (applies to any fish nearby)
    if (dSq < sepDistSq) {
      const d = Math.sqrt(dSq)
      const weight = 1 - d / cfg.separationDist
      const diffX = ((agent.position.x - other.position.x) / d) * weight
      const diffY = ((agent.position.y - other.position.y) / d) * weight
      const diffZ = ((agent.position.z - other.position.z) / d) * weight
      sepX += diffX
      sepY += diffY
      sepZ += diffZ
      sepCount++
    }

    // Cohesion & Alignment (applies to same school / cohort)
    if (other.school === agent.school && other.school >= 0) {
      if (dSq >= sepDistSq && dSq < cohDistSq) {
        cohX += other.position.x
        cohY += other.position.y
        cohZ += other.position.z
        cohCount++
      }
      if (dSq < aliDistSq) {
        aliX += other.velocity.x
        aliY += other.velocity.y
        aliZ += other.velocity.z
        aliCount++
      }
    }
  }

  let fx = 0
  let fy = 0
  let fz = 0

  // Apply separation
  if (sepCount > 0) {
    fx += (sepX / sepCount) * cfg.separationWeight
    fy += (sepY / sepCount) * cfg.separationWeight
    fz += (sepZ / sepCount) * cfg.separationWeight
  }

  // Apply cohesion (steer toward center of mass)
  if (cohCount > 0) {
    const targetX = cohX / cohCount - agent.position.x
    const targetY = cohY / cohCount - agent.position.y
    const targetZ = cohZ / cohCount - agent.position.z
    const d = Math.hypot(targetX, targetY, targetZ) || 1
    const weight = (d / cfg.cohesionDist) * cfg.cohesionWeight
    fx += (targetX / d) * weight
    fy += (targetY / d) * weight
    fz += (targetZ / d) * weight
  }

  // Apply alignment (match flock velocity)
  if (aliCount > 0) {
    const avgVx = aliX / aliCount
    const avgVy = aliY / aliCount
    const avgVz = aliZ / aliCount
    const vLen = Math.hypot(avgVx, avgVy, avgVz) || 1
    fx += (avgVx / vLen) * cfg.alignmentWeight
    fy += (avgVy / vLen) * cfg.alignmentWeight
    fz += (avgVz / vLen) * cfg.alignmentWeight
  }

  // Cursor response — avoid, scatter, or investigate depending on intent.
  if (cursor3D) {
    const curDistSq = distSq(agent.position, cursor3D)
    if (cfg.cursorMode === "curious") {
      // Investigate: swim toward a cursor that has been still, easing off as
      // the fish arrives so it hovers rather than colliding with the pointer.
      const senseSq = cfg.cursorCuriousDist * cfg.cursorCuriousDist
      if (curDistSq < senseSq && curDistSq > cfg.separationDist * cfg.separationDist) {
        const d = Math.sqrt(curDistSq)
        const pull = (1 - d / cfg.cursorCuriousDist) * cfg.cursorCuriousWeight
        fx += ((cursor3D.x - agent.position.x) / d) * pull
        fy += ((cursor3D.y - agent.position.y) / d) * pull
        fz += ((cursor3D.z - agent.position.z) / d) * pull
      }
    } else {
      const fleeing = cfg.cursorMode === "flee"
      const avoidDist = fleeing ? cfg.cursorAvoidDist * 1.6 : cfg.cursorAvoidDist
      const weight = fleeing
        ? cfg.cursorAvoidWeight * cfg.cursorFleeMultiplier
        : cfg.cursorAvoidWeight
      if (curDistSq < avoidDist * avoidDist && curDistSq > 0.001) {
        const d = Math.sqrt(curDistSq)
        const push = (1 - d / avoidDist) * weight
        fx += ((agent.position.x - cursor3D.x) / d) * push
        fy += ((agent.position.y - cursor3D.y) / d) * push
        fz += ((agent.position.z - cursor3D.z) / d) * push
      }
    }
  }

  // Food pellet attraction (seek nearest active food)
  if (foodPellets && foodPellets.length > 0) {
    let closestDistSq = cfg.foodSenseDist * cfg.foodSenseDist
    let targetPellet: FoodPellet | null = null

    for (const p of foodPellets) {
      if (!p.active) continue
      const dSq = distSq(agent.position, p)
      if (dSq < closestDistSq) {
        closestDistSq = dSq
        targetPellet = p
      }
    }

    if (targetPellet) {
      const d = Math.sqrt(closestDistSq) || 1
      const seekX = (targetPellet.x - agent.position.x) / d
      const seekY = (targetPellet.y - agent.position.y) / d
      const seekZ = (targetPellet.z - agent.position.z) / d
      fx += seekX * cfg.foodWeight
      fy += seekY * cfg.foodWeight
      fz += seekZ * cfg.foodWeight
    }
  }

  // Tank wall boundaries soft bounce
  const padX = 2.5
  const padY = 1.5
  const padZ = 2.0
  if (agent.position.x < -TANK_HALF_W + padX) {
    fx += Math.abs(-TANK_HALF_W + padX - agent.position.x) * 1.5
  } else if (agent.position.x > TANK_HALF_W - padX) {
    fx -= Math.abs(agent.position.x - (TANK_HALF_W - padX)) * 1.5
  }

  if (agent.position.y < SWIM_Y_MIN + padY) {
    fy += Math.abs(SWIM_Y_MIN + padY - agent.position.y) * 2.0
  } else if (agent.position.y > SWIM_Y_MAX - padY) {
    fy -= Math.abs(agent.position.y - (SWIM_Y_MAX - padY)) * 2.0
  }

  if (agent.position.z < -TANK_HALF_D + padZ) {
    fz += Math.abs(-TANK_HALF_D + padZ - agent.position.z) * 1.5
  } else if (agent.position.z > TANK_HALF_D - padZ) {
    fz -= Math.abs(agent.position.z - (TANK_HALF_D - padZ)) * 1.5
  }

  // A scatter is allowed to exceed the cruise force budget — that burst is the
  // whole point of the startle response.
  const forceCap = cfg.cursorMode === "flee" ? cfg.maxForce * 1.8 : cfg.maxForce
  return clampLength({ x: fx, y: fy, z: fz }, forceCap)
}
