/**
 * Integrated swim body (pure, DOM-free, three-free).
 *
 * The tank used to write `computeFishPose()` straight onto the mesh, so a fish
 * *was* its parametric orbit — it could never be anywhere else. Feeding then had
 * to blend the orbit point toward a pellet, and unwinding that blend snapped the
 * fish back onto an orbit that had kept advancing while it was away: a teleport.
 *
 * Here the orbit is demoted to a **target**. Each fish owns a position and a
 * velocity, and every frame it accelerates toward whatever point it currently
 * wants — orbit while cruising, pellet while hunting. Momentum is the whole
 * point: the target may jump, the body never can. Coming off a meal the fish
 * simply swims back to its path, because that is the only thing it can do.
 *
 * The body is a swimmer, not a point being dragged: it always makes way along
 * its own heading, and every steering input — path, food, shoal separation —
 * is read as a heading and a throttle rather than as a displacement. A fish
 * therefore cannot slide sideways, stall, or pivot on the spot; the only way it
 * has of reacting to anything is to turn, at a bounded rate, while swimming.
 * That is what keeps a shove from a neighbour looking like a bank instead of a
 * pirouette.
 *
 * The seek matches the target's **velocity** as well as chasing its position.
 * Position-only seeking cannot express "travel with my path": a fish that
 * reaches its orbit point has nowhere left to go, so it either stops — and a
 * stopped fish has no heading, so yaw chases noise and it pirouettes — or, with
 * a speed floor, circles the point forever. Matching velocity means arriving
 * *at path speed, on the path's heading*, which is what swimming is.
 */

import type { Vec3 } from "@/blocks/fishTankLayout"

export interface SwimBody {
  position: Vec3
  velocity: Vec3
  yaw: number
  /**
   * Previous frame's target, used to estimate how fast the target itself is
   * moving. Null on the first step, where there is nothing to differentiate.
   */
  lastTarget: Vec3 | null
}

export interface LocomotionParams {
  /** Cruise ceiling, world units per second. */
  maxSpeed: number
  /** How hard the fish can change its velocity, units per second². */
  accel: number
  /** Yaw slew limit, radians per second. */
  turnRate: number
  /** Inside this radius the fish eases off rather than overshooting. */
  arriveRadius: number
  /**
   * Forward speed floor. A fish that stops has no heading and nothing to steer
   * with, so it never fully stops — on a static target (a sinking pellet) it
   * coasts past and curves back, which is also what a real one does.
   */
  minSpeed: number
}

/** A frame longer than this is a tab restore, not a slow frame. */
const MAX_DT = 0.1
/** Below this speed the heading is meaningless, so yaw is held. */
const YAW_EPSILON = 0.05

export const DEFAULT_LOCOMOTION: LocomotionParams = {
  maxSpeed: 16,
  accel: 60,
  // Kept below the old 3.4: at the cap a fish turns 195 deg/s, which reads as a
  // twitch even when the heading it is chasing is legitimate.
  turnRate: 2.6,
  arriveRadius: 2.2,
  minSpeed: 1.3,
}

/**
 * Companion to `maxSpeedFor`.
 *
 * The floor has to stay under the slowest cruise path's own speed (a slow
 * specimen's orbit point travels ~1.3 u/s), or the fish outruns its target and
 * loops around it — the spin this replaced, only wider.
 */
export function minSpeedFor(maxSpeed: number): number {
  return Math.min(0.12 + maxSpeed * 0.02, 0.45)
}

/**
 * Cruise ceiling for a specimen's `speed` ∈ [0,1].
 *
 * Floor and slope are set against the orbit's own tangential speed (up to
 * ~9 u/s at `speed` 1, from `fishPathSeed`'s radii × the path's angular rate).
 * A body that cannot outrun its own target would trail it forever, so the
 * ceiling stays comfortably above it at every speed.
 */
export function maxSpeedFor(speed01: number): number {
  const s = Math.max(0, Math.min(1, speed01))
  return 4.5 + s * 12
}

export function createSwimBody(position: Vec3, yaw = 0): SwimBody {
  return {
    position: { x: position.x, y: position.y, z: position.z },
    velocity: { x: 0, y: 0, z: 0 },
    yaw,
    lastTarget: null,
  }
}

/** Signed shortest angular delta, (-π, π]. */
export function shortestAngle(delta: number): number {
  let d = delta
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return d
}

/**
 * Advance one body toward `desired`. Mutates in place — this runs per fish per
 * frame, and allocating a position/velocity pair each time is pure garbage.
 */
