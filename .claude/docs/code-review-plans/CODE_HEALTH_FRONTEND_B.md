# Frontend Code Health Report

This report summarizes findings from a diff-scoped review (`main...HEAD`), focusing on accessibility, performance, and state management.

## 1. High Priority: WebGL Context Thrashing via Unstable Callback Dependency
**File:** `src/object3D/Cat/components/Cat3DView.tsx`
**Line Range:** 35 - 160 (specifically `useEffect` dependency array on line 160)
**Explanation:** The `useEffect` that initializes the entire Three.js scene, renderer, and animation loop depends on `onPurr`. In `CatDOMCompanion.tsx`, `onPurr={() => setPurrCount((c) => c + 1)}` is passed as an inline anonymous function. This creates a new function reference on every re-render of `CatDOMCompanion`, causing the `useEffect` in `Cat3DView` to unmount and remount. This leads to continuous WebGL context creation/destruction, memory leaks, and severe stuttering, completely thrashing the page.
**Concrete Refactor:**
Remove `onPurr` from the `useEffect` dependency array and use a mutable ref to store the latest callback to avoid re-triggering the effect.

```tsx
// In Cat3DView.tsx
const onPurrRef = useRef(onPurr);
useEffect(() => {
  onPurrRef.current = onPurr;
}, [onPurr]);

useEffect(() => {
  // ... initialization ...
  const purrLayer = engine.getLayer<PurrReactionLayer>('PurrReaction');
  if (purrLayer) {
    (purrLayer as any).config.onPurrStart = () => {
      setIsPurring(true);
      if (onPurrRef.current) onPurrRef.current();
    };
    // ...
  }
  // ...
}, [scale, sensitivity, interactive]); // Removed onPurr
```

## 2. High Priority: Global Layout Thrashing in Pointer Events
**File:** `src/object3D/Cat/components/Cat3DView.tsx`
**Line Range:** 92 - 117
**Explanation:** Inside `handlePointerMove`, which fires at a high frequency (often 60+ Hz), `container.getBoundingClientRect()` is called synchronously. This forces the browser to recalculate global layout and styles on every cursor movement, leading to extreme main-thread jank. The bounding client rect should be cached and updated via `ResizeObserver` or window scrolling events instead.
**Concrete Refactor:**
Cache the dimensions and update them inside the existing `ResizeObserver`.

```tsx
// Inside useEffect:
const rectCache = useRef({ left: 0, top: 0, width: 300, height: 300 });

// Update in ResizeObserver:
const resizeObserver = new ResizeObserver((entries) => {
  for (const entry of entries) {
    // ...
    const rect = container.getBoundingClientRect();
    rectCache.current = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
  }
});

// In handlePointerMove:
const handlePointerMove = (e: PointerEvent) => {
  if (!interactive) return;
  const rect = rectCache.current;
  const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
  // ...
};
```

## 3. Medium Priority: Missing Keyboard Interactions & ARIA on Interactive Canvas
**File:** `src/object3D/Cat/components/Cat3DView.tsx`
**Line Range:** 162 - 173
**Explanation:** The main return block renders a `div` that responds to click events (to pet the cat), but it lacks keyboard support (`tabIndex`, `onKeyDown`) and a semantic ARIA role. Screen reader users and keyboard-only navigators have no way to interact with or understand that the cat can be petted.
**Concrete Refactor:**
Add `tabIndex={0}`, `role="button"`, `aria-label="Interactive 3D Cat"`, and a keyboard handler.

```tsx
// In Cat3DView.tsx
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    containerRef.current?.dispatchEvent(new MouseEvent('click'));
  }
};

return (\n  <div\n    ref={containerRef}\n    className={`relative select-none overflow-hidden focus-visible:ring-2 focus-visible:ring-amber-400 ${className}`}\n    style={{ width, height }}\n    tabIndex={interactive ? 0 : -1}\n    role=\"button\"\n    aria-label=\"Interactive 3D Cat. Click or press Enter to pet.\"\n    onKeyDown={interactive ? handleKeyDown : undefined}\n  >\n    {/* ... */}\n  </div>\n);
```

## 4. Medium Priority: Non-Touch-Friendly Dragging and Poor Labeling
**File:** `src/object3D/Cat/components/CatDOMCompanion.tsx`
**Line Range:** 24 - 51, 68 - 73
**Explanation:** The dragging logic relies strictly on `mousedown`, `mousemove`, and `mouseup` events, meaning the companion cannot be dragged on touch devices. Furthermore, the toggle button in the header simply displays `−` or `+` with no `aria-label`, making it inaccessible to screen readers.
**Concrete Refactor:**
Migrate mouse events to pointer events for unified input handling, and add an `aria-label` to the button.

```tsx
// Change handleMouseDown to handlePointerDown
const handlePointerDown = (e: React.PointerEvent) => {
  setIsDragging(true);
  (e.target as HTMLElement).setPointerCapture(e.pointerId);
  // ...
};

// Use pointermove and pointerup inside useEffect:
window.addEventListener('pointermove', handlePointerMove);
window.addEventListener('pointerup', handlePointerUp);

// In the render for the toggle button:
<button
  onClick={() => setIsOpen(!isOpen)}
  className="text-neutral-400 hover:text-white transition-colors"
  aria-expanded={isOpen}
  aria-label={isOpen ? "Collapse companion" : "Expand companion"}
>
  {isOpen ? '−' : '+'}
</button>
```

## 5. Low Priority: Stale Pointer State Resurrection Bug
**File:** `src/blocks/FishTankCanvas.tsx`
**Line Range:** 1038 - 1045
**Explanation:** The newly added `onPointerLeave` handler resets `hasCursor3D = false`, but it does not reset `hasPointer = false`. If the pointer leaves the window and then `updateCursorRaycast()` is called (e.g. by an autonomous camera movement event `camera:move` which invokes `updateCursorRaycast()`), it will see `hasPointer = true` and attempt to use stale `pointer.x` / `pointer.y` coordinates to project a phantom 3D cursor.
**Concrete Refactor:**
Set `hasPointer = false` when the pointer leaves the viewport.

```tsx
function onPointerLeave() {
  hasCursor3D = false;
  hasPointer = false;
}
```
