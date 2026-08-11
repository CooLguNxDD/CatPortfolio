# Frontend Code Health Assessment (Main -> HEAD)

This report provides a diff-scoped review of frontend changes (Main -> HEAD), focusing on robustness, performance, defensive programming, and maintainability.

### 1. [Medium Priority] Object Re-allocation in `requestAnimationFrame` Loop
- **File**: `src/blocks/FishTankCanvas.tsx`
- **Line Range**: 803-808, 824-827
- **Explanation**: Inside `animate()`, there are iterations like `spineSegments.forEach` and `tentacles.forEach` inside `fishObjs.forEach((o) => { ... })`. Iterating arrays using higher-order functions like `.forEach` or `.map` inside a `requestAnimationFrame` loop creates new closure scopes and function allocations on every frame, which can cause GC pressure and frame drops in a WebGL scene. A traditional `for` loop is more efficient for hot paths.
- **Refactor**: Replace `.forEach` calls inside the `animate()` loop with traditional `for` loops. Cache array lengths to prevent repeated property access.

### 2. [Low Priority] Redundant Arrays Created in Raycaster Intersect
- **File**: `src/blocks/FishTankCanvas.tsx`
- **Line Range**: 595-598
- **Explanation**: In `onClick` inside the canvas hook, `fishObjs.map((o) => o.mesh)` creates a new array on every click event before passing it to `raycaster.intersectObjects()`. While not in the hot render loop, it is unnecessary allocation. Since `fishObjs` is tied to `fish` state, we can compute an array of `meshes` once when `fishObjs` changes.
- **Refactor**: Pre-compute and store an array of meshes alongside `fishObjs`, e.g., `const meshes = fishObjs.map(o => o.mesh)`, and pass `meshes` to `raycaster.intersectObjects(meshes, true)`.

### 3. [Medium Priority] Potential Stale Closure in `navigate` Callbacks
- **File**: `src/routes/HomePage.tsx`
- **Line Range**: 75-81, 82-90
- **Explanation**: The event listeners for `fish:pick` and `fish:release` use `navigate` with a functional state update `(prev) => ({ ...prev, f: slug })`. However, `navigate` in TanStack Router does not inherently guarantee `prev` is fully up-to-date query parameters if the router transition is not yet committed. Fortunately, TanStack Router's `search` property accepts a function. But the `f` param could be manipulated in a way that race conditions occur if events fire rapidly.
- **Refactor**: Ensure safe casting. Instead of `(prev || {}) as DemoSearch`, explicitly merge with `search` from `useSearch()` or ensure robust handling of undefined parameters.

### 4. [Medium Priority] Memory Leak / Multiple Bus Listeners on Re-renders
- **File**: `src/hooks/useFishTank.ts`
- **Line Range**: 44-87
- **Explanation**: In `useFishTank`, `fishBus.on` is used inside a `useEffect` with an empty dependency array. This means that if `useFishTank` is used by multiple components (e.g. `FishTankStage` and `FishDossier`), the events like `tank:dive` will trigger `store().dive()` multiple times. The hook should ensure these bus listeners are not duplicated across the application.
- **Refactor**: Move the global event bus listeners out of the hook and into a higher-level provider, or have the store initialize them once.

### 5. [Low Priority] Unnecessary Render Triggers from Location State
- **File**: `src/App.tsx`
- **Line Range**: 47-50
- **Explanation**: In `App.tsx`, `liveSearch` uses `useRouterState` with a select function returning an object: `(s) => (s.location.search as DemoSearch | undefined) ?? {}`. Returning a new object literal `?? {}` causes the selector to return a new reference on every check if `location.search` is missing or undefined, breaking memoization and causing unnecessary re-renders of the root `App` component.
- **Refactor**: Declare a constant empty object outside the component (`const EMPTY_SEARCH = {}`) and use it in the selector: `(s) => (s.location.search as DemoSearch | undefined) ?? EMPTY_SEARCH`.

### 6. [Low Priority] Missing Error Boundaries on Lazy Loaded Components
- **File**: `src/blocks/FishTank.tsx`
- **Line Range**: 18, 102-114
- **Explanation**: `FishTankCanvas` is lazy loaded, and wrapped in `Suspense`. While there is an error boundary higher up in `HomePage.tsx` (`FishTankErrorBoundary`), if this block is used standalone, a loading error in `FishTankCanvas` might crash the immediate parent if it lacks its own error boundary.
- **Refactor**: Wrap the `Suspense` block inside a localized `ErrorBoundary`.
