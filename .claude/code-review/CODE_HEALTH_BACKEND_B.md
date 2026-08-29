# Code Health Assessment Report: Backend & Architecture

## Security & Data Access Boundaries

### High: SSRF Risk on Unvalidated Base URL Loading
* **File:** `src/config/runtimeConfig.ts`
* **Line Range:** 128-140
* **Explanation:** `loadRuntimeConfig()` performs a `fetch` to `/config.json` and parses `octBaseUrl` and `mcpApiKey`. While `resolveOctBaseUrl()` performs basic URL schema checks (HTTP/HTTPS), it allows arbitrary valid HTTP/HTTPS URLs. If an attacker can compromise `config.json` or manipulate its deployment, they can point the frontend to an arbitrary external URL. Subsequent API calls using `octBaseUrl` (e.g. `octClient.ts`, `loadLayout.ts`) will send requests and possibly the `mcpApiKey` as an Authorization header to the attacker-controlled server.
* **Concrete Refactor:** Implement strict origin allowlisting or domain validation in `resolveOctBaseUrl`. If `octBaseUrl` is loaded from an external/dynamic source like `config.json`, validate it against a hardcoded list of expected domains or enforce that it must be a relative path unless explicitly built with `VITE_OCT_URL` representing a known safe host.

### High: XSS via `dangerouslySetInnerHTML` in Recharts Styles
* **File:** `src/components/ui/chart.tsx`
* **Line Range:** 105-130
* **Explanation:** `ChartStyle` injects dynamically generated CSS variables directly into a `<style>` tag using `dangerouslySetInnerHTML`. The values are sourced from `ChartConfig`'s `color` or `theme` properties. While there is a `isSafeCssColor` function attempting to sanitize the input, complex CSS injection payloads might bypass the regex filters, especially if `ChartConfig` values are influenced by user input or external layout configuration blocks.
* **Concrete Refactor:** Avoid `dangerouslySetInnerHTML` for CSS injection. Instead, apply CSS variables directly to the wrapper element's `style` attribute (e.g., `<div style={{ "--color-key": value } as React.CSSProperties}>`) which React safely handles.

### Medium: XSS Risk in Mermaid Diagram Rendering
* **File:** `src/blocks/MermaidDiagram.tsx`
* **Line Range:** 77-80
* **Explanation:** The component renders Mermaid SVG output using `dangerouslySetInnerHTML`. While Mermaid is initialized with `securityLevel: "strict"`, historically Mermaid rendering has occasionally had bypasses that lead to XSS if the underlying layout/source string originates from unvalidated user input or compromised backend fragments.
* **Concrete Refactor:** Add a secondary sanitization step on the `renderedSvg` using a library like `DOMPurify` before passing it to `dangerouslySetInnerHTML`, ensuring `<script>` tags or malicious event handlers `onload`/`onerror` in SVG elements are stripped.

## Robustness & Edge Cases

### Medium: Unhandled Promise Rejection in TanStack Queries
* **File:** `src/hooks/usePageLayout.ts`, `src/components/chat/ChatPanel.tsx`
* **Line Range:** 8-20 (usePageLayout), 258-265 (ChatPanel)
* **Explanation:** The `useQuery` hooks are configured without a strict error boundary or explicit `throwOnError: true` parameter for some API interactions. For instance, in `usePageLayout.ts`, if `loadLiveWithStatus` fails outside its own internal try-catch (or if React Query fails to mount it properly), the error state isn't strictly bounded, which could lead to a silent failure or broken UI state if `placeholderData` doesn't fully handle the error transition.
* **Concrete Refactor:** Ensure all TanStack queries have explicit error handling logic either via `throwOnError` paired with a React `ErrorBoundary`, or explicitly mapping `isError` to a fallback UI component.

### Medium: `localStorage` Versioning & Validation
* **File:** `src/store/index.ts`
* **Line Range:** 65-85
* **Explanation:** While the Zustand store uses `createJSONStorage(() => localStorage)` and implements a `migrate` function with `sanitizePersistedPreferences`, it assumes the incoming `persistedState` is an object. If a user maliciously or accidentally modifies `cat-portfolio-preferences` in `localStorage` to a non-JSON string or an array, `JSON.parse` might fail or the object assumption might lead to runtime errors before sanitization completes.
* **Concrete Refactor:** Add a top-level `try/catch` and explicit type check (e.g., `typeof persistedState === 'object' && persistedState !== null`) in the `migrate` function to handle gracefully malformed JSON or unexpected types in `localStorage`, resetting to default preferences safely.

## Performance & Maintainability

### Low: Repeated Regex Creation in Render Path
* **File:** `src/components/ui/chart.tsx`
* **Line Range:** 84-85
* **Explanation:** `SAFE_CSS_KEY` and `UNSAFE_CSS_COLOR` are defined outside the component, which is good, but they are executed heavily during rendering inside the `isSafeCssColor` function for every config key. High-frequency updates or large configurations might cause unnecessary CPU burn.
* **Concrete Refactor:** While the current implementation is acceptable for small charts, consider memoizing the `ChartStyle` generation based on `ChartConfig` or moving the CSS variables directly to inline `style` objects on React elements to avoid parsing and injecting `<style>` blocks on every render.

### Low: Duplicate Fetch Fallback Logic
* **File:** `src/content/loadLayout.ts`
* **Line Range:** 65-170
* **Explanation:** Functions `loadLiveWithStatus`, `loadLayoutForQuery`, `composeLayoutLive`, and `loadJobLayout` duplicate identical boilerplate logic for fetching the `octBaseUrl`, handling the timeout, checking `!res.ok`, parsing JSON, and falling back to `loadBaked()`.
* **Concrete Refactor:** Extract this boilerplate into a common utility function `fetchWithSnapshotFallback<T>(endpoint: string, options: FetchOptions)` to DRY the code, enforce consistent timeout handling, and centralize the fallback behavior.
