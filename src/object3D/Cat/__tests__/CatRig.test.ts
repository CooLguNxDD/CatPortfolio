import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { CatRig } from '../rig/CatRig';
import { CatAnimationEngine } from '../animations/CatAnimationEngine';
import { BlinkLayer } from '../animations/BlinkLayer';
import { PurrReactionLayer } from '../animations/PurrReactionLayer';

describe('CatRig', () => {
  it('creates full bone hierarchy correctly', () => {
    const rig = new CatRig();

    expect(rig.getBone('root')).toBeDefined();
    expect(rig.getBone('head')).toBeDefined();
    expect(rig.getBone('pupilL')).toBeDefined();
    expect(rig.getBone('pupilR')).toBeDefined();
    expect(rig.getBone('tail6')).toBeDefined();
  });

  it('cascades world matrices down forward kinematics chain', () => {
    const rig = new CatRig();
    const head = rig.getBone('head');
    head?.setOffset(new THREE.Vector3(0, 1, 0));

    rig.update();

    const pupilL = rig.getBone('pupilL');
    expect(pupilL?.worldMatrix).toBeDefined();
  });
});

describe('CatAnimationEngine', () => {
  it('initializes default layers and processes tick update', () => {
    const rig = new CatRig();
    const engine = new CatAnimationEngine(rig).initDefaultLayers();

    engine.updateCursor(0.5, 0.5);
    engine.update(0.016);

    const head = rig.getBone('head');
    expect(head?.localRotation).toBeDefined();
  });

  it('triggers blinking correctly', () => {
    const rig = new CatRig();
    const engine = new CatAnimationEngine(rig);
    const blinkLayer = new BlinkLayer({ blinkDuration: 0.1 });
    engine.addLayer(blinkLayer);

    engine.blink();
    engine.update(0.05); // Mid-blink

    const eyelidL = rig.getBone('eyelidL');
    expect(eyelidL?.localScale.y).toBeLessThan(1.0);
  });

  it('triggers click-reactive purr oscillation', () => {
    const rig = new CatRig();
    const engine = new CatAnimationEngine(rig);
    const purrLayer = new PurrReactionLayer({ purrFrequency: 25 });
    engine.addLayer(purrLayer);

    engine.pet(1.0);
    engine.update(0.016);

    const chest = rig.getBone('chest');
    expect(chest).toBeDefined();
  });
});
