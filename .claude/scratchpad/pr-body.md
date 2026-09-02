Lands the verified grok + gemini pending-report fixes (CatPortfolio only).

## What changed

- **P0** — Sticky matrix chrome is opaque and minimap-only. Persona / tech filters sit in normal flow so `Andrew Liang (the cat)` is readable (`catportfolio-text-hero.png` regression).
- **P1** — `loadLiveWithStatus` and `gen-layout.ts` call `GET /api/portfolio/public/layout?audience=&tank=1` (was `/portfolio/layout`, which 404'd on the Docker nginx proxy).
- **P1** — Text/mobile: project index first, Ask next, matrix last. One persist notice. Chat log no longer auto-scrolls the empty intro off-screen.
- **P1** — `diveAnimator.reset()` emits 0 (cancel used to leave progress at 1, so phone tank opened already submerged). Mobile rim card sits below the 3D/Flat/Text pills.
- **P2** — `fetchAgentStatus` throws on non-2xx so the pill stops polling 503s. One `<main>`. Bake / `Employer contribution reports` only on job bakes. Light themes skip night circadian water.
- **P3** — Empty-state "Clear filters", larger accent dots, wider theme select, redundant Home link removed.

## Verify

Docker image rebuilt. Playwright:

- `?v=text` hero name readable under sticky chrome
- 1 `<main>`, 1 persist notice
- 390px: Project index above the fold
- `?v=tank` opens on the surface hero; rim not covered by view pills
- Live URL is correct; OCT still timed out at 4s in this environment so the snapshot pill remains until the backend answers in time

`scripts/__tests__/compile-layout.test.ts` yaml/json drift was already failing on `main` and is not part of this PR.

Does not touch `deploy.yml`.
