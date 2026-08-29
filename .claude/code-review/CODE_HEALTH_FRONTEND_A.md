# Code Health Assessment Report: Frontend A

## Robustness & Edge Cases

### [High] Unsafe JSON Parsing in API Client
* **File & Lines:** `src/api/octClient.ts:207-214`
* **Explanation:** The MCP SDK client wrapper attempts to parse the tool response payload via `JSON.parse(textBlock.text)`. Although wrapped in a try/catch, if the payload is completely malformed or missing the expected structure, the code falls back to `data = textBlock.text`. However, if subsequent code assumes `data` is a parsed JSON object (e.g., in `extractBakeMeta`), this can lead to unexpected crashes or undefined behavior when accessing properties of a string.
* **Concrete Refactor:** Validate the output format after parsing, e.g. using `z.safeParse` for Zod schemas or ensuring type guards before continuing processing.

### [High] Missing Error Boundary for Dynamic Import
* **File & Lines:** `src/blocks/ArchDiagram.tsx:7` and `src/blocks/ArchDiagram.tsx:28-36`, `src/blocks/Chart.tsx:10`, `src/blocks/Composite.tsx:17`, `src/blocks/FishTank.tsx:19`, `src/blocks/Scene2d.tsx:8`
* **Explanation:** Several components are dynamically imported using `React.lazy` and wrapped in `<Suspense>`, but lack a wrapping `<ErrorBoundary>`. If the network request for the chunk fails (e.g., due to a deploy while the user has the app open) or the module fails to evaluate, the unhandled error will bubble up and crash the entire React tree up to the nearest error boundary, resulting in a blank screen.
* **Concrete Refactor:** Wrap the `<Suspense>` block in a standard `<ErrorBoundary>` to catch dynamic import failures, providing a graceful fallback (like a retry button or error message) without unmounting the entire parent block.

### [Medium] Potential XSS in Diagram Render
* **File & Lines:** `src/blocks/MermaidDiagram.tsx:78`
* **Explanation:** The `MermaidDiagram` component utilizes `dangerouslySetInnerHTML={{ __html: svg }}` to render the SVG produced by Mermaid. While Mermaid's `securityLevel: "strict"` helps mitigate some risks, if the input `source` (which comes from an external API payload or user prompt) contains malicious payloads that Mermaid's strict mode fails to filter, it could lead to DOM-based XSS.
* **Concrete Refactor:** Introduce an HTML sanitizer like DOMPurify to sanitize the SVG string before injecting it into the DOM via `dangerouslySetInnerHTML`.

## Performance & Resource Efficiency

### [High] Per-Frame Object Allocation in WebGL Render Loop
* **File & Lines:** `src/blocks/FishTankCanvas.tsx:1031, 1032, 1090, 1091, 1253, 1254, 1256`
* **Explanation:** Inside the WebGL canvas, new instances of `THREE.Vector3` are allocated (though some are outside the literal `requestAnimationFrame`, they might be re-created on each component re-render containing the canvas logic). If they are inside the hot path or un-memoized functional components that re-render often, they cause GC pressure and frame drops.
* **Concrete Refactor:** Hoist `THREE.Vector3` instances to module-level scope or use a `useRef` to maintain a single instance across renders, updating their values in place (`.set(x, y, z)` or `.copy()`) during the frame loop.

### [Medium] Redundant useMemo Execution on Fresh Object References
* **File & Lines:** `src/blocks/Chart.tsx:55`, `src/blocks/ProjectGrid.tsx:27`, `src/hooks/useFishTank.ts:42`, `src/routes/HomePage.tsx:58`
* **Explanation:** The `sceneFromLayout` helper function is invoked inside `useMemo` blocks in several places. Because `sceneFromLayout` generates fresh object and array references (e.g., `fish`, `highlightSlugs`) on every invocation, care must be taken. While currently wrapped in `useMemo([layout])`, if `layout` is a volatile object or its parent state causes it to change identity without changing content, this defeats the memoization.
* **Concrete Refactor:** Ensure that the `layout` dependency is strictly deep-equal checked or that `sceneFromLayout` itself caches results based on the layout's internal identity, to prevent cascading re-renders when the `layout` reference is unstable.

## Defensive Programming

### [Medium] Unhandled Local Storage Parsing
* **File & Lines:** `src/store/index.ts:33-47`
* **Explanation:** While the `sanitizePersistedPreferences` function is a great step towards defensive programming, the assumption that `raw` is a dictionary type without verifying its type could still lead to issues. Specifically, if `persistedState` is an array or a primitive (like a string or boolean, if manually edited in DevTools), `raw.theme` or `rawNotifications.errors` might evaluate unexpectedly or throw an error depending on strict mode settings.
* **Concrete Refactor:** Add an explicit check: `if (typeof persistedState !== 'object' || persistedState === null) { return DEFAULT_STATE; }` before casting to `Record<string, unknown>`.

## Maintainability & Design

### [Low] Inconsistent State Management Conventions
* **File & Lines:** `src/store/index.ts`
* **Explanation:** The application mixes `localStorage` persistence for preferences with transient in-memory state for layouts and demo sessions. While explicitly documented, relying on `useFishTankStore.getState()` for imperative reads alongside reactive `useFishTankStore()` hooks breaks standard Zustand idiomatic patterns and makes tracing data flow more complex.
* **Concrete Refactor:** Standardize state reads. For high-frequency updates, the current event bus approach (`mitt`) is good. For discrete state, consistently use reactive Zustand selectors rather than mixing imperative `getState()` calls inside React effects unless strictly required for performance inside an animation frame.
