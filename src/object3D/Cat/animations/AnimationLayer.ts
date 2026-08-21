/**
 * AnimationLayer.ts
 * Base interface and class for modular animation layers.
 */

import type { AnimationContext } from '../rig/types';
import type { CatRig } from '../rig/CatRig';

export interface IAnimationLayer {
  name: string;
  enabled: boolean;
  weight: number; // Blending weight [0..1]
  init?(rig: CatRig): void;
  update(rig: CatRig, context: AnimationContext): void;
  dispose?(): void;
}

export abstract class BaseAnimationLayer implements IAnimationLayer {
  public abstract name: string;
  public enabled = true;
  public weight = 1.0;

  init(_rig: CatRig): void {}
  abstract update(rig: CatRig, context: AnimationContext): void;
  dispose(): void {}
}
