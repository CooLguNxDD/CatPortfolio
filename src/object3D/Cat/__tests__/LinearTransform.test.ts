import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { LinearTransform } from '../math/LinearTransform';
import { SpringDamper1D, SpringDamper3D } from '../math/SpringDamper';

describe('LinearTransform', () => {
  it('clamps angles correctly within bounds', () => {
    expect(LinearTransform.clampAngle(0.5, -1, 1)).toBeCloseTo(0.5);
    expect(LinearTransform.clampAngle(1.5, -1, 1)).toBeCloseTo(1.0);
    expect(LinearTransform.clampAngle(-2.5, -1, 1)).toBeCloseTo(-1.0);
  });

  it('computes look-at Euler angles from origin to target', () => {
    const origin = new THREE.Vector3(0, 0, 0);
    const target = new THREE.Vector3(1, 0, 1);
    const angles = LinearTransform.computeLookAtAngles(origin, target);

    // 45 degrees yaw around Y
    expect(angles.yaw).toBeCloseTo(Math.PI / 4, 2);
    expect(angles.pitch).toBeCloseTo(0, 2);
  });

  it('remains strictly continuous across the horizontal centerline without branch-cut snapping', () => {
    const origin = new THREE.Vector3(0, 0, 0);
    // Test points crossing from slightly above to slightly below the negative horizontal axis
    const targetAbove = new THREE.Vector3(-10, -0.01, 0);
    const targetBelow = new THREE.Vector3(-10, 0.01, 0);

    const anglesAbove = LinearTransform.computeLookAtAngles(origin, targetAbove);
    const anglesBelow = LinearTransform.computeLookAtAngles(origin, targetBelow);

    // Difference in yaw across the centerline should be near 0 (no +/- 180 snap)
    expect(Math.abs(anglesAbove.yaw - anglesBelow.yaw)).toBeLessThan(0.01);
    // Difference in pitch across the centerline should be small and continuous
    expect(Math.abs(anglesAbove.pitch - anglesBelow.pitch)).toBeLessThan(0.01);

    // Test continuity across delta.z = 0
    const targetZPositive = new THREE.Vector3(1, 0, 0.01);
    const targetZNegative = new THREE.Vector3(1, 0, -0.01);

    const anglesZPositive = LinearTransform.computeLookAtAngles(origin, targetZPositive);
    const anglesZNegative = LinearTransform.computeLookAtAngles(origin, targetZNegative);

    // Yaw should remain continuous as it sweeps across z = 0
    expect(Math.abs(anglesZPositive.yaw - anglesZNegative.yaw)).toBeLessThan(0.1);
  });

  it('strictly limits rotation angular to max +-90 degrees (+-PI/2 rad)', () => {
    const origin = new THREE.Vector3(0, 0, 0);
    // Extreme coordinates far left, far right, far top, far bottom, and behind
    const extremeTargets = [
      new THREE.Vector3(1000, 0, 0.001),   // Far right
      new THREE.Vector3(-1000, 0, 0.001),  // Far left
      new THREE.Vector3(0, 1000, 0.001),   // Far up
      new THREE.Vector3(0, -1000, 0.001),  // Far down
      new THREE.Vector3(500, 500, -500),   // Behind top right
      new THREE.Vector3(-500, -500, -500), // Behind bottom left
    ];

    const maxLimit = Math.PI / 2 + 1e-6;

    for (const target of extremeTargets) {
      const angles = LinearTransform.computeLookAtAngles(origin, target);
      expect(Math.abs(angles.yaw)).toBeLessThanOrEqual(maxLimit);
      expect(Math.abs(angles.pitch)).toBeLessThanOrEqual(maxLimit);
      expect(Math.abs(angles.roll)).toBeLessThanOrEqual(maxLimit);
    }
  });

  it('smoothly relaxes to neutral without insane shaking when target is behind the cat (z < 0)', () => {
    const origin = new THREE.Vector3(0, 0, 0);
    // When camera turns behind the cat and cursor sweeps across x = -5 to x = +5 at z = -10
    for (let x = -5; x <= 5; x += 0.5) {
      const target = new THREE.Vector3(x, 0, -10);
      const angles = LinearTransform.computeLookAtAngles(origin, target);
      // Gaze should be smoothly relaxed near 0 (no extreme snap or wild oscillation)
      expect(Math.abs(angles.yaw)).toBeLessThan(0.1);
      expect(Math.abs(angles.pitch)).toBeLessThan(0.1);
    }
  });

  it('composes affine transformation matrix with pivot', () => {
    const pos = new THREE.Vector3(10, 20, 30);
    const rot = new THREE.Euler(0, 0, 0);
    const scale = new THREE.Vector3(1, 1, 1);
    const pivot = new THREE.Vector3(2, 2, 2);

    const m = LinearTransform.composeMatrix(pos, rot, scale, pivot);
    const outPos = new THREE.Vector3();
    m.decompose(outPos, new THREE.Quaternion(), new THREE.Vector3());

    expect(outPos.x).toBeCloseTo(10);
    expect(outPos.y).toBeCloseTo(20);
    expect(outPos.z).toBeCloseTo(30);
  });

  it('clamps radial vectors within maximum socket radius', () => {
    const v = new THREE.Vector2(10, 0);
    const clamped = LinearTransform.clampRadialVector(v, 2);
    expect(clamped.length()).toBeCloseTo(2);
    expect(clamped.x).toBeCloseTo(2);
    expect(clamped.y).toBeCloseTo(0);
  });
});

describe('SpringDamper', () => {
  it('interpolates towards target smoothly', () => {
    const spring = new SpringDamper1D(0, { stiffness: 100, damping: 10 });
    spring.target = 5;

    for (let i = 0; i < 30; i++) {
      spring.update(0.016);
    }

    expect(spring.value).toBeGreaterThan(0);
    expect(spring.value).toBeLessThan(7);
  });

  it('handles 3D spring dampening and impulse', () => {
    const spring3D = new SpringDamper3D();
    spring3D.setTarget({ x: 1, y: 2, z: 3 });
    const res = spring3D.update(0.016);

    expect(typeof res.x).toBe('number');
    expect(typeof res.y).toBe('number');
    expect(typeof res.z).toBe('number');
  });
});
