# Frontend Code Health & Refactoring Assessment (Diff Scope)

### [ High ] src/components/fish/FishFlatGrid.tsx (Lines 112-115)
**Explanation:** Accessibility (Keyboard Nav): Custom interactive `<article>` acts as a button but uses `onKeyDown` without ensuring full keyboard accessibility support like 'Space' and 'Enter' are covered correctly by `onClick` and `onKeyDown`. Although `e.key === 'Enter' || e.key === ' '` is checked, the component is missing an `aria-pressed` or `aria-expanded` and proper focus states, or even better, a `<button>` wrapper around the content.

**Concrete Refactor:** Replace `<article role="button" ...>` with an interactive element (e.g. `<button>`) or wrap the content in one. Alternatively, if a card must be clickable, use a semantic link/button inside the `<article>` stretched with CSS.

---

### [ Medium ] src/hooks/useFishTank.ts (Lines 59-98)
**Explanation:** State Management / Robustness: Setting up multiple listeners manually on the event bus (`fishBus.on(...)`) with explicit cleanup can be error-prone and leaky if exceptions occur during component lifecycle or if the bus reference changes. Additionally, `useFishTankStore.getState` is accessed inside the effect instead of using stable bounded action references from the store.

**Concrete Refactor:** Use a custom hook to manage bus subscriptions to abstract `fishBus.on` / `fishBus.off`, or group the handlers into a single robust event handler loop.

---

### [ Medium ] src/store/fishTankSlice.ts (Lines 88)
**Explanation:** State Management: `createDiveAnimator` is instantiated during slice creation. Zustands stores are often created once per module load. While this works, if the store is ever re-created (like in tests) or if SSR comes into play, creating instances in `createFishTankSlice` could cause lifecycle mismatches or leaks.

**Concrete Refactor:** Inject `animator` into the store, or instantiate it lazily/externally and manage its lifecycle separately.

---

### [ Medium ] src/components/FishTankStage.tsx (Lines 41-43)
**Explanation:** Accessibility (Focus): Pressing 'Escape' releases the focused slug, but there's no programmatic focus return to the previously focused element (e.g., the fish item that was clicked). Screen reader / keyboard users lose their place in the DOM.

**Concrete Refactor:** Capture `document.activeElement` when a slug is focused, and restore focus to it when 'Escape' is pressed or the dossier is closed.

---

### [ Low ] src/blocks/FishTankCanvas.tsx (Lines 250-255)
**Explanation:** Performance: Using raw string searches or excessive `getElementById` / `getObjectByName` in the `useFrame` or rendering loop causes redundant tree traversal. Here `getObjectByName('paw')`, `getObjectByName('cat_tail')` etc., are being called inside `animate` loop.

**Concrete Refactor:** Cache references to named objects (like `paw`, `cat_tail`, `eyeL`) outside the animation loop during object initialization.

---
