# CODE_HEALTH_FRONTEND_B.md

## Overview
This report details findings from a deep scan of the `src` directory focusing on accessibility (keyboard nav, ARIA, focus states) and state management (data-fetching hooks, store slices, prop drilling).

## Findings

### 1. Missing `type` attribute on `button` tags
- **Priority:** Medium
- **File:** `src/components/chat/ChatPanel.tsx` (Lines: 400-430), `src/components/fish/ShortcutsModal.tsx` (Lines: 60-70), `src/components/fish/FishTankChrome.tsx` (Lines: 104-180), `src/blocks/FishTankCanvas.tsx` (Multiple)
- **Explanation:** React buttons default to `type="submit"` which can cause unintended form submissions if placed near or within forms, or cause unnecessary page reloads. Explicitly defining `type="button"` avoids this behavior.
- **Concrete Refactor:** Add `type="button"` to all `<button>` tags that are not explicitly intended to submit a form. (Example: `<button type="button" onClick={...}>`)

### 2. Missing `.catch(undefined)` on Zod `.optional()` query params
- **Priority:** High
- **File:** `src/api/harness.ts` (Multiple), `src/content/schema.ts` (Multiple)
- **Explanation:** Zod schemas used for URL query parameter parsing in TanStack Router or server API MUST gracefully handle malformed inputs (e.g. `?j=malformed_array`). Without `.catch(undefined)`, an invalid query param will throw a `ZodError`, crashing the route loading process. The memory guidelines explicitly state this requirement.
- **Concrete Refactor:** Update `src/api/harness.ts` and `src/content/schema.ts` schemas that parse query parameters or external unstable input to append `.catch(undefined)` to `.optional()` fields.

### 3. Missing `useShallow` on `usePreferencesStore` selector
- **Priority:** Medium
- **File:** `src/hooks/useThemeTokens.ts` (Line 14), `src/components/fish/FishTankChrome.tsx` (Line 38)
- **Explanation:** When selecting multiple primitive values or an object from a Zustand store without `useShallow`, the component will re-render whenever *any* state in the store changes, even if the selected fields are identical.
- **Concrete Refactor:** Wrap the selector function in `useShallow` or select fields individually. Example: `const { theme } = usePreferencesStore(useShallow(s => ({ theme: s.theme })))`.

### 4. Interactive non-semantic elements missing keyboard support
- **Priority:** High
- **File:** `src/components/fish/FishTankChrome.tsx` (Lines: 104, 119)
- **Explanation:** Divs or spans with `onClick` handlers cannot be focused via keyboard and are not read as interactive elements by screen readers.
- **Concrete Refactor:** If the element acts like a button, change it to a `<button type="button">`. If it must remain a `div` or `span`, add `role="button"`, `tabIndex={0}`, and an `onKeyDown` handler that triggers the action on 'Enter' or 'Space'.

### 5. Potential Stale Closures in `useEffect` Event Listeners
- **Priority:** Medium
- **File:** `src/hooks/useFocusTrap.ts` (Line 42)
- **Explanation:** The `onKeyDown` handler in `useFocusTrap` accesses `containerRef.current`. While refs are stable, the focus logic relies on DOM state that might change.
- **Concrete Refactor:** Ensure dependencies are correct and verify that event listener closures don't capture stale state variables.

### 6. Missing `aria-label` on icon-only buttons
- **Priority:** Low
- **File:** `src/components/fish/FishTankChrome.tsx` (Lines 163-176)
- **Explanation:** Icon buttons without visible text must have an `aria-label` or `title` to communicate their purpose to screen reader users. Some buttons in the chrome rely on emojis.
- **Concrete Refactor:** Add explicit `aria-label` attributes to buttons that primarily use visual icons for meaning (e.g. the sound toggle, circadian toggle).

### 7. Repeated calculation in high-frequency rendering loop
- **Priority:** Medium
- **File:** `src/blocks/FishTankCanvas.tsx` (Lines 1000+)
- **Explanation:** The WebGL `animate` loop performs several object allocations (e.g., vectors for bounding boxes or matrices) that could be hoisted to avoid garbage collection pressure. The memory instructions call this out as a hot path.
- **Concrete Refactor:** Pre-allocate `THREE.Vector3` and `THREE.Matrix4` instances outside the `animate` loop and mutate them in-place within the loop.
