/**
 * BlinkLayer.ts
 * Stochastic procedural blinking system with eyelid scaling and double-blink probability.
 */

import * as THREE from 'three';
import { BaseAnimationLayer } from './AnimationLayer';
import type { AnimationContext } from '../rig/types';
import type { CatRig } from '../rig/CatRig';

/** Timing and probability configuration for the Poisson-distributed procedural blinking animation. */
export interface BlinkConfig {
  minInterval?: number;       // In seconds (default: 2.5)
  maxInterval?: number;       // In seconds (default: 6.0)
  blinkDuration?: number;     // In seconds (default: 0.18)
  doubleBlinkChance?: number; // Probability [0..1] (default: 0.15)
}

/** Procedural animation layer driving stochastic eyelid blinks, with a chance of a follow-up double blink. */
export class BlinkLayer extends BaseAnimationLayer {
  public readonly name = 'Blink';

  private timer = 0;
  private nextBlinkInterval = 3.0;
  private isBlinking = false;
  private blinkProgress = 0;
  private isDoubleBlink = false;
  private doubleBlinkQueued = false;

  private config: Required<BlinkConfig>;

  constructor(config: BlinkConfig = {}) {
    super();
    this.config = {
      minInterval: config.minInterval ?? 2.5,
      maxInterval: config.maxInterval ?? 6.0,
      blinkDuration: config.blinkDuration ?? 0.18,
      doubleBlinkChance: config.doubleBlinkChance ?? 0.15,
    };
    this.scheduleNextBlink();
  }

  private scheduleNextBlink(): void {
    this.timer = 0;
    this.nextBlinkInterval =
      this.config.minInterval + Math.random() * (this.config.maxInterval - this.config.minInterval);
  }

  public triggerBlink(isDouble = false): void {
    this.isBlinking = true;
    this.blinkProgress = 0;
    this.isDoubleBlink = isDouble;
  }

  update(rig: CatRig, context: AnimationContext): void {
    if (!this.enabled || this.weight <= 0) return;

    const eyelidLBone = rig.getBone('eyelidL');
    const eyelidRBone = rig.getBone('eyelidR');
    const pupilLBone = rig.getBone('pupilL');
    const pupilRBone = rig.getBone('pupilR');

    // 1. Progress blink timer
    if (!this.isBlinking) {
      this.timer += context.dt;
      if (this.timer >= this.nextBlinkInterval) {
        this.triggerBlink(Math.random() < this.config.doubleBlinkChance);
      }
    } else {
      this.blinkProgress += context.dt / this.config.blinkDuration;

      if (this.blinkProgress >= 1.0) {
        this.blinkProgress = 0;
        if (this.isDoubleBlink && !this.doubleBlinkQueued) {
          this.doubleBlinkQueued = true;
          this.isBlinking = true;
        } else {
          this.isBlinking = false;
          this.isDoubleBlink = false;
          this.doubleBlinkQueued = false;
          this.scheduleNextBlink();
        }
      }
    }

    // 2. Compute eyelid closure curve: 0 -> 1 (closed) -> 0 (open)
    let closure = 0;
    if (this.isBlinking) {
      // Smooth sine curve for closing and opening
      closure = Math.sin(this.blinkProgress * Math.PI);
    }

    const scaleY = Math.max(0.05, 1.0 - closure * 0.95 * this.weight);

    // 3. Apply vertical scale to eyelids & pupils
    const eyelidScale = new THREE.Vector3(1, scaleY, 1);

    if (eyelidLBone) eyelidLBone.setOffset(undefined, undefined, eyelidScale);
    if (eyelidRBone) eyelidRBone.setOffset(undefined, undefined, eyelidScale);
    if (pupilLBone) pupilLBone.setOffset(undefined, undefined, eyelidScale);
    if (pupilRBone) pupilRBone.setOffset(undefined, undefined, eyelidScale);
  }
}
