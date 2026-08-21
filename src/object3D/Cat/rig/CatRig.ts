/**
 * CatRig.ts
 * Master Skeletal Hierarchy for the Cat avatar.
 */

import * as THREE from 'three';
import { RigBone } from './RigBone';
import type { BoneName } from './types';

export class CatRig {
  public root: RigBone;
  public bones: Map<BoneName, RigBone> = new Map();

  constructor() {
    // 1. Root and Spine
    this.root = this.createBone('root');
    this.createBone('spine', 'root', {
      initialPosition: new THREE.Vector3(0, 0, 0),
    });
    this.createBone('chest', 'spine', {
      initialPosition: new THREE.Vector3(0, 0.4, 0),
    });

    // 2. Head with Anatomical Constraints
    this.createBone('head', 'chest', {
      initialPosition: new THREE.Vector3(0, 0.55, 0.1),
      pivot: new THREE.Vector3(0, -0.1, 0),
      constraints: {
        minRotation: new THREE.Euler(-0.55, -0.85, -0.3, 'YXZ'), // ~ -31 deg pitch, -48 deg yaw
        maxRotation: new THREE.Euler(0.55, 0.85, 0.3, 'YXZ'),   // ~ +31 deg pitch, +48 deg yaw
        rotationMultiplier: 0.8,
      },
    });

    // 3. Eyes & Pupils
    const eyeSpacing = 0.22;
    const eyeHeight = 0.12;
    const eyeForward = 0.28;

    this.createBone('eyeL', 'head', {
      initialPosition: new THREE.Vector3(-eyeSpacing, eyeHeight, eyeForward),
    });
    this.createBone('eyeR', 'head', {
      initialPosition: new THREE.Vector3(eyeSpacing, eyeHeight, eyeForward),
    });

    this.createBone('eyelidL', 'eyeL', {
      initialScale: new THREE.Vector3(1, 1, 1),
    });
    this.createBone('eyelidR', 'eyeR', {
      initialScale: new THREE.Vector3(1, 1, 1),
    });

    this.createBone('pupilL', 'eyeL', {
      initialPosition: new THREE.Vector3(0, 0, 0.05),
      constraints: {
        maxRadialOffset: 0.07, // Max translation radius in eye socket
        translationMultiplier: 1.0,
      },
    });

    this.createBone('pupilR', 'eyeR', {
      initialPosition: new THREE.Vector3(0, 0, 0.05),
      constraints: {
        maxRadialOffset: 0.07,
        translationMultiplier: 1.0,
      },
    });

    // 4. Ears with Skew / Twitch capabilities
    this.createBone('earL', 'head', {
      initialPosition: new THREE.Vector3(-0.35, 0.45, -0.05),
      initialRotation: new THREE.Euler(0, 0, 0.15, 'YXZ'),
      constraints: {
        minRotation: new THREE.Euler(-0.4, -0.4, -0.3, 'YXZ'),
        maxRotation: new THREE.Euler(0.4, 0.4, 0.5, 'YXZ'),
      },
    });

    this.createBone('earR', 'head', {
      initialPosition: new THREE.Vector3(0.35, 0.45, -0.05),
      initialRotation: new THREE.Euler(0, 0, -0.15, 'YXZ'),
      constraints: {
        minRotation: new THREE.Euler(-0.4, -0.4, -0.5, 'YXZ'),
        maxRotation: new THREE.Euler(0.4, 0.4, 0.3, 'YXZ'),
      },
    });

    // 5. Snout
    this.createBone('snout', 'head', {
      initialPosition: new THREE.Vector3(0, -0.05, 0.32),
    });

    // 6. 7-Segment Tail Chain
    let previousTailBone: BoneName = 'spine';
    for (let i = 0; i < 7; i++) {
      const tailName = `tail${i}` as BoneName;
      this.createBone(tailName, previousTailBone, {
        initialPosition: new THREE.Vector3(0, i === 0 ? 0.1 : 0.15, -0.15),
      });
      previousTailBone = tailName;
    }
  }

  private createBone(
    name: BoneName,
    parentName?: BoneName,
    options?: {
      initialPosition?: THREE.Vector3;
      initialRotation?: THREE.Euler;
      initialScale?: THREE.Vector3;
      pivot?: THREE.Vector3;
      constraints?: any;
    }
  ): RigBone {
    const bone = new RigBone({
      name,
      ...options,
    });

    if (parentName && this.bones.has(parentName)) {
      const parent = this.bones.get(parentName)!;
      parent.addChild(bone);
    }

    this.bones.set(name, bone);
    return bone;
  }

  getBone(name: BoneName): RigBone | undefined {
    return this.bones.get(name);
  }

  /**
   * Resets all bones to their rest positions.
   */
  resetPose(): void {
    for (const bone of this.bones.values()) {
      bone.resetPose();
    }
  }

  /**
   * Evaluates world matrices starting from root.
   */
  update(): void {
    this.root.updateMatrices();
  }
}
