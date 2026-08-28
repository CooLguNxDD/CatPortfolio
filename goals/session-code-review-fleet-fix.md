CONTEXT:
- CatPortfolio: React/Vite SPA rendering an agentically-baked portfolio page, plus a WebGL fish-tank visualization and an MCP-driven chat/ask mode. Repo root: C:\weltel-wsl\Secret\CatPortfolio
- Read `CLAUDE.md` at repo root first for project conventions.
- A code-review fleet produced findings, manually validated against source by a prior session. Implement exactly what's scoped below — do not re-scan for new findings or expand into unrelated files.
- State management uses Zustand (`useFishTankStore` etc, likely in `src/store/` or similar — locate it).

GOAL: Apply the following independent fixes.

1. **`src/components/chat/ChatMessage.tsx`** (~L105-133, function `runAction` inside the component): currently, when a chat action targets a text block, it calls `navigate({...})` then does `requestAnimationFrame(() => document.querySelector(...).scrollIntoView(...))` — a race, since the new route's DOM may not be mounted within one frame. Fix: encode the scroll target into the route's search params instead (the component already threads a `f`/`v` search param pattern for the "focus" action branch a few lines above — read those lines ~L112-117 to match the existing pattern). Add a `scrollTo` (or similarly-named) search param carrying `action.target` when navigating to the text view. Then find the component that renders the text/matrix view (likely `LayoutRenderer.tsx` or a "MatrixLevels"-style component under `src/render/` or `src/routes/` — search for where `v: "text"` search param is consumed) and add a `useEffect` there that reads that search param and calls `scrollIntoView` once the target element (`[data-block-id="..."]`) is actually present in the DOM (e.g. poll via `requestAnimationFrame` in a loop with a max attempt count, or use a `MutationObserver`, or simply run the effect after the block list has rendered — pick whichever fits the existing code structure) — then clear the search param so it doesn't re-trigger on next render. Remove the `requestAnimationFrame`/`querySelector` call from `ChatMessage.tsx`'s `runAction` for the non-focus branch.

2. **`src/hooks/useFishTank.ts`** (~L43-49): currently uses 7 separate atomic Zustand selectors: `useFishTankStore((s) => s.state)`, `.chrome`, `.query`, `.domain`, `.focus` (aliased `focusedSlug`), `.bakeActive`, `.curationDismissed`. Combine into one `useShallow` selector call. Import `useShallow` from `zustand/react/shallow` (check `package.json` / existing imports elsewhere in the repo for the exact import path used — Zustand v4 vs v5 differ slightly). Replace with:
   ```ts
   const { tankState, chrome, query, domain, focusedSlug, bakeActive, curationDismissed } = useFishTankStore(
     useShallow((s) => ({
       tankState: s.state,
       chrome: s.chrome,
       query: s.query,
       domain: s.domain,
       focusedSlug: s.focus,
       bakeActive: s.bakeActive,
       curationDismissed: s.curationDismissed,
     }))
   );
   ```
   Adjust variable names to match whatever the rest of the hook body actually references downstream (grep for `tankState`/`chrome`/etc usage in the same file to confirm names match).

3. **`src/api/agentStatus.ts`** (`fetchAgentStatus`, ~L15-38): currently catches all exceptions and returns `null` silently (documented as intentional non-critical degradation). Keep the `return null` behavior, but add `console.warn("fetchAgentStatus failed", err)` (or similar, matching the file's existing logging style if any) before returning null, so failures are visible in the console without breaking the UI.

4. **`src/config/runtimeConfig.ts`** (`loadRuntimeConfig`, ~L78-107): currently falls back to `envFallback()` silently on any fetch error. Add a `console.warn("loadRuntimeConfig: falling back to env config", err)` (or similar) in the catch path before falling back, so a misconfigured deployment is visible. Do NOT change the singleton/promise-based initialization logic itself — only add the warning log.

5. **`src/api/octClient.ts`** (`doConnect`, ~L73-101): in the catch block when `client.connect(transport)` fails, the code calls `await client.close()` wrapped in its own try/catch that ignores errors, then re-throws the original error. Problem: if `client.close()` hangs, the original error is never thrown because the `await` blocks forever. Fix: give the `client.close()` call a timeout so a hang can't block the rethrow — e.g. `await Promise.race([client.close(), new Promise((_, reject) => setTimeout(() => reject(new Error("close timeout")), 3000))])` still wrapped in try/catch (ignore either the close error or the timeout — both are fine to swallow, the important part is not blocking). Also: after a failed `connect()`, ensure `this.connectPromise` (or whatever field tracks the in-flight connection promise — check the class fields) is reset/cleared on rejection so a subsequent caller isn't left waiting on a promise that already rejected — check the `connect()` method (not just `doConnect`) for how `connectPromise` is set and make sure a `.catch()` or try/finally clears it before rejecting.

6. **Lint config** — replace the deleted regex-based review report with actual lint rules. Find CatPortfolio's ESLint config file (likely `eslint.config.js` or `.eslintrc*` at repo root). Add/enable:
   - `no-console`: `"warn"` (not `"error"` — the fixes above intentionally add `console.warn` calls)
   - `@typescript-eslint/no-explicit-any`: `"warn"`
   Only add these if not already present with equal-or-stricter settings; if the config already covers them, leave as-is and note that in the summary.

ACCEPTANCE CRITERIA:
- `npm run build` succeeds with no new TypeScript errors.
- `npm run lint` runs (may report pre-existing warnings from files outside this session's scope — that's fine — but must report zero *errors*, and zero new warnings in the 5 files touched in items 1-5).
- Manual/structural check: `ChatMessage.tsx` no longer calls `document.querySelector` + `scrollIntoView` directly; the new scroll effect lives in the mounted target component and is gated on the block actually existing in the DOM.
- `useFishTank.ts` has exactly one `useFishTankStore(...)` call site remaining (the new `useShallow` one) instead of 7.

CONSTRAINTS:
- Do NOT touch `src/hooks/useLayoutDag.ts`, `src/blocks/MermaidDiagram.tsx`, `src/content/loadLayout.ts`, `src/hooks/useFishTank.ts`'s effect-registration block (~L55-78, the `register()`/`cleanups` pattern) — findings against these were reviewed and rejected as false positives.
- Do NOT delete or modify `.claude/docs/code-review/` or any report files — those live in the sibling `Weltel-Mcp-Full` repo, not here.
- Keep all existing behavior for the happy path unchanged — these are error-path/race-path fixes only, no visual or functional changes when nothing fails.
- Do not add new npm dependencies unless `useShallow`'s import truly isn't available in the currently installed `zustand` version (check `package.json` first — it almost certainly is, zustand v4.1+ ships it).
- Match existing code style (this repo uses Tailwind utility classes inline, TypeScript strict-ish patterns — check neighboring files before introducing new patterns).

EXPECTED ARTIFACTS:
- Modify: `src/components/chat/ChatMessage.tsx`, the text/matrix-view render component (locate it — likely `src/render/LayoutRenderer.tsx` or similar), `src/hooks/useFishTank.ts`, `src/api/agentStatus.ts`, `src/config/runtimeConfig.ts`, `src/api/octClient.ts`, ESLint config file
- Test command: `npm run build && npm run lint`
- Write a short summary of what was changed, including the exact file path chosen for the scroll-target `useEffect`, and the lint/build results to `logs/session-code-review-fleet-fix-summary.md` when done.
