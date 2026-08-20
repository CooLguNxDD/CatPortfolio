/**
 * LinearTransform.ts
 * Linear & Affine Transformation math for 2D/3D Forward Kinematics Rigging.
 */

import * as THREE from 'three';

export interface TransformState {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
}

export class LinearTransform {
  /**
   * Clamps an angle (in radians) between min and max limits.
   */
  static clampAngle(angle: number, min: number, max: number): number {
    // Normalize to [-PI, PI]
    let normalized = angle;
    while (normalized > Math.PI) normalized -= 2 * Math.PI;
    while (normalized < -Math.PI) normalized += 2 * Math.PI;
    return Math.max(min, Math.min(max, normalized));
  }

  static readonly MAX_ANGULAR_LIMIT = Math.PI / 2; // ±90 degrees in radians

  /**
   * Computes forward look-at Euler angles (Yaw, Pitch, Roll) from an origin to a target vector.
   * Features:
   * - Eliminates atan2 branch-cut snapping across negative axes.
   * - Smoothstep attention falloff for targets in the rear hemisphere to eliminate blind-zone jitter.
   * - Hard-clamps all angular rotations to a maximum of ±90 degrees (±PI/2 radians).
   */
  static computeLookAtAngles(
    origin: THREE.Vector3,
    target: THREE.Vector3,
    limits?: { maxPitch?: number; maxYaw?: number; maxRoll?: number }
  ): { yaw: number; pitch: number; roll: number } {
    const delta = new THREE.Vector3().subVectors(target, origin);
    const horizontalDistance = Math.hypot(delta.x, delta.z);

    if (horizontalDistance < 0.0001) {
      return { yaw: 0, pitch: 0, roll: 0 };
    }

    // Continuous rear-hemisphere attention falloff (Smoothstep)
    // When target is in front (delta.z > 0), visibility is 1.0.
    // As target moves into rear hemisphere (delta.z < 0), visibility smoothly tapers to 0.0 at direct rear.
    const forwardCos = delta.z / horizontalDistance;
    const fovFactor = Math.max(0, Math.min(1, (forwardCos + 0.35) / 0.7));
    const visibility = fovFactor * fovFactor * (3 - 2 * fovFactor);

    // Continuous Yaw in [-PI/2, PI/2]
    const rawYaw = Math.atan2(delta.x, Math.max(0.001, delta.z));
    const maxYaw = Math.min(this.MAX_ANGULAR_LIMIT, limits?.maxYaw ?? this.MAX_ANGULAR_LIMIT);
    const clampedRawYaw = this.clampAngle(rawYaw, -maxYaw, maxYaw);
    const yaw = clampedRawYaw * visibility;

    // Continuous Pitch in [-PI/2, PI/2]
    const maxPitch = Math.min(this.MAX_ANGULAR_LIMIT, limits?.maxPitch ?? this.MAX_ANGULAR_LIMIT);
    const rawPitch = Math.atan2(-delta.y, Math.max(0.001, horizontalDistance));
    const clampedRawPitch = this.clampAngle(rawPitch, -maxPitch, maxPitch);
    const pitch = clampedRawPitch * visibility;

    let roll = 0;
    const maxRoll = Math.min(this.MAX_ANGULAR_LIMIT, limits?.maxRoll ?? this.MAX_ANGULAR_LIMIT);
    roll = this.clampAngle(roll, -maxRoll, maxRoll);

    return { yaw, pitch, roll };
  }

  /**
   * Composes a 4x4 Affine Transformation Matrix: M = Translation * Rotation * Scale around a pivot point.
   */
  static composeMatrix(
    position: THREE.Vector3,
    rotation: THREE.Euler,
    scale: THREE.Vector3,
    pivot: THREE.Vector3 = new THREE.Vector3(0, 0, 0)
  ): THREE.Matrix4 {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion().setFromEuler(rotation);

    // M = T(pos + pivot) * R(q) * S(scale) * T(-pivot)
    const mToPivot = new THREE.Matrix4().makeTranslation(
      position.x + pivot.x,
      position.y + pivot.y,
      position.z + pivot.z
    );
    const mRotScale = new THREE.Matrix4().compose(
      new THREE.Vector3(0, 0, 0),
      q,
      scale
    );
    const mFromPivot = new THREE.Matrix4().makeTranslation(-pivot.x, -pivot.y, -pivot.z);

    m.multiplyMatrices(mToPivot, mRotScale).multiply(mFromPivot);
    return m;
  }

  /**
   * Applies an affine 2D shear/skew matrix.
   */
  static createShearMatrix(shearX: number, shearY: number): THREE.Matrix4 {
    const m = new THREE.Matrix4();
    m.set(
      1, Math.tan(shearX), 0, 0,
      Math.tan(shearY), 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    );
    return m;
  }

  /**
   * Linear interpolation between two scalars.
   */
  static lerp(a: number, b: number, t: number): number {
    return a + (b - a) * Math.max(0, Math.min(1, t));
  }

  /**
   * Linear vector projection clamped to a max radius (useful for pupils in eye sockets).
   */
  static clampRadialVector(
    vector: THREE.Vector2,
    maxRadius: number
  ): THREE.Vector2 {
    const len = vector.length();
    if (len <= maxRadius || len === 0) {
      return vector.clone();
    }
    return vector.clone().multiplyScalar(maxRadius / len);
  }
}
