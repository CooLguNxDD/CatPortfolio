# Code Health Assessment - Frontend

## Overview
This document contains the findings of an exhaustive code health and refactoring assessment of the frontend codebase for the `Add-dynamic-builder-pipeline` branch.

## Files Assessed

### src/api/harness.ts
- **Priority:** High
- **Line range:** 23-45
- **Explanation:** The `extractMarkdown` function uses a lot of `any` types and complex nested `if` statements with `typeof` checks to parse unknown JSON structures. This is error-prone, hard to maintain, and defeats TypeScript's safety features.
- **Refactoring Solution:** Use `zod` to define a schema for the expected response structure and parse it safely, or create type guards for the expected response envelopes. This improves robustness and maintainability.

- **Priority:** Medium
- **Line range:** 59-71
- **Explanation:** The `parseRateLimit` function uses regex and string matching on `err.message` which is highly fragile and dependent on the exact error string returned by the client.
- **Refactoring Solution:** Rely on structured error objects (e.g. `err.status`, `err.headers['retry-after']`) from the HTTP client rather than parsing string messages. If the MCP client doesn't support this, abstract this into an error mapping layer.

### src/api/octClient.ts
- **Priority:** High
- **Line range:** 80-87
- **Explanation:** In `callTool`, `setTimeout` is used for the timeout, but `clearTimeout` is never called if the request succeeds before the timeout. This can cause memory leaks and lingering timer callbacks, especially if many requests are made.
- **Refactoring Solution:** Keep a reference to the timeout timer (e.g., `let timer = setTimeout(...)`) and explicitly call `clearTimeout(timer)` inside a `finally` block or right after the `callPromise` resolves.

### src/components/chat/ChatPanel.tsx
- **Priority:** Medium
- **Line range:** 18-26
- **Explanation:** The `useQuery` for fetching `tools` uses `retry: false` but doesn't implement a polling or reconnect mechanism if the connection drops or is temporarily unavailable when the component mounts.
- **Refactoring Solution:** Reconsider the `useQuery` configuration to handle connection drops more gracefully, maybe implementing a manual reconnect button or using a background polling interval (`refetchInterval`) when offline.

### src/components/ThemeProvider.tsx
- **Priority:** Medium
- **Line range:** 22-24
- **Explanation:** Setting CSS variables directly on `document.documentElement.style` bypasses React's declarative rendering and can lead to desynchronization if other parts of the app (or third-party scripts) modify the `style` object.
- **Refactoring Solution:** Since this is a global theme applying CSS variables, it's generally acceptable, but it's cleaner to inject a `<style>` tag into the `<head>` or manage a class name on the `html` element that maps to CSS variables defined in CSS (like Tailwind themes).

### src/content/loadLayout.ts
- **Priority:** High
- **Line range:** 14-23
- **Explanation:** `loadLiveWithStatus` handles fetch errors with a generic `catch` block that suppresses the error and falls back to baked layout. It also doesn't handle `AbortError` specifically, meaning timeouts are treated as normal failures without logging.
- **Refactoring Solution:** Add logging inside the catch block to track why live layouts are failing (e.g., timeout vs 500 error). Use a secure logging service or `console.error` in dev mode.

### src/blocks/MermaidDiagram.tsx
- **Priority:** Medium
- **Line range:** 24-28
- **Explanation:** `mermaid.initialize` is called within a `useEffect` on first mount. If multiple `MermaidDiagram` components mount simultaneously, there could be a race condition setting `mermaidInitialized = true`.
- **Refactoring Solution:** Move the `mermaid.initialize` call outside of the component (e.g., a module-level initialization function that guarantees it only runs once) to avoid potential race conditions and ensure thread-safe initialization.

### src/blocks/Prose.tsx (and other blocks)
- **Priority:** Low
- **Line range:** (Global to blocks)
- **Explanation:** Blocks like `Prose`, `ArchDiagram`, etc., use `Extract<Layout["blocks"][number], { type: "prose" }>["props"]` for typing. While functional, it couples block components directly to the main `Layout` schema.
- **Refactoring Solution:** Define block-specific schemas and inferred types in their respective files or a dedicated `blocks.schema.ts` file, and compose the main `LayoutSchema` from these pieces. This improves separation of concerns (SOLID principles).

### src/render/LayoutRenderer.tsx
- **Priority:** Medium
- **Line range:** 9-30
- **Explanation:** The `REGISTRY[block.type as BlockType]` cast assumes that `block.type` is always a valid key in `REGISTRY`. If the layout JSON is malformed and bypasses validation (or validation is updated without updating the registry), it could lead to runtime errors.
- **Refactoring Solution:** Add an error boundary around the rendering of dynamic blocks, or a fallback UI for unknown block types (e.g., if `!Block`, render a `<div>Unknown Block: {block.type}</div>` instead of `null` for better visibility during development).