export function stepSwimBody(
  body: SwimBody,
  desired: Vec3,
  dt: number,
  params: LocomotionParams = DEFAULT_LOCOMOTION,
  bias?: Vec3 | null,
): SwimBody {
  const step = Math.max(0, Math.min(dt, MAX_DT))
  if (step === 0) return body

  // How fast the target itself is moving. For a cruise target this is the
  // path's own velocity; for a pellet it is roughly the sink rate.
  let tvx = 0
  let tvy = 0
  let tvz = 0
  if (body.lastTarget) {
    tvx = (desired.x - body.lastTarget.x) / step
    tvy = (desired.y - body.lastTarget.y) / step
    tvz = (desired.z - body.lastTarget.z) / step
    const tvLen = Math.sqrt(tvx * tvx + tvy * tvy + tvz * tvz)
    // A target that jumps (behaviour switching from pellet to orbit) would
    // otherwise read as an impossible velocity for one frame.
    if (tvLen > params.maxSpeed && tvLen > 0.0001) {
      const k = params.maxSpeed / tvLen
      tvx *= k
      tvy *= k
      tvz *= k
    }
    body.lastTarget.x = desired.x
    body.lastTarget.y = desired.y
    body.lastTarget.z = desired.z
  } else {
    body.lastTarget = { x: desired.x, y: desired.y, z: desired.z }
  }

  const dx = desired.x - body.position.x
  const dy = desired.y - body.position.y
  const dz = desired.z - body.position.z
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

  // Positional correction, ramped down on approach so the fish closes on the
  // target instead of oscillating across it. On its own this would leave a fish
  // stalled the moment it arrives — hence the velocity term above.
  //
  // The ramp cannot start later than the turn radius v/omega, or the fish
  // arrives at a speed it cannot turn out of: it sails past and loops back in a
  // wide arc, which is the "why is it circling?" failure mode.
  // The 1.8 margin matters: braking at exactly the turn radius makes every
  // orbit self-sustaining (the speed a circle of radius d needs is the speed the
  // ramp hands out at d), so the fish holds whatever loop it fell into instead
  // of closing on the target. Braking sooner makes the approach a spiral in.
  const turnRadius = (params.maxSpeed / Math.max(params.turnRate, 0.001)) * 1.8
  const brakeFrom = Math.max(params.arriveRadius, turnRadius)
  const correction =
    dist > brakeFrom ? params.maxSpeed : params.maxSpeed * (dist / Math.max(brakeFrom, 0.001))

  let wantX = tvx
  let wantY = tvy
  let wantZ = tvz
  if (dist > 0.0001) {
    wantX += (dx / dist) * correction
    wantY += (dy / dist) * correction
    wantZ += (dz / dist) * correction
  }
  // Shoal steering enters as a *velocity* bias, never as a displaced target.
  // Displacing the target makes a separation term that flips sign — which is
  // exactly what happens as two fish pass — swing the destination across the
  // fish, reversing its heading and spinning it. As a velocity it does what a
  // shove should: pushes the body aside while it keeps swimming.
  if (bias) {
    wantX += bias.x
    wantY += bias.y
    wantZ += bias.z
  }
  const wantLen = Math.sqrt(wantX * wantX + wantY * wantY + wantZ * wantZ)
  if (wantLen > params.maxSpeed && wantLen > 0.0001) {
    const k = params.maxSpeed / wantLen
    wantX *= k
    wantY *= k
    wantZ *= k
  }

  // Thrust, not translation. `want` is only ever read as a *heading and a
  // throttle*: the fish turns toward it at a bounded rate and swims forward
  // along its own facing. Nothing here can move the body sideways, so no
  // steering term — however hard or however suddenly it flips — can slide,
  // vibrate or spin a fish in place. It can only make it turn.
  const wantPlanar = Math.hypot(wantX, wantZ)
  if (wantPlanar > YAW_EPSILON) {
    // Same +Z-forward convention as `computeFishPose`.
    const targetYaw = Math.atan2(wantX, wantZ)
    const turn = shortestAngle(targetYaw - body.yaw)
    const limit = params.turnRate * step
    body.yaw += Math.max(-limit, Math.min(limit, turn))
  }

  const floor = Math.max(0, Math.min(params.minSpeed, params.maxSpeed))
  const throttle = Math.max(floor, Math.min(wantPlanar, params.maxSpeed))
  const maxDelta = params.accel * step
  let speed = Math.hypot(body.velocity.x, body.velocity.z)
  speed += Math.max(-maxDelta, Math.min(maxDelta, throttle - speed))
  body.velocity.x = Math.sin(body.yaw) * speed
  body.velocity.z = Math.cos(body.yaw) * speed

  // Vertical is decoupled: these fish do not pitch, they rise and sink. Held
  // well under the cruise ceiling so climbs read as swimming, not as elevators.
  const climbLimit = params.maxSpeed * 0.5
  const wantClimb = Math.max(-climbLimit, Math.min(climbLimit, wantY))
  body.velocity.y += Math.max(-maxDelta, Math.min(maxDelta, wantClimb - body.velocity.y))

  body.position.x += body.velocity.x * step
  body.position.y += body.velocity.y * step
  body.position.z += body.velocity.z * step

  return body
}

/** Current planar speed — drives banking and the tail-beat rate. */
export function bodySpeed(body: SwimBody): number {
  const v = body.velocity
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
}

/**
 * Hard containment. Applied after integration: clamping the position alone
 * would leave the velocity pointing into the glass, so the fish would grind
 * along it — the normal component is killed too.
 */
export function clampToBounds(
  body: SwimBody,
  min: Vec3,
  max: Vec3,
): SwimBody {
  if (body.position.x < min.x) {
    body.position.x = min.x
    if (body.velocity.x < 0) body.velocity.x = 0
  } else if (body.position.x > max.x) {
    body.position.x = max.x
    if (body.velocity.x > 0) body.velocity.x = 0
  }
  if (body.position.y < min.y) {
    body.position.y = min.y
    if (body.velocity.y < 0) body.velocity.y = 0
  } else if (body.position.y > max.y) {
    body.position.y = max.y
    if (body.velocity.y > 0) body.velocity.y = 0
  }
  if (body.position.z < min.z) {
    body.position.z = min.z
    if (body.velocity.z < 0) body.velocity.z = 0
  } else if (body.position.z > max.z) {
    body.position.z = max.z
    if (body.velocity.z > 0) body.velocity.z = 0
  }
  return body
}
