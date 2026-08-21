/**
 * types.ts
 * Type definitions for the Modular Cat Rig & Animation Subsystem.
 */

import * as THREE from 'three';

export type BoneName =
  | 'root'
  | 'spine'
  | 'chest'
  | 'head'
  | 'earL'
  | 'earR'
  | 'eyeL'
  | 'eyeR'
  | 'pupilL'
  | 'pupilR'
  | 'eyelidL'
  | 'eyelidR'
  | 'snout'
  | 'pawL'
  | 'pawR'
  | 'tail0'
  | 'tail1'
  | 'tail2'
  | 'tail3'
  | 'tail4'
  | 'tail5'
  | 'tail6';

export interface BoneConstraints {
  minRotation?: THREE.Euler;
  maxRotation?: THREE.Euler;
  minTranslation?: THREE.Vector3;
  maxTranslation?: THREE.Vector3;
  maxRadialOffset?: number; // for pupils in sockets
  rotationMultiplier?: number;
  translationMultiplier?: number;
}

export interface BoneConfig {
  name: BoneName;
  parent?: BoneName;
  initialPosition?: THREE.Vector3;
  initialRotation?: THREE.Euler;
  initialScale?: THREE.Vector3;
  pivot?: THREE.Vector3;
  constraints?: BoneConstraints;
  targetObject?: THREE.Object3D;
}

export interface GazeTarget {
  screenCoords: { x: number; y: number }; // [-1, 1] NDC or [0, width/height]
  worldCoords: THREE.Vector3;
  isHovered: boolean;
  isActive: boolean;
}

export interface AnimationContext {
  dt: number;
  time: number;
  gaze: GazeTarget;
  camera?: THREE.Camera;
}