### src/App.tsx
- **Priority:** Low
- **Line range:** 18-59
- **Explanation:** The `<App>` component directly maps `themeList` to render theme toggle buttons in the header. If the number of themes grows, this will crowd the header UI.
- **Refactoring Solution:** Encapsulate the theme selector logic into a dedicated `<ThemeSelector>` dropdown component instead of inline buttons, to keep the header clean and scalable.

### src/store/preferencesSlice.ts
- **Priority:** Low
- **Line range:** 32-38
- **Explanation:** The `selectThemeAttrs` function returns data-attributes for density and accent, but these are currently unused in `index.css` and the theme registry. `index.css` uses plain CSS variables and Shadcn mappings, not data-attributes on the root element.
- **Refactoring Solution:** Either update `index.css` to consume `data-density` and `data-accent` selectors, or remove these properties from the slice if they represent dead/planned code.

### src/themes/registry.ts
- **Priority:** High
- **Line range:** 75-78
- **Explanation:** The `resolveThemeVars` function uses a `while (currentId)` loop to recursively build variables. While it has cycle detection and depth limit, it heavily relies on mutable arrays and strings. If many themes inherit from a base theme, it resolves the entire chain for every single child during the `buildRegistry` phase.
- **Refactoring Solution:** Implement a memoized resolution or topological sort approach so that base themes are fully resolved once and cached, preventing redundant deep object merges during application startup.

### src/index.css
- **Priority:** Low
- **Line range:** 14-25
- **Explanation:** Custom color variables like `--amber`, `--pink`, `--neon`, etc., are defined directly in root without usage across most of the tailwind mappings. There's a mismatch between tailwind configuration and plain css variable usage (like `var(--hairline)` inside `shadow-card`).
- **Refactoring Solution:** Move global color palettes directly into the `@theme` block in tailwind v4, or refactor all component styling to uniformly use Shadcn semantics (`--primary`, `--muted`) rather than raw theme variables like `--bg-sunken`.

### src/routes/HomePage.tsx
- **Priority:** Low
- **Line range:** 1-13
- **Explanation:** The `HomePage` component calls `loadBaked()` synchronously at the module level. If the layout data were to become dynamic or require lazy loading, this synchronous parsing on module initialization could block the main thread unnecessarily.
- **Refactoring Solution:** Move `loadBaked()` inside the component state or use a React context/loader pattern to ensure parsing only happens when the component mounts.

### src/routes/AskPage.tsx
- **Priority:** Medium
- **Line range:** 10-18
- **Explanation:** `AskPage` relies on `loadLiveWithStatus` with a hardcoded `placeholderData`. If the query fails, the fallback UI does not explicitly show an error state but just silently degrades to the snapshot data without notifying the user that live data failed to load.
- **Refactoring Solution:** Implement robust error boundaries or toast notifications to alert the user when the live portfolio layout server is unreachable, rather than silently falling back to the baked version.

### src/router.tsx
- **Priority:** Low
- **Line range:** 22-25
- **Explanation:** The `basepath` is statically defined from `import.meta.env.BASE_URL`. While standard, if the app is embedded in another site or rendered server-side, this environment variable configuration can become inflexible.
- **Refactoring Solution:** Ensure `BASE_URL` logic handles potential trailing slashes correctly, and consider moving router configuration to a provider where the base path can be injected dynamically if needed.

### src/main.tsx
- **Priority:** Low
- **Line range:** 1-19
- **Explanation:** The `QueryClient` is instantiated outside the component tree. While this is common, it persists data globally across hot module reloads in development, which can sometimes lead to confusing state during debugging.
- **Refactoring Solution:** It's generally fine, but wrapping it in a function or moving it inside a provider factory function can ensure clean client instances per render tree if testing or SSR is introduced later.

### src/store/index.ts
- **Priority:** Low
- **Line range:** 14-30
- **Explanation:** `usePreferencesStore` uses `localStorage` for persistence. In scenarios where `localStorage` is disabled or inaccessible (e.g., in strict incognito modes or iframe embeds), `zustand/middleware` can throw errors, breaking the store initialization.
- **Refactoring Solution:** Wrap the `localStorage` access in a try-catch block or use a safe storage wrapper to ensure the store gracefully degrades to in-memory state if persistence fails.

### src/hooks/useThemeRegistry.ts
- **Priority:** Low
- **Line range:** 10-17
- **Explanation:** Standard contextual hook usage. No significant health issues detected.
- **Refactoring Solution:** None required. Code is robust.

### src/themes/theme-context.ts
- **Priority:** Low
- **Line range:** 9-14
- **Explanation:** Creating a context with `null` default requires downstream consumers to assert or check for nullity (which `useThemeRegistry` does).
- **Refactoring Solution:** None required. Proper pattern.

### src/lib/utils.ts
- **Priority:** Low
- **Line range:** 1-6
- **Explanation:** The `cn` utility merges `clsx` and `twMerge`. Standard pattern, no issues.
- **Refactoring Solution:** None required.
