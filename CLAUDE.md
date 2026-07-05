# CatPortfolio — Project Index

## Summary

- Personal portfolio site built with React 19, Vite 8, and TypeScript 6
- **Self-rendering SPA:** the page renders from a Zod-validated `src/content/layout.json` block spec through a whitelisted block registry (7 block types). The layout grows; the code doesn't change. See `../cat-portfolio-implementation-plan.md` for the full contract.
- Entry: `src/main.tsx` → `src/router.tsx` (TanStack Router) → `src/App.tsx` shell → routes `/` (baked layout) and `/ask` (live layout with static fallback)
- Deployed to GitHub Pages (project page, `base: "/CatPortfolio/"`) via `.github/workflows/deploy.yml`

## Dev Rules

1. Update `CLAUDE.md` after every structural change (new routes, components, dependencies).
2. New components → add to Project Structure below.
3. New dependencies → add to Tech Stack below.
4. Use the `@/` alias for cross-directory imports; relative imports within a directory.
5. Lint before committing: `npm run lint`; tests: `npm run test`
6. **Layout contract rules:** unknown block type = skipped, never crashes (registry is the whitelist). `layout.json` must pass `LayoutSchema` — validation fails loud at load. New block type = new Zod schema member + new reviewed component + registry entry + tests. Never auto-deploy unreviewed generated layout — the commit is the gate.

## Project Structure

```
CatPortfolio/
├── src/
│   ├── main.tsx              # React root: ThemeProvider > QueryClientProvider > RouterProvider
│   ├── router.tsx            # Code-based TanStack Router (basepath = BASE_URL), routes / and /ask
│   ├── App.tsx               # Root layout shell: sticky header, nav, theme switcher, Outlet, footer
│   ├── index.css             # Tailwind v4 CSS-first config + OKLCH design tokens + shadcn bridge
│   ├── content/
│   │   ├── schema.ts         # Zod LayoutSchema — the block contract (7-type discriminated union)
│   │   ├── layout.json       # Baked layout spec (committed, gated) — must pass LayoutSchema
│   │   ├── loadLayout.ts     # loadBaked (sync, fail-loud) + loadLiveWithStatus (4s timeout → snapshot fallback)
│   │   └── __tests__/        # Fixture parse, whitelist rejection, fallback tests
│   ├── render/
│   │   ├── registry.ts       # type → component map; `satisfies` enforces whitelist completeness
│   │   ├── LayoutRenderer.tsx# Spec → components; unknown block = skip; motion/react animations
│   │   └── __tests__/        # Registry ↔ schema drift test
│   ├── blocks/               # The 7 whitelisted block components + barrel
│   │   ├── Hero.tsx  ProjectGrid.tsx  StatStrip.tsx  StarStory.tsx
│   │   ├── ArchDiagram.tsx   # kind svg → data-URI img; kind mermaid → lazy MermaidDiagram
│   │   ├── MermaidDiagram.tsx# Lazy chunk (not exported from barrel)
│   │   ├── CodeSnippet.tsx  Prose.tsx  index.ts
│   ├── routes/
│   │   ├── HomePage.tsx      # loadBaked() → LayoutRenderer
│   │   └── AskPage.tsx       # TanStack Query loadLiveWithStatus + live/snapshot pill
│   ├── api/                  # (reserved for OCT live-loop client)
│   ├── assets/               # hero.png
│   ├── lib/utils.ts          # cn helper
│   ├── store/                # Zustand preferences (theme)
│   ├── themes/               # cozy/neon/paper theme JSONs + registry
│   ├── hooks/                # useThemeRegistry
│   └── components/
│       ├── ThemeProvider.tsx # Injects theme CSS vars on document root
│       └── ui/               # shadcn: button.tsx, card.tsx
├── .github/workflows/deploy.yml  # Pages: build → 404.html fallback → deploy (no generation!)
├── public/                   # favicon.svg
├── index.html                # HTML shell
└── vite.config.ts            # base "/CatPortfolio/", @ alias, react + tailwind plugins
```

## Essential Commands

```bash
npm run dev       # Start dev server (serves at /CatPortfolio/)
npm run test      # Vitest (content + registry tests)
npm run build     # Type-check + production build
npm run lint      # Lint with oxlint
npm run preview   # Preview production build at /CatPortfolio/
```

## Tech Stack

| Layer | Tool |
|-------|------|
| Framework | React 19 |
| Build | Vite 8 (base `/CatPortfolio/`) |
| Language | TypeScript 6 (strict, verbatimModuleSyntax) |
| Routing | TanStack Router (code-based, `src/router.tsx`) |
| Server state | TanStack Query v5 (`/ask` live layout only) |
| Client state | Zustand (theme preference) |
| Validation | Zod v3 (`LayoutSchema` — fail loud) |
| Styling | Tailwind v4 CSS-first + shadcn/ui + OKLCH tokens |
| Animation | motion (`motion/react`), respects reduced motion |
| Markdown | react-markdown + remark-gfm (prose block) |
| Diagrams | mermaid (lazy chunk, archDiagram block) |
| Tests | Vitest |
| Linter | oxlint |
| Deploy | GitHub Pages via Actions (SPA 404 fallback) |

## Deployment Notes

- One-time repo setup: GitHub → Settings → Pages → Source = **GitHub Actions**.
- The Action only builds; `layout.json` generation stays behind the commit gate (never in CI).
- Deep links work via `cp dist/index.html dist/404.html` in the workflow.
