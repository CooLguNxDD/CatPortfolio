/**
 * PurrReactionLayer.ts
 * Click-reactive purr resonance system featuring harmonic chest micro-vibrations,
 * happy eye squints, ear perking, and haptic feedback.
 */

import * as THREE from 'three';
import { BaseAnimationLayer } from './AnimationLayer';
import type { AnimationContext } from '../rig/types';
import type { CatRig } from '../rig/CatRig';

/** Frequency, amplitude, decay, and start/end callback configuration for the click-triggered purr reaction. */
export interface PurrConfig {
  purrFrequency?: number; // In Hz (typical cat purr is ~25 Hz)
  purrAmplitude?: number; // Micro-oscillation amplitude
  decayRate?: number;     // Exponential decay speed
  duration?: number;      // Total reaction duration in seconds
  onPurrStart?: () => void;
  onPurrEnd?: () => void;
}

/** Procedural animation layer handling the decaying purr vibration, eye squint, ear perk, and haptic pulse triggered by a pet/click. */
export class PurrReactionLayer extends BaseAnimationLayer {
  public readonly name = 'PurrReaction';

  private activePurrIntensity = 0;
  private purrTimer = 0;
  private isPurring = false;

  private config: Required<PurrConfig>;

  constructor(config: PurrConfig = {}) {
    super();
    this.config = {
      purrFrequency: config.purrFrequency ?? 26,
      purrAmplitude: config.purrAmplitude ?? 0.025,
      decayRate: config.decayRate ?? 1.2,
      duration: config.duration ?? 2.8,
      onPurrStart: config.onPurrStart ?? (() => {}),
      onPurrEnd: config.onPurrEnd ?? (() => {}),
    };
  }

  /**
   * Triggers a purr reaction (e.g. on pointer click / pet).
   */
  public triggerPurr(intensity = 1.0): void {
    this.activePurrIntensity = Math.min(1.5, this.activePurrIntensity + intensity);
    this.purrTimer = 0;

    if (!this.isPurring) {
      this.isPurring = true;
      this.config.onPurrStart();

      // Trigger Web Haptics if available in browser
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([30, 20, 30, 20, 40]);
        } catch {
          // Ignore vibration permission denials
        }
      }
    }
  }

  update(rig: CatRig, context: AnimationContext): void {
    if (!this.enabled || this.weight <= 0 || this.activePurrIntensity <= 0.001) {
      if (this.isPurring) {
        this.isPurring = false;
        this.config.onPurrEnd();
      }
      return;
    }

    this.purrTimer += context.dt;
    // Exponential decay of purr impulse
    this.activePurrIntensity = Math.max(
      0,
      this.activePurrIntensity - context.dt * (this.config.decayRate / this.config.duration)
    );

    const chestBone = rig.getBone('chest');
    const headBone = rig.getBone('head');
    const earLBone = rig.getBone('earL');
    const earRBone = rig.getBone('earR');
    const eyelidLBone = rig.getBone('eyelidL');
    const eyelidRBone = rig.getBone('eyelidR');

    // 1. High-frequency Purr Harmonic Oscillator (25 Hz)
    const phase = context.time * this.config.purrFrequency * Math.PI * 2;
    const vibration = Math.sin(phase) * this.config.purrAmplitude * this.activePurrIntensity * this.weight;
    const breathingScale = 1.0 + Math.cos(phase * 0.5) * 0.015 * this.activePurrIntensity * this.weight;

    // 2. Apply to Chest (Purr resonance center)
    if (chestBone) {
      chestBone.setOffset(
        new THREE.Vector3(0, vibration * 0.5, 0),
        undefined,
        new THREE.Vector3(breathingScale, breathingScale, breathingScale)
      );
    }

    // 3. Head micro-vibration
    if (headBone) {
      headBone.setOffset(
        new THREE.Vector3(0, vibration * 0.3, 0)
      );
    }

    // 4. Ear Perking (happy reaction)
    const earPerk = 0.08 * this.activePurrIntensity * this.weight;
    if (earLBone) {
      earLBone.setOffset(
        undefined,
        new THREE.Euler(-earPerk, 0, earPerk * 1.5, 'YXZ')
      );
    }
    if (earRBone) {
      earRBone.setOffset(
        undefined,
        new THREE.Euler(-earPerk, 0, -earPerk * 1.5, 'YXZ')
      );
    }

    // 5. Happy eye squint
    const squintScale = Math.max(0.4, 1.0 - 0.45 * this.activePurrIntensity * this.weight);
    const squintVec = new THREE.Vector3(1, squintScale, 1);
    if (eyelidLBone) eyelidLBone.setOffset(undefined, undefined, squintVec);
    if (eyelidRBone) eyelidRBone.setOffset(undefined, undefined, squintVec);
  }
}
