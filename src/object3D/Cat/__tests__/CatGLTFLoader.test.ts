import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { bindObjectHierarchyToCatRig } from '../mesh/CatGLTFLoader';
import { CatAnimationEngine } from '../animations/CatAnimationEngine';
import { GazeTrackingLayer } from '../animations/GazeTrackingLayer';

describe('CatGLTFLoader Infrastructure', () => {
  it('binds standard Blender Object3D hierarchy to CatRig correctly', () => {
    const root = new THREE.Group();
    root.name = 'root';

    const spine = new THREE.Group();
    spine.name = 'spine';
    root.add(spine);

    const chest = new THREE.Group();
    chest.name = 'chest';
    spine.add(chest);

    const head = new THREE.Group();
    head.name = 'head';
    chest.add(head);

    const eyeL = new THREE.Mesh(new THREE.BufferGeometry());
    eyeL.name = 'eye_l';
    head.add(eyeL);

    const eyeR = new THREE.Mesh(new THREE.BufferGeometry());
    eyeR.name = 'eye_r';
    head.add(eyeR);

    const pupilL = new THREE.Mesh(new THREE.BufferGeometry());
    pupilL.name = 'pupil.l';
    eyeL.add(pupilL);

    const pupilR = new THREE.Mesh(new THREE.BufferGeometry());
    pupilR.name = 'pupil.r';
    eyeR.add(pupilR);

    // Bind hierarchy
    const { rig, boundNodes } = bindObjectHierarchyToCatRig(root);

    expect(boundNodes.has('head')).toBe(true);
    expect(boundNodes.has('eyeL')).toBe(true);
    expect(boundNodes.has('eyeR')).toBe(true);
    expect(boundNodes.has('pupilL')).toBe(true);
    expect(boundNodes.has('pupilR')).toBe(true);

    const headBone = rig.getBone('head');
    expect(headBone).toBeDefined();
    expect(headBone?.targetObject).toBe(head);
  });

  it('updates bound Blender Object3D transforms during animation tick', () => {
    const root = new THREE.Group();
    const head = new THREE.Group();
    head.name = 'head';
    root.add(head);

    const { rig } = bindObjectHierarchyToCatRig(root);

    const engine = new CatAnimationEngine(rig, [
      new GazeTrackingLayer({ sensitivity: 1.0, maxHeadYaw: Math.PI / 2 }),
    ]);

    // Initial position should be at origin
    expect(head.rotation.y).toBe(0);

    // Target placed 45 degrees to the right
    engine.update(0.05, {
      time: 0.1,
      gaze: {
        screenCoords: { x: 0.5, y: 0 },
        worldCoords: new THREE.Vector3(5, 0, 5),
        isHovered: true,
        isActive: false,
      },
    });

    // Verify forward kinematics updated the bound Three.js Object3D rotation
    expect(head.rotation.y).toBeGreaterThan(0);
  });

  it('supports custom user-defined bone name mappings', () => {
    const root = new THREE.Group();
    const customHead = new THREE.Group();
    customHead.name = 'MySpecialCatHead';
    root.add(customHead);

    const { rig, boundNodes } = bindObjectHierarchyToCatRig(root, {
      boneMapping: {
        MySpecialCatHead: 'head',
      },
    });

    expect(boundNodes.get('head')).toBe(customHead);
    expect(rig.getBone('head')?.targetObject).toBe(customHead);
  });
});
