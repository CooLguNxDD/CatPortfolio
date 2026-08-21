/**
 * GazeTrackingLayer.ts
 * Forward Kinematics cursor tracking using linear transformations and spring damping.
 */

import * as THREE from 'three';
import { BaseAnimationLayer } from './AnimationLayer';
import { LinearTransform } from '../math/LinearTransform';
import { SpringDamper3D } from '../math/SpringDamper';
import type { AnimationContext } from '../rig/types';
import type { CatRig } from '../rig/CatRig';

export interface GazeTrackingConfig {
  sensitivity?: number; // Cursor tracking responsiveness
  stiffness?: number;   // Spring stiffness
  damping?: number;     // Spring damping
  maxHeadYaw?: number;  // In radians (~45 deg = 0.785)
  maxHeadPitch?: number;// In radians (~30 deg = 0.523)
  pupilSensitivity?: number;
}

export class GazeTrackingLayer extends BaseAnimationLayer {
  public readonly name = 'GazeTracking';

  private headSpring: SpringDamper3D;
  private pupilSpringL: SpringDamper3D;
  private pupilSpringR: SpringDamper3D;

  private config: Required<GazeTrackingConfig>;

  private headWorldPos = new THREE.Vector3();
  private headWorldQuat = new THREE.Quaternion();
  private headWorldScale = new THREE.Vector3();
  private scratchEuler = new THREE.Euler();
  private scratchVec = new THREE.Vector3();

  constructor(config: GazeTrackingConfig = {}) {
    super();
    this.config = {
      sensitivity: config.sensitivity ?? 1.0,
      stiffness: config.stiffness ?? 90,
      damping: config.damping ?? 12,
      maxHeadYaw: Math.min(Math.PI / 2, config.maxHeadYaw ?? 0.75),
      maxHeadPitch: Math.min(Math.PI / 2, config.maxHeadPitch ?? 0.45),
      pupilSensitivity: config.pupilSensitivity ?? 0.08,
    };

    this.headSpring = new SpringDamper3D(
      { x: 0, y: 0, z: 0 },
      { stiffness: this.config.stiffness, damping: this.config.damping }
    );
    this.pupilSpringL = new SpringDamper3D(
      { x: 0, y: 0, z: 0 },
      { stiffness: this.config.stiffness * 1.5, damping: this.config.damping }
    );
    this.pupilSpringR = new SpringDamper3D(
      { x: 0, y: 0, z: 0 },
      { stiffness: this.config.stiffness * 1.5, damping: this.config.damping }
    );
  }

  update(rig: CatRig, context: AnimationContext): void {
    if (!this.enabled || this.weight <= 0) return;

    const headBone = rig.getBone('head');
    const pupilLBone = rig.getBone('pupilL');
    const pupilRBone = rig.getBone('pupilR');
    const earLBone = rig.getBone('earL');
    const earRBone = rig.getBone('earR');

    if (!headBone) return;

    // 1. Calculate LookAt angles for Head
    headBone.worldMatrix.decompose(this.headWorldPos, this.headWorldQuat, this.headWorldScale);

    const targetPos = context.gaze.worldCoords;
    const angles = LinearTransform.computeLookAtAngles(this.headWorldPos, targetPos, {
      maxYaw: this.config.maxHeadYaw,
      maxPitch: this.config.maxHeadPitch,
    });

    // 2. Smoothly update head spring
    this.headSpring.setTarget({
      x: angles.pitch * this.config.sensitivity,
      y: angles.yaw * this.config.sensitivity,
      z: -angles.yaw * 0.15, // Subtle natural roll when turning
    });
    const smoothedHead = this.headSpring.update(context.dt);

    this.scratchEuler.set(
      smoothedHead.x * this.weight,
      smoothedHead.y * this.weight,
      smoothedHead.z * this.weight,
      'YXZ'
    );
    headBone.setOffset(undefined, this.scratchEuler);

    // 3. Calculate 2D pupil translation within eye sockets
    const normX = context.gaze.screenCoords.x;
    const normY = context.gaze.screenCoords.y;

    const targetPupilX = Math.max(-1, Math.min(1, normX)) * this.config.pupilSensitivity;
    const targetPupilY = Math.max(-1, Math.min(1, normY)) * this.config.pupilSensitivity;

    this.pupilSpringL.setTarget({ x: targetPupilX, y: targetPupilY, z: 0 });
    this.pupilSpringR.setTarget({ x: targetPupilX, y: targetPupilY, z: 0 });

    const smoothedPupilL = this.pupilSpringL.update(context.dt);
    const smoothedPupilR = this.pupilSpringR.update(context.dt);

    if (pupilLBone) {
      this.scratchVec.set(smoothedPupilL.x * this.weight, smoothedPupilL.y * this.weight, 0);
      pupilLBone.setOffset(this.scratchVec);
    }
    if (pupilRBone) {
      this.scratchVec.set(smoothedPupilR.x * this.weight, smoothedPupilR.y * this.weight, 0);
      pupilRBone.setOffset(this.scratchVec);
    }

    // 4. Subtle Ear reaction aligned with gaze direction
    if (earLBone) {
      this.scratchEuler.set(0, 0, (0.15 - smoothedHead.y * 0.2) * this.weight, 'YXZ');
      earLBone.setOffset(undefined, this.scratchEuler);
    }
    if (earRBone) {
      this.scratchEuler.set(0, 0, (-0.15 - smoothedHead.y * 0.2) * this.weight, 'YXZ');
      earRBone.setOffset(undefined, this.scratchEuler);
    }
  }
}
