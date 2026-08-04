# CatPortfolio — Project Index

## Summary

- Personal portfolio site built with React 19, Vite 8, and TypeScript 6
- **Self-rendering SPA:** the page renders from a Zod-validated `src/content/layout.json` block spec through a whitelisted block registry. The layout grows; the code doesn't change.
- **Open Design matrix home (2026-07):** default layout is a **level-row DAG**, not a flat stack. `meta.dag.levels` groups blocks into horizontal story bands (L0 Intro → L1 Impact → L2 Projects → L3 Architecture/MCP sandbox → L4 Charts/cost sim → L5 Proof → L6 Deep dive → L7 Ask). `LayoutRenderer` + `useLayoutDag` + `styles/matrix.css` drive viewport-aligned lighting (focus line under sticky chrome), sticky minimap / persona / tech filter. Prefer first-class **`card`** blocks (`domain: ai|devops|mobile|platform`) over `projectGrid` for L2. Interactive client-only blocks: **`mcpSandbox`**, **`costSim`**. **L6 Deep dive uses `cols: 1`** — one full-width component per row (composite / arch / code / prose), not a compacted multi-column band.
- **Layout source of truth is `design/layout.yaml`** — compiled to `layout.json` via `npm run compile:layout`; CI verifies sync with `npm run check:layout` (never generates). `design/design.md` is the design contract agents read (matrix + card rules live there too). Schema mirror: `src/content/schema.ts` ↔ OCT `utils/ui_layout_schema.py` (incl. `card`, `mcpSandbox`, `costSim`, `meta.dag.levels[].cols`).
- Entry: `src/main.tsx` → `src/router.tsx` (TanStack Router) → `src/App.tsx` shell → routes `/` (baked matrix layout, or a job-specific baked layout via `?j=<short_id>` — "bake & send", see below) and `/ask` (live layout with static fallback; agent should stamp `meta.dag` for matrix chrome)
- **Runtime backend config:** `src/config/runtimeConfig.ts` fetches `public/config.json` (unhashed, patchable post-deploy without a rebuild) at startup for the OCT backend base URL, `/mcp` API key, and **`askTimeoutMs`** (MCP SDK idle timeout for Andrew's AI `run_graph`; default **600000** ms / 10 min, reset by server progress keepalives). GitHub Pages has no build-time env injection. Falls back to `VITE_OCT_URL` / `VITE_OCT_API_KEY` / `VITE_ASK_TIMEOUT_MS`, then safe defaults. Gated in `src/main.tsx` before first render; `src/api/octClient.ts::octBaseUrl()` prefers it, falling back to the build-time env var if not yet loaded. Docker injects the same fields via `docker-entrypoint.sh` (`OCT_BASE_URL`, `OCT_API_KEY`, `OCT_ASK_TIMEOUT_MS`).
- **Local Docker:** `docker compose` serves nginx on **localhost:11000** with `base: /CatPortfolio/`. After editing `design/layout.yaml`, run `compile:layout` **and rebuild the image** — bind-mount alone will not update a baked nginx root if the image copied `dist/` at build time.
- **MCP tool call timeouts:** `octClient.callTool` passes SDK `RequestOptions` (`timeout`, `resetTimeoutOnProgress: true`, `onprogress`) — not a bare `Promise.race`. The SDK default is 60s; without `onprogress` the client never sends a `progressToken`, so the server skips keepalives and long agent turns die with "Request timed out".
- **`?j=` job-specific pre-baked layout:** the `/` route's `validateSearch` accepts an optional `j` (job short id, minted server-side by the OpenCat backend's "bake & send" pipeline — see `OpenCat-Mcp-Full/CLAUDE.md`). `src/content/loadLayout.ts::loadJobLayout(jobId)` fetches `GET /api/portfolio/public/layout/{jobId}` from the OCT backend and falls back to the baked snapshot on any failure — never hard-fails, since this backs a public HR-facing resume link. `src/routes/HomePage.tsx` renders the baked-only path byte-for-byte unchanged when `j` is absent.
- **Chat-driven live layout re-render (`/ask`):** `ChatPanel.tsx` fires `src/content/loadLayout.ts::loadLayoutForQuery(userMessage)` alongside (not blocking) each chat turn — a fast, public REST call (`GET /api/portfolio/public/layout-for-query?query=...`, no MCP round-trip) that deterministically infers audience from the chat text server-side. On a `"live"` result it writes directly into the `["layout","default"]` TanStack Query cache (`queryClient.setQueryData`) so `AskPage`'s `LayoutRenderer` updates immediately without an invalidate/refetch. Agentic path: `extractCarryLayout` Zod-validates `response.carry.layout` (drops malformed agent JSON); if `meta.theme` is a registered theme id, `ChatPanel` applies it via the Zustand preferences store. Soft directive nudges creative redesigns toward OCT `design_layout` (layout-design-builder skill). OCT matrix defaults: `hero` → `kpiGrid` → `cards` → `starStory` with `meta.dag` stamping.
- **One-shot CLI agent (when OCT core LLM is `claude-cli` / `agy-cli`):** `askOct` still calls `run_graph` once; OpenCat short-circuits the whole turn to a single headless CLI agent spawn (`core_graph/goap_agent/oneshot.py`) and returns `{status, message, meta.cli}`. `extractCliMeta` + ChatPanel surface an `one-shot cli · claude|agy` pill (parity with admin playground `McpMode`). Layout carry is best-effort on oneshot — REST `loadLayoutForQuery` remains the layout fallback. Backend mints an admin child token for the CLI (does not inherit the public deny-all gateway API key).
- **Job-search agent live status:** `src/api/agentStatus.ts::fetchAgentStatus` polls the public, privacy-safe `GET /api/portfolio/public/agent-status` (never applicant PII — just `{job_id, status, updated_at}`); `src/components/AgentStatusPill.tsx` (TanStack Query `refetchInterval: 8000`) renders it, mounted in `AskPage.tsx`. No SSE — polling only, by design (see backend CLAUDE.md).
- Deployed to GitHub Pages (project page, `base: "/CatPortfolio/"`) via `.github/workflows/deploy.yml`

