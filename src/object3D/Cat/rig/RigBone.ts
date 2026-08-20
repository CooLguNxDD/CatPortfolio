/**
 * RigBone.ts
 * Kinematic Bone Node with Forward Kinematics matrix composition.
 */

import * as THREE from 'three';
import { LinearTransform } from '../math/LinearTransform';
import type { BoneConfig, BoneConstraints, BoneName } from './types';

export class RigBone {
  public readonly name: BoneName;
  public parent: RigBone | null = null;
  public children: RigBone[] = [];

  // Transform states
  public initialPosition: THREE.Vector3;
  public initialRotation: THREE.Euler;
  public initialScale: THREE.Vector3;

  public localPosition: THREE.Vector3;
  public localRotation: THREE.Euler;
  public localScale: THREE.Vector3;

  public pivot: THREE.Vector3;
  public constraints: BoneConstraints;

  // Linear transformation matrices
  public localMatrix = new THREE.Matrix4();
  public worldMatrix = new THREE.Matrix4();

  // Bound Three.js object (optional for 3D renderers)
  public targetObject: THREE.Object3D | null = null;

  constructor(config: BoneConfig) {
    this.name = config.name;
    this.initialPosition = config.initialPosition?.clone() ?? new THREE.Vector3(0, 0, 0);
    this.initialRotation = config.initialRotation?.clone() ?? new THREE.Euler(0, 0, 0, 'YXZ');
    this.initialScale = config.initialScale?.clone() ?? new THREE.Vector3(1, 1, 1);

    this.localPosition = this.initialPosition.clone();
    this.localRotation = this.initialRotation.clone();
    this.localScale = this.initialScale.clone();

    this.pivot = config.pivot?.clone() ?? new THREE.Vector3(0, 0, 0);
    this.constraints = config.constraints ?? {};
    this.targetObject = config.targetObject ?? null;
  }

  addChild(child: RigBone): void {
    child.parent = this;
    this.children.push(child);
  }

  /**
   * Resets local transform back to rest pose.
   */
  resetPose(): void {
    this.localPosition.copy(this.initialPosition);
    this.localRotation.copy(this.initialRotation);
    this.localScale.copy(this.initialScale);
  }

  /**
   * Sets additive local offset with constraints.
   */
  setOffset(
    positionDelta?: THREE.Vector3,
    rotationDelta?: THREE.Euler,
    scaleFactor?: THREE.Vector3
  ): void {
    if (positionDelta) {
      this.localPosition.addVectors(this.initialPosition, positionDelta);
      if (this.constraints.maxRadialOffset !== undefined) {
        const offset2D = new THREE.Vector2(positionDelta.x, positionDelta.y);
        const clamped = LinearTransform.clampRadialVector(offset2D, this.constraints.maxRadialOffset);
        this.localPosition.x = this.initialPosition.x + clamped.x;
        this.localPosition.y = this.initialPosition.y + clamped.y;
      }
    }

    if (rotationDelta) {
      const mult = this.constraints.rotationMultiplier ?? 1.0;
      this.localRotation.x = this.initialRotation.x + rotationDelta.x * mult;
      this.localRotation.y = this.initialRotation.y + rotationDelta.y * mult;
      this.localRotation.z = this.initialRotation.z + rotationDelta.z * mult;

      if (this.constraints.maxRotation && this.constraints.minRotation) {
        this.localRotation.x = LinearTransform.clampAngle(
          this.localRotation.x,
          this.constraints.minRotation.x,
          this.constraints.maxRotation.x
        );
        this.localRotation.y = LinearTransform.clampAngle(
          this.localRotation.y,
          this.constraints.minRotation.y,
          this.constraints.maxRotation.y
        );
        this.localRotation.z = LinearTransform.clampAngle(
          this.localRotation.z,
          this.constraints.minRotation.z,
          this.constraints.maxRotation.z
        );
      }
    }

    if (scaleFactor) {
      this.localScale.multiplyVectors(this.initialScale, scaleFactor);
    }
  }

  /**
   * Updates affine matrices and propagates forward kinematics down the hierarchy.
   */
  updateMatrices(parentWorldMatrix?: THREE.Matrix4): void {
    // 1. Compose local matrix: T * R * S around pivot
    this.localMatrix = LinearTransform.composeMatrix(
      this.localPosition,
      this.localRotation,
      this.localScale,
      this.pivot
    );

    // 2. Compute World Matrix = ParentWorld * LocalMatrix
    if (parentWorldMatrix) {
      this.worldMatrix.multiplyMatrices(parentWorldMatrix, this.localMatrix);
    } else {
      this.worldMatrix.copy(this.localMatrix);
    }

    // 3. Sync to bound Three.js Object3D if attached
    if (this.targetObject) {
      this.targetObject.position.copy(this.localPosition);
      this.targetObject.rotation.copy(this.localRotation);
      this.targetObject.scale.copy(this.localScale);
    }

    // 4. Cascade to all children
    for (const child of this.children) {
      child.updateMatrices(this.worldMatrix);
    }
  }
}
