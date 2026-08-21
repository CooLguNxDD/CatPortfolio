/**
 * CatAnimationEngine.ts
 * Master Animation Engine orchestrating modular animation layers and forward kinematics.
 */

import * as THREE from 'three';
import { CatRig } from '../rig/CatRig';
import type { AnimationContext, GazeTarget } from '../rig/types';
import type { IAnimationLayer } from './AnimationLayer';
import { GazeTrackingLayer } from './GazeTrackingLayer';
import { BlinkLayer } from './BlinkLayer';
import { PurrReactionLayer } from './PurrReactionLayer';
import { BreathingLayer } from './BreathingLayer';

export class CatAnimationEngine {
  public rig: CatRig;
  private layers: Map<string, IAnimationLayer> = new Map();
  private elapsedTime = 0;

  public gazeTarget: GazeTarget = {
    screenCoords: { x: 0, y: 0 },
    worldCoords: new THREE.Vector3(0, 0, 5),
    isHovered: false,
    isActive: true,
  };

  public gazePlane?: { x?: number; y?: number; z?: number };

  constructor(
    rig?: CatRig,
    layers?: IAnimationLayer[],
    gazePlane?: { x?: number; y?: number; z?: number }
  ) {
    this.rig = rig ?? new CatRig();
    this.gazePlane = gazePlane;
    if (layers) {
      for (const layer of layers) {
        this.addLayer(layer);
      }
    }
  }

  /**
   * Initializes default standard layers.
   */
  public initDefaultLayers(): this {
    this.addLayer(new GazeTrackingLayer());
    this.addLayer(new BlinkLayer());
    this.addLayer(new PurrReactionLayer());
    this.addLayer(new BreathingLayer());
    return this;
  }

  public addLayer(layer: IAnimationLayer): this {
    if (layer.init) {
      layer.init(this.rig);
    }
    this.layers.set(layer.name, layer);
    return this;
  }

  public removeLayer(name: string): boolean {
    const layer = this.layers.get(name);
    if (layer) {
      if (layer.dispose) layer.dispose();
      return this.layers.delete(name);
    }
    return false;
  }

  public getLayer<T extends IAnimationLayer>(name: string): T | undefined {
    return this.layers.get(name) as T | undefined;
  }

  public setLayerEnabled(name: string, enabled: boolean): void {
    const layer = this.layers.get(name);
    if (layer) layer.enabled = enabled;
  }

  public setLayerWeight(name: string, weight: number): void {
    const layer = this.layers.get(name);
    if (layer) layer.weight = Math.max(0, Math.min(1, weight));
  }

  /**
   * Update Gaze cursor position.
   */
  public updateCursor(
    screenX: number,
    screenY: number,
    worldCoords?: THREE.Vector3
  ): void {
    this.gazeTarget.screenCoords.x = screenX;
    this.gazeTarget.screenCoords.y = screenY;
    if (worldCoords) {
      this.gazeTarget.worldCoords.copy(worldCoords);
    } else {
      // Default projection plane in front of cat
      this.gazeTarget.worldCoords.set(
        screenX * (this.gazePlane?.x ?? 2.5),
        screenY * (this.gazePlane?.y ?? 2.0),
        this.gazePlane?.z ?? 3.5
      );
    }
  }

  /**
   * Triggers a purr / pet reaction.
   */
  public pet(intensity = 1.0): void {
    const purrLayer = this.getLayer<PurrReactionLayer>('PurrReaction');
    if (purrLayer) {
      purrLayer.triggerPurr(intensity);
    }
  }

  /**
   * Triggers an immediate blink.
   */
  public blink(isDouble = false): void {
    const blinkLayer = this.getLayer<BlinkLayer>('Blink');
    if (blinkLayer) {
      blinkLayer.triggerBlink(isDouble);
    }
  }

  /**
   * Evaluates one frame of animation.
   */
  public update(dt: number, cameraOrContext?: THREE.Camera | Partial<AnimationContext>): void {
    this.elapsedTime += dt;

    let context: AnimationContext;
    if (cameraOrContext && !(cameraOrContext as any).isCamera) {
      const custom = cameraOrContext as Partial<AnimationContext>;
      context = {
        dt,
        time: custom.time ?? this.elapsedTime,
        gaze: custom.gaze ?? this.gazeTarget,
        camera: custom.camera,
      };
    } else {
      context = {
        dt,
        time: this.elapsedTime,
        gaze: this.gazeTarget,
        camera: cameraOrContext as THREE.Camera | undefined,
      };
    }

    // 1. Reset all bones to rest pose before accumulating layers
    this.rig.resetPose();

    // 2. Evaluate all active animation layers
    for (const layer of this.layers.values()) {
      if (layer.enabled && layer.weight > 0) {
        layer.update(this.rig, context);
      }
    }

    // 3. Compute Forward Kinematic world transformation matrices
    this.rig.update();
  }

  public dispose(): void {
    for (const layer of this.layers.values()) {
      if (layer.dispose) layer.dispose();
    }
    this.layers.clear();
  }
}
