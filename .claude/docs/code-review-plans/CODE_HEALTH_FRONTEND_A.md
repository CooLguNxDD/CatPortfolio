# Code Health Assessment Report: Frontend

## 1. `src/object3D/Cat/math/LinearTransform.ts`
**Priority**: High
**Line Range**: 55-63
**Explanation**: `Math.atan2(delta.x, Math.max(0.001, delta.z))` is mathematically incorrect and introduces a serious logical bug. `delta.z` can be negative (target behind the cat), but `Math.max(0.001, delta.z)` forcibly clamps all negative `delta.z` values to a positive near-zero value (`0.001`). This completely breaks yaw calculation for targets behind the origin, snapping the angle to ±90° immediately instead of correctly resolving the rear hemisphere. Furthermore, the `horizontalDistance` check at the beginning already prevents division by zero for the overall distance, so zero-clamping the components individually breaks vector orientation.
**Concrete Refactor**: Remove the `Math.max` clamping from `atan2`. Change `Math.atan2(delta.x, Math.max(0.001, delta.z))` to `Math.atan2(delta.x, delta.z)`. Do the same for pitch: change `Math.atan2(-delta.y, Math.max(0.001, horizontalDistance))` to `Math.atan2(-delta.y, horizontalDistance)`.

## 2. `src/blocks/FishTankCanvas.tsx`
**Priority**: Medium
**Line Range**: 844-844 (and 839-864)
**Explanation**: In `updateCursorRaycast`, which is called continuously inside the `pointermove` event handler, a new `THREE.Vector3` instance is created every single time: `const vCursor = new THREE.Vector3(pointer.x, pointer.y, 0.5).unproject(camera)`. This introduces unnecessary garbage collection (GC) pressure in a high-frequency interaction loop, which can cause micro-stutters and drop the 60fps render loop optimization.
**Concrete Refactor**: Pre-allocate a persistent `vCursor` vector outside the `updateCursorRaycast` function (e.g., alongside `cursor3D`) and re-use it:
```typescript
const vCursor = new THREE.Vector3()
// inside updateCursorRaycast:
vCursor.set(pointer.x, pointer.y, 0.5).unproject(camera)
```

## 3. `src/object3D/Cat/components/Cat3DView.tsx`
**Priority**: Medium
**Line Range**: 155-157
**Explanation**: Inside the cleanup function of the `useEffect` hook, the code checks `if (container.contains(renderer.domElement)) { container.removeChild(renderer.domElement); }`. However, by the time the cleanup function runs, the `container` might have already been detached from the DOM, or React might have mutated its children. Furthermore, relying on DOM mutation inside React `useEffect` without a strict `ref` verification can lead to unhandled edge cases if the node is already removed.
**Concrete Refactor**: Ensure safe cleanup by strictly validating both the container and the child node. Even better, just rely on `renderer.domElement.remove()` directly.
```typescript
if (renderer.domElement.parentElement === container) {
  container.removeChild(renderer.domElement);
}
// or simply:
renderer.domElement.remove();
```

## 4. `src/object3D/Cat/math/LinearTransform.ts`
**Priority**: Low
**Line Range**: 130-134
**Explanation**: `clampRadialVector` creates a new vector clone regardless of whether it clamps or not: `return vector.clone().multiplyScalar(...)`. This creates unnecessary GC pressure during animation loops where this is called on every frame for the pupils (via `GazeTrackingLayer.ts` which modifies `pupilLBone` offsets).
**Concrete Refactor**: `clampRadialVector` should operate in-place or accept an optional target vector without implicitly returning an intermediate `.clone()`. E.g.: `return vector.clone().multiplyScalar(maxRadius / len);` can be optimized to modifying a passed target vector or strictly returning a new instance without intermediate chaining.

## 5. `src/object3D/Cat/rig/RigBone.ts`
**Priority**: Low
**Line Range**: 116-121
**Explanation**: The `updateMatrices` method recurses down the bone hierarchy. While iterating over children `for (const child of this.children)`, it passes `this.worldMatrix` which triggers redundant allocations if children aren't optimized. But more importantly, the matrix updates use `.multiplyMatrices(parentWorldMatrix, this.localMatrix)` which is correct, but there is no dirty-flagging system. On every frame, every bone recomputes its local and world matrices, even if `setOffset` was not called and the animation is idle.
**Concrete Refactor**: Introduce a `_dirty` flag. `setOffset()` sets `_dirty = true`. In `updateMatrices`, only recalculate `localMatrix` and `worldMatrix` if `_dirty` or `parentDirty` is true, saving redundant matrix multiplications for idle bones (e.g. tail bones when sleeping).