## Dev Rules

1. Update `CLAUDE.md` after every structural change (new routes, components, dependencies).
2. New components → add to Project Structure below.
3. New dependencies → add to Tech Stack below.
4. Use the `@/` alias for cross-directory imports; relative imports within a directory.
5. Lint before committing: `npm run lint`; tests: `npm run test`
6. **Layout contract rules:** unknown block type = skipped, never crashes (registry is the whitelist). `layout.json` must pass `LayoutSchema` — validation fails loud at load. New block type = new Zod schema member + new reviewed component + barrel export + registry entry + tests + Python mirror sync. Never auto-deploy unreviewed generated layout — the commit/PR is the gate. The layout contract is mirrored server-side in `OpenCat-Mcp-Full/utils/ui_layout_schema.py` — any `schema.ts` change must update both files together, or flag pending sync via `design/pending-mirror/<yyyy-mm-dd>-<type>.md` (enforced by `scripts/__tests__/mirror-drift.test.ts` against `design/mirror-manifest.json`).
7. **Never edit `src/content/layout.json` directly** — edit `design/layout.yaml` and run `npm run compile:layout`. CI fails PRs where they're out of sync.
8. Generated changes (agent runs) always go through a PR on a `portfolio-gen/<date>-<slug>` branch — never push to `main`, never modify `.github/workflows/deploy.yml`.

## Project Structure

