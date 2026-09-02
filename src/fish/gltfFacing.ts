/**
 * Per-rig rest-pose offsets so LayerLab GLBs share the tank's +Z-forward
 * locomotion convention (`fishLocomotion.ts`). Applied on a wrapper under the
 * specimen group; yaw/bank still live on the parent.
 *
 * Euler radians, local XYZ. Identity until a browser pass proves a rig faces
 * the wrong way — seahorse/lobster are the only ones modeled off the swim axis.
 */

export type CreatureRig =
  | "fish"
  | "shark"
  | "ray"
  | "dolphin"
  | "seahorse"
  | "turtle"
  | "lobster"

export interface FacingEuler {
  x: number
  y: number
  z: number
}

export const RIG_FACING_EULER: Record<CreatureRig, FacingEuler> = {
  fish: { x: 0, y: 0, z: 0 },
  shark: { x: 0, y: 0, z: 0 },
  dolphin: { x: 0, y: 0, z: 0 },
  ray: { x: 0, y: 0, z: 0 },
  turtle: { x: 0, y: 0, z: 0 },
  // LayerLab seahorses lie along +Z; stand them up in the water column.
  seahorse: { x: Math.PI / 2, y: 0, z: 0 },
  // Benthic: slight pitch so the body sits on the sand instead of swimming like a tang.
  lobster: { x: 0.35, y: 0, z: 0 },
}

export function isCreatureRig(value: string): value is CreatureRig {
  return value in RIG_FACING_EULER
}

/** Mutates `object.rotation` to the rig's rest-pose offset. */
export function applyRigFacing(
  object: { rotation: { set: (x: number, y: number, z: number) => void } },
  rig: CreatureRig,
): void {
  const e = RIG_FACING_EULER[rig]
  object.rotation.set(e.x, e.y, e.z)
}
