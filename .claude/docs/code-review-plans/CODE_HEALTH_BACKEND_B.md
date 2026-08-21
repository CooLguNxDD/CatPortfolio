# Diff-Scoped Code Review Report: `main...HEAD`

This report analyzes the changes introduced on the current branch relative to `main` for security, robustness, performance, defensive programming, maintainability, and data-access boundaries.

### 1. Silent failure when swallowing PointerCapture exceptions
- **Priority**: Medium
- **File & Line Range**: `src/blocks/FishTankCanvas.tsx` (Lines 910-914, 920-924)
- **Explanation**: The code adds a try/catch block around `setPointerCapture` and `releasePointerCapture` but completely swallows the exception (`/* ignore */`). While some browsers might throw `InvalidPointerId` if the pointer was already cancelled, silently swallowing errors makes debugging extremely difficult and hides potential state synchronization issues where the application thinks it has pointer capture but actually doesn't.
- **Concrete Refactor**: Catch the error and log it using `console.warn` so developers are aware of missed capture events, while still preventing the app from crashing.
  ```typescript
  try {
    renderer.domElement.setPointerCapture?.(e.pointerId)
  } catch (err) {\n    console.warn("Failed to set pointer capture:", err);
  }
  ```

### 2. Swallow Exception in Web Haptics
- **Priority**: Low
- **File & Line Range**: `src/object3D/Cat/animations/PurrReactionLayer.ts` (Lines 55-59)
- **Explanation**: A permission denial for `navigator.vibrate` is silently caught and ignored. While it is true that many browsers deny this without user interaction, silently swallowing makes debugging missing haptics difficult. 
- **Concrete Refactor**: Similar to the above, add a debug or console warning.
  ```typescript
  try {
    navigator.vibrate([30, 20, 30, 20, 40]);
  } catch (err) {
    console.debug("Vibration permission denied or unsupported:", err);
  }
  ```

### 3. Redundant Math Object Instantiation
- **Priority**: Low
- **File & Line Range**: `src/blocks/FishTankCanvas.tsx` (Lines 842, 843, 853)
- **Explanation**: Inside `updateCursorRaycast` (called heavily on `pointermove` and render loops), `THREE.Vector3` instances or multiple variables are allocated per call instead of reusing module-scoped or class-scoped vector objects. For high-frequency events, this causes unnecessary garbage collection pressure.
- **Concrete Refactor**: Pre-allocate a global or closure-scoped `THREE.Vector3` for calculation and use `.set()` or `.copy()` to update it without new allocations.
  ```typescript
  const vCursor = new THREE.Vector3(); // allocate outside the hot loop
  // inside loop:
  vCursor.set(pointer.x, pointer.y, 0.5).unproject(camera);
  ```

### 4. Component Unmount Event Listener Memory Leak
- **Priority**: Medium
- **File & Line Range**: `src/blocks/FishTankCanvas.tsx` (Lines 1045-1046, 1706-1707)
- **Explanation**: The branch introduces `window.addEventListener("pointerleave", onPointerLeave)` and `window.addEventListener("pointermove", onPointerMove)` in the canvas setup. While they are properly removed in the teardown, binding directly to `window` for pointer events instead of the scoped `renderer.domElement` or `containerRef` risks capturing global events unnecessarily, which degrades performance across the entire page, not just the canvas.
- **Concrete Refactor**: Bind these events strictly to the `renderer.domElement` or parent container, or only attach to `window` *during* a drag operation and remove immediately on release.
  ```typescript
  renderer.domElement.addEventListener("pointerleave", onPointerLeave);
  renderer.domElement.addEventListener("pointermove", onPointerMove);
  ```

### 5. Division by Zero Risk in Math Calculation
- **Priority**: Medium
- **File & Line Range**: `src/object3D/Cat/animations/GazeTrackingLayer.ts` (Lines 129, 134)
- **Explanation**: In `Math.atan2(delta.x, Math.max(0.001, delta.z))`, there is a defensive programming pattern `Math.max(0.001, ...)`. However, in `Math.atan2(-delta.y, Math.max(0.001, horizontalDistance))`, if `horizontalDistance` is exactly `0`, the logic assumes `0.001`. The calculation `Math.hypot(delta.x, delta.z)` can be exactly zero if both are zero. A tiny epsilon prevents a NaN but slightly biases the vector.
- **Concrete Refactor**: If the horizontal distance is zero, simply early return or set rotation directly to prevent weird snapping to the z-epsilon.
  ```typescript
  if (horizontalDistance < 0.0001 && Math.abs(delta.y) < 0.0001) return;
  ```

### 6. Missing Strict Null Checks for Gaze Targets
- **Priority**: Low
- **File & Line Range**: `src/object3D/Cat/mesh/catGiantMesh.ts` (Lines 597)
- **Explanation**: `targetPos !== null && targetPos.y > catWorldPos.y - 18` allows undefined values if `targetPos` happens to be undefined instead of null.
- **Concrete Refactor**: Use optional chaining or strict type guards.
  ```typescript
  const targetHunt = isHunting || (targetPos?.y ?? -Infinity) > catWorldPos.y - 18 ? 1 : 0;
  ```