```
CatPortfolio/
├── src/
│   ├── main.tsx              # React root: ThemeProvider > QueryClientProvider > RouterProvider
│   ├── router.tsx            # Code-based TanStack Router (basepath = BASE_URL), routes / (validateSearch: ?j=<jobId>) and /ask
│   ├── config/
│   │   └── runtimeConfig.ts  # Fetches public/config.json at startup (octBaseUrl, mcpApiKey, askTimeoutMs)
│   ├── App.tsx               # Root layout shell: sticky header, nav, theme switcher, Outlet, footer
│   ├── index.css             # Tailwind v4 CSS-first config + OKLCH design tokens + shadcn bridge
│   ├── content/
│   │   ├── schema.ts         # Zod LayoutSchema — full block union + meta.theme / meta.dag (+ cols)
│   │   ├── layout.json       # Baked layout spec (committed, gated) — must pass LayoutSchema
│   │   ├── loadLayout.ts     # loadBaked (singleton) + loadLiveWithStatus + loadJobLayout + loadLayoutForQuery
│   │   └── __tests__/        # Fixture parse, whitelist rejection, fallback tests
│   ├── render/
│   │   ├── registry.ts       # type → component map; `satisfies` enforces whitelist completeness
│   │   ├── LayoutRenderer.tsx# Matrix chrome when meta.dag present; else stagger + span grid
│   │   ├── BlockErrorBoundary.tsx # Per-block error boundary (isolates throw → null)
│   │   └── __tests__/        # Registry ↔ schema drift test
│   ├── blocks/               # Whitelisted block components + barrel
│   │   ├── Hero.tsx  Card.tsx  ProjectGrid.tsx  StatStrip.tsx  StarStory.tsx  KpiGrid.tsx
│   │   ├── ArchDiagram.tsx   # kind svg → data-URI img; kind mermaid → lazy MermaidDiagram
│   │   ├── MermaidDiagram.tsx# Lazy chunk (not exported from barrel)
│   │   ├── Chart.tsx Timeline.tsx FlowAnim.tsx Comparison.tsx Composite.tsx QuickActions.tsx
│   │   ├── McpSandbox.tsx CostSimulator.tsx  # OD matrix L3/L4 interactives (client-only)
│   │   ├── CodeSnippet.tsx  Prose.tsx  index.ts
│   │   └── primitives/ charts/   # shared card shell, sparkline, etc.
│   ├── styles/
│   │   └── matrix.css        # Level-row bands, sticky chrome, domain chroma, is-lit / is-current
│   ├── routes/
│   │   ├── HomePage.tsx      # loadBaked() → LayoutRenderer (matrix home)
│   │   └── AskPage.tsx       # TanStack Query loadLiveWithStatus + live/snapshot pill
│   ├── api/                  # MCP Client integration
│   │   ├── octClient.ts      # StreamableHTTPClientTransport client
│   │   ├── instructions.ts   # System prompts and message wrapping
│   │   ├── harness.ts        # askOct runner and markdown extractor
│   │   └── __tests__/        # Harness and client unit tests
│   ├── assets/               # hero.png
│   ├── lib/utils.ts          # cn helper
│   ├── store/                # Zustand preferences (theme) + layoutSlice
│   ├── themes/               # cozy/neon/paper theme JSONs + registry
│   ├── hooks/                # useThemeRegistry, useLayoutDag, useLayoutTheme, …
│   └── components/
│       ├── ThemeProvider.tsx # Injects theme CSS vars on document root
│       ├── AgenticHeader.tsx SourceCitations.tsx  # GenUI chrome when meta.mode / sources set
│       ├── chat/             # Interactive ask chat components
│       │   ├── ChatPanel.tsx # Main chat window & connection manager
│       │   └── ChatMessage.tsx# Message bubble renderer
│       └── ui/               # shadcn: button.tsx, card.tsx
├── design/                   # Source of truth for generation (human/agent-editable)
│   ├── layout.yaml           # Matrix layout source (meta.dag L0–L7) → layout.json
│   ├── design.md             # Design contract: tokens + matrix/card rules + voice/audience
│   ├── sources.yaml          # External context sources configuration
│   ├── prototypes/           # Optional job/domain layout drafts (YAML). Old WelTel-themed
│   │                         # prototypes removed; recreate from ../weltelprojects/ material
│   │                         # (WelTel job work ≠ OpenCat Tunnel — keep streams separate)
│   ├── mirror-manifest.json  # Block types known to the Python mirror (mirror-drift test)
│   └── pending-mirror/       # (created on demand) Pydantic patches awaiting OCT-side sync
├── scripts/
│   ├── compile-layout.ts     # design/layout.yaml → Zod-validate → src/content/layout.json; --check = sync verify
│   ├── gen-layout.ts         # Seeds design/layout.yaml draft from OCT /portfolio/layout, then compiles (never in CI)
│   ├── sources-schema.ts     # Zod schema for design/sources.yaml
│   └── __tests__/            # compile-layout, mirror-drift, and sources tests
├── .github/workflows/deploy.yml  # Pages: build → 404.html fallback → deploy (no generation!)
├── .github/workflows/ci.yml      # PR verify: check:layout + lint + test + build (no generation!)
├── .github/workflows/portfolio-gen.yml  # Headless agent generation (workflow_dispatch) → PR only
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
npm run compile:layout   # design/layout.yaml → src/content/layout.json (Zod-validated)
npm run check:layout     # Fail if layout.json is stale vs layout.yaml (runs in CI)
npm run gen:layout [-- --audience=<recruiter|hiring-manager|peer|default>]
                  # Seed design/layout.yaml draft from local OCT (OCT_URL, default http://localhost:10000)
                  # then compile. Output must be reviewed and committed — never runs in CI
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
| MCP client | `@modelcontextprotocol/sdk` |
| Styling | Tailwind v4 CSS-first + shadcn/ui + OKLCH tokens |
| Animation | motion (`motion/react`), respects reduced motion |
| Markdown | react-markdown + remark-gfm (prose block) |
| Diagrams | mermaid (lazy chunk, archDiagram block) |
| Tests | Vitest |
| Linter | oxlint |
| Layout source | `design/layout.yaml` (yaml pkg) → `compile:layout` → `layout.json` |
| Layout generation | tsx seed script → OCT `/portfolio/layout`; agent flow via `portfolio-gen` Claude Code plugin (OpenCat-Mcp-Full) |
| Deploy | GitHub Pages via Actions (SPA 404 fallback) |

## Generation Pipeline (headless agent)

Two modes, one contract — both end in a PR (never a push to `main`):

- **Local:** install the harness plugin once —
  `claude plugin marketplace add C:\OpenCat\Secret\OpenCat-Mcp-Full` then
  `claude plugin install portfolio-gen@opencat-oct` — and run
  `/portfolio-gen "<brief>"` in a Claude Code session here. The agent edits
  `design/layout.yaml` (and can create new block types via the block-authoring
  checklist), runs the full gate, then branches + opens a PR with `gh`.
  With a local OCT running, it pulls live context (`get_design_context`,
  `get_projects`, `get_star_stories`); otherwise it uses committed `design/` files.
- **Pipeline:** `gh workflow run portfolio-gen.yml -f brief="..." -f audience=recruiter`
  (or Actions UI). Uses `anthropics/claude-code-action@v1` with the plugin
  sparse-checked-out from OpenCat-Mcp-Full. Requires repo secrets
  `ANTHROPIC_API_KEY` and `OCT_REPO_TOKEN` (read-only PAT for OpenCat-Mcp-Full).
- Guardrails: `ci.yml` must pass on the PR (layout sync, lint, tests, build,
  mirror-drift); recommend branch protection on `main` requiring it.

### External Context Sources
- **Declaration:** Declared in `design/sources.yaml` (Zod-validated by `scripts/sources-schema.ts` in tests).
- **OCT Sourcing:** Resolves via `fetch_external_context` and `get_project_context` tools (using proxy layer SSRF client).
- **CI Sourcing (OCT offline):** Falls back to `gh api` for github repos (using GITHUB_TOKEN), `WebFetch` for URLs and GDocs, and skips notion/search.
- **Rule:** Never block generation on an unreachable source; note skipped/failed sources in the PR body.

## Deployment Notes

- One-time repo setup: GitHub → Settings → Pages → Source = **GitHub Actions**.
- The Action only builds; `layout.json` generation stays behind the commit gate (never in CI).
- Deep links work via `cp dist/index.html dist/404.html` in the workflow.
