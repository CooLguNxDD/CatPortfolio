# Jules dispatch — cat-head-rig-and-turn review fixes

Starting branch: `cat-head-rig-and-turn`
Repo source: `sources/github/CooLguNxDD/CatPortfolio`
automationMode: AUTO_CREATE_PR (each session opens its own PR against `cat-head-rig-and-turn` on completion)

| Module | Session ID | URL | Files owned | Acceptance |
|---|---|---|---|---|
| fishtank-cursor-fixes | 5230254826964768590 | https://jules.google.com/session/5230254826964768590 | `src/blocks/FishTankCanvas.tsx` only | `npm run lint && npm run test && npm run build` + manual: move mouse off-window then orbit-drag, no phantom cursor reaction |
| cat-rig-perf-a11y-fixes-retry | 17076149815177808089 | https://jules.google.com/session/17076149815177808089 | `src/object3D/Cat/**` (math, rig, animations, components, its tests) | `npm run lint && npm run test && npm run build` + manual: dev companion no longer stutters on drag/pet |

~~cat-rig-perf-a11y-fixes | 6197760284725242534~~ — stuck (no activity, never progressed past IN_PROGRESS), deleted 2026-08-21, replaced by the retry row above.

Disjoint file sets — safe to merge both without conflict, in either order.

## Next steps (when returning)
1. `julesget_session {sessionId}` per row → check `state`.
2. `juleslist_activities {sessionId}` for plan/progress detail if stuck.
3. Once each shows a PR: `gh pr diff <n>`, verify against the acceptance command + the plan at
   `C:\Users\andre\.claude\plans\c-weltel-wsl-secret-catportfolio-claude-frolicking-willow.md`.
4. Merge both into `cat-head-rig-and-turn` locally (or via `gh pr merge`), run full gate
   (`npm run check:layout && npm run lint && npm run test && npm run build`) on the merged result.
5. Open the PR from `cat-head-rig-and-turn` → `main` per project convention (never push main directly).
