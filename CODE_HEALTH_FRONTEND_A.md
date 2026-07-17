# Frontend Code Health & Refactoring Assessment

## 1. Theme Provider CSS Variable Leak
- **Priority:** High
- **File:** `src/components/ThemeProvider.tsx`
- **Lines:** 18-24
- **Explanation:** The `useEffect` that synchronizes theme variables to the document root only iterates over and sets the variables present in the currently selected theme. It does not clean up CSS variables injected by previously active themes. If a user toggles from a theme with many custom variables to a simpler theme with fewer variables, the residual CSS variables will leak, potentially causing unpredictable layout or color side effects.
- **Concrete Refactor:** Track the previously injected CSS variable keys using a `useRef`. Before applying a new theme's variables, iterate over the stored keys and explicitly remove them using `root.style.removeProperty(key)`.

## 2. Missing Error Boundary in Dynamic Layout Renderer
- **Priority:** High
- **File:** `src/render/LayoutRenderer.tsx`
- **Lines:** 13-25
- **Explanation:** The layout renderer maps over dynamic data blocks and resolves them to React components via `REGISTRY`. There is no React Error Boundary wrapping these dynamically rendered blocks. If a block component encounters an unhandled runtime error (e.g. attempting to access a missing nested prop that bypassed strict schema validation), the exception will propagate up and crash the entire application layout, leaving a blank page.
- **Concrete Refactor:** Wrap each `<Block {...block.props} />` inside a resilient `ErrorBoundary` component that securely logs the error and gracefully degrades to a fallback UI (e.g., returning `null` or a minimal error boundary warning) instead of unmounting the whole React tree.

## 3. Silent Swallowing of Live Layout Validation Errors
- **Priority:** Medium
- **File:** `src/content/loadLayout.ts`
- **Lines:** 14-22
- **Explanation:** The `try...catch` block in `loadLiveWithStatus` acts defensively by falling back to `loadBaked()` if the fetch fails or `LayoutSchema.parse(await res.json())` throws a `ZodError`. However, it silently swallows the error, making it extremely difficult to diagnose network issues or identify structurally corrupted live layouts in production.
- **Concrete Refactor:** Add secure, non-leaky error logging inside the catch block before falling back.
  ```typescript
  } catch (err) {
    console.error("Failed to load or parse live layout:", err instanceof Error ? err.message : "Unknown layout error");
    return { layout: loadBaked(), source: "snapshot" };
  }
  ```

## 4. CJK IME Composition Interference in Chat Input
- **Priority:** Medium
- **File:** `src/components/chat/ChatPanel.tsx`
- **Lines:** 68-73
- **Explanation:** The `handleKeyDown` event listener on the chat text area submits a message whenever "Enter" is pressed without the Shift key. It neglects to check the `isComposing` state. Users typing in languages like Japanese, Chinese, or Korean via an Input Method Editor (IME) press "Enter" to finalize their character selection. The current implementation will prematurely intercept this and send an incomplete message.
- **Concrete Refactor:** Add an early return guard to ignore the event if an IME session is active:
  ```tsx
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  ```

## 5. Eager Glob Import for Themes Bloats Initial Bundle
- **Priority:** Low
- **File:** `src/themes/registry.ts`
- **Lines:** 104-107
- **Explanation:** The use of `import.meta.glob("./*.theme.json", { eager: true })` forces Vite to statically bundle all theme definition files directly into the initial JavaScript chunk. As the portfolio's theme count scales up, this will needlessly bloat the bundle size for users who may never switch from the default theme.
- **Concrete Refactor:** Change the import to lazy loading (`import.meta.glob("./*.theme.json")` without `eager: true`) and adjust `buildRegistry` (and the `ThemeProvider`) to resolve themes asynchronously via a React Suspense boundary or TanStack Query, keeping the initial payload lightweight.
