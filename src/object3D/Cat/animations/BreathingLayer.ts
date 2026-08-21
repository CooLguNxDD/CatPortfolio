/**
 * BreathingLayer.ts
 * Harmonic idle breathing and procedural 7-segment tail wave ripple.
 */

import * as THREE from 'three';
import { BaseAnimationLayer } from './AnimationLayer';
import type { AnimationContext } from '../rig/types';
import type { CatRig } from '../rig/CatRig';

export interface BreathingConfig {
  bpm?: number;            // Breaths per minute (default: 16)
  chestAmplitude?: number; // Expansion amplitude
  tailWaveSpeed?: number;  // Tail ripple speed
  tailWaveAmplitude?: number;
}

export class BreathingLayer extends BaseAnimationLayer {
  public readonly name = 'Breathing';

  private config: Required<BreathingConfig>;

  constructor(config: BreathingConfig = {}) {
    super();
    this.config = {
      bpm: config.bpm ?? 16,
      chestAmplitude: config.chestAmplitude ?? 0.02,
      tailWaveSpeed: config.tailWaveSpeed ?? 1.8,
      tailWaveAmplitude: config.tailWaveAmplitude ?? 0.15,
    };
  }

  update(rig: CatRig, context: AnimationContext): void {
    if (!this.enabled || this.weight <= 0) return;

    const chestBone = rig.getBone('chest');
    const headBone = rig.getBone('head');

    // 1. Compute Breathing Sine
    const breathFreq = (this.config.bpm / 60) * Math.PI * 2;
    const breathCycle = Math.sin(context.time * breathFreq);

    // 2. Expand Chest
    if (chestBone) {
      const scaleVal = 1.0 + breathCycle * this.config.chestAmplitude * this.weight;
      chestBone.setOffset(
        new THREE.Vector3(0, breathCycle * 0.008 * this.weight, 0),
        undefined,
        new THREE.Vector3(scaleVal, scaleVal, scaleVal)
      );
    }

    // 3. Subtle Head Bobbing
    if (headBone) {
      headBone.setOffset(
        new THREE.Vector3(0, breathCycle * 0.004 * this.weight, 0)
      );
    }

    // 4. Propagate Sinusoidal Travelling Wave down 7 Tail Segments
    for (let i = 0; i < 7; i++) {
      const tailSegment = rig.getBone(`tail${i}` as any);
      if (tailSegment) {
        // Phase delay along the tail creates a natural serpentine wave
        const wave = Math.sin(context.time * this.config.tailWaveSpeed - i * 0.5);
        const angle = wave * this.config.tailWaveAmplitude * (0.5 + (i / 7) * 0.5) * this.weight;
        tailSegment.setOffset(
          undefined,
          new THREE.Euler(angle * 0.4, angle, 0, 'YXZ')
        );
      }
    }
  }
}
