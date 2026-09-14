# Build instructions (CatPortfolio)

- This is a React 19 + Vite 8 + TypeScript SPA. Prefer npm scripts already in `package.json`.
- Pre-commit / CI gate: `npm run check:layout && npm run lint && npm run test && npm run test:e2e && npm run build`.
- Never edit `src/content/layout.json` by hand — edit `design/layout.yaml`, then `npm run compile:layout`.
- Never push `main`. Never touch `.github/workflows/deploy.yml`.
- Generated/agent changes go on `portfolio-gen/<date>-<slug>` and land via PR.
- New block type: Zod member in `src/content/schema.ts` → component in `src/blocks/` → barrel + registry → tests → Python mirror note if needed.
- Keep PRs focused; avoid drive-by refactors.
- When fixing CI, prefer minimal diffs and include `[pullfrog-ci-fix]` in the commit message.
- Do not commit secrets, `.env` files, or credentials.
- Tests run in Docker unless this checkout is a git worktree.
