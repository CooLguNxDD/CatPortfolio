# CatPortfolio — Project Index

## Summary

- Personal portfolio SPA: **React 19 · Vite 8 · TypeScript 6 · Tailwind v4 · TanStack Router/Query · Zustand · Zod v3 · three.js · Recharts 3**.
- **Self-rendering:** the page is data. A Zod-validated layout spec (`src/content/layout.json`) flows through a whitelisted block registry (`src/render/registry.ts`). Layout grows; component code doesn't change. Unknown block type = skipped, never crashes.
- **One front door on `/`:**
  - **Fish tank (default)** — a WebGL aquarium where each fish is a project/track. Falls back to the text layout when WebGL2 is missing, `prefers-reduced-motion` is set, no tank is authored and no fish exist, or `?v=text`. The default bake authors four WelTel specimens (`weltel-ai`, `weltel-devops`, `weltel-mobile`, `weltel-platform`). An authored `fishTank` with `fish: []` still opens an empty aquarium.
  - **Text matrix (`?v=text`)** — recruiter index (`FishFlatGrid`, highlight then timeline years) + chat panel + live layout. Ask questions are stored in `portfolio_ask_turns` (length-capped; that is not consent). Canonical/OG URL is the absolute `?v=text` link.
- **`/ask`** — kept as a `beforeLoad` redirect to `/` (same search params) so old links still resolve. Bare `/ask` now opens the tank, matching the single front door.
- Layout source of truth is `design/layout.yaml` → `npm run compile:layout` → `src/content/layout.json`. CI verifies sync (`check:layout`), never generates.
- Backend is **OpenCat Tunnel (OCT)**, an MCP + REST server. All calls degrade to the baked snapshot — the site never hard-fails on a backend outage (it backs a public HR-facing link).
- Deployed to GitHub Pages (`base: "/CatPortfolio/"`); also runs under local Docker/nginx on **localhost:11000**.

## Dev Rules

1. Update this file after every structural change (routes, components, deps, contracts).
2. New component → add to Project Structure. New dependency → add to Tech Stack.
3. `@/` alias for cross-directory imports; relative within a directory.
4. Gate before commit: `npm run check:layout && npm run lint && npm run test && npm run build`. Theme JSON is synced from OCT with `npm run gen:themes` when palettes change (manual, like `gen:fragments`).
5. **Never edit `src/content/layout.json` directly** — edit `design/layout.yaml`, run `npm run compile:layout`.
6. **New block type checklist:** Zod member in `schema.ts` → reviewed component in `src/blocks/` → barrel export → registry entry → tests → Python mirror sync (or a `design/pending-mirror/<date>-<type>.md` note). Enforced by `scripts/__tests__/mirror-drift.test.ts` against `design/mirror-manifest.json`.
7. Generated/agent changes go through a PR on `portfolio-gen/<date>-<slug>`. Never push `main`, never touch `.github/workflows/deploy.yml`.
8. **State ownership** (see `.claude/skills/react-app-guide`): shareable state → URL search params; server payloads → TanStack Query; device prefs → persisted Zustand; transient UI → non-persisted Zustand. Do not duplicate across layers.
9. `graphify-out/` and `test-results/` are generated local artifacts; both are gitignored and excluded from Docker build context.
10. - **test**: test should run on docker container unless it is a worktree

## Routes & URL State

`src/router.tsx` — code-based tree, `basepath = import.meta.env.BASE_URL`. Both routes share `demoSearchSchema`:

| Param | Meaning |
|-------|---------|
| `j`   | Job bake short id (`{slug}_{≥10 alnum}`), minted by the OCT "bake & send" pipeline. Fetches `GET /api/portfolio/public/layout/{j}`; falls back to baked snapshot on any failure. |
| `v`   | `tank` \| `text` view mode. Absent → tank when capable. |
| `f`   | Focused fish slug (deep-linkable specimen). |
| `scrollTo` | One-shot block id for text/matrix `scrollIntoView` (cleared after the target is in the DOM). |

- `/` → `routes/HomePage.tsx` — `usePageLayout` resolves demo (`?j=`), live default, or a patched working copy. Tank mode renders `FishTankStage` (Ask dock + chrome); text mode is the two-column ask + matrix.
- `/ask` → `beforeLoad` redirect onto `/` with the same search params. No page component.
- `App.tsx` shell — nav, theme + accent switchers, demo chip. Re-bakes `?j=` into the URL if the session store has a short id but the URL lost it, preserving `v`/`f`/`scrollTo` via `lib/demoSearch.ts` (`mergeDemoSearch` / `clearDemoSearch`).

## Fish Tank

Ported from the Open Design `tank3d.html` prototype. See `design/fish/README.md` for the ownership table.

| Concern | Module |
|---|---|
| Specimens from a `fishTank` block, or derived from any layout | `fish/sceneFromLayout.ts`, `blocks/fishFromLayout.ts` |
| Filter / lit / dim math (pure) | `fish/matchFish.ts` |
| Domain → mesh form | `fish/formFromDomain.ts`, `fish/speciesMeshes.ts` |
| Swim + camera math (pure, testable) | `blocks/fishTankLayout.ts` |
| Boids steering + cursor intent (pure) | `fish/fishBoids.ts`, `fish/cursorIntent.ts` |
| Per-fish behaviour states + integrated swim body (pure) | `fish/fishBehavior.ts`, `fish/fishLocomotion.ts` |
| Theme tokens, quality tiers, circadian cycle | `blocks/fishTankTokens.ts` (`resolveCircadianPhase` / `applyCircadian`) |
| Numeric tuning: camera feel, geometry placement, particles, interaction/highlight formulas | `blocks/fishTankConfig.ts` (`resolveFishTankTuning(light)` for the day/night-varying subset — opacities, fish emissive floors, accent/bed light intensity) |
| GPU shoal — InstancedMesh, vertex-shader path + spine | `fish/minnowField.ts`, `fish/shaders/spineDeform.ts` |
| Post chain (bokeh → bloom → wobble → output) | `fish/postprocessing/tankComposer.ts` |
| Optics: Beer-Lambert fog chunk, world-space caustics | `fish/shaders/absorption.ts`, `fish/shaders/causticProjection.ts` |
| Spatial audio (HRTF panner, waterline filter) + its math | `fish/fishAudio.ts`, `fish/audioMath.ts` |
| Sonar / bathymetry projection (pure) | `fish/sonarProjection.ts`, `fish/bathymetry.ts` |
| Transient UI: scene, chrome, query, domain, bake dim, depth lock, sonar | `store/fishTankSlice.ts` (non-persisted; rAF smoothstep dive/surface) |
| Controller & hotkeys composing all of the above | `hooks/{useFishTank,useTankHotkeys}.ts` |
| Views (DOM) | `components/FishTankStage.tsx`, `components/fish/{FishTankChrome,FishDossier,FishFlatGrid,SonarMiniMap,DepthScrubber,ShortcutsModal}.tsx` |
| WebGL only — sole importer of `three` | `blocks/FishTankCanvas.tsx` (lazy chunk; `manualChunks` splits `three` out of index) |
| Registry block | `blocks/FishTank.tsx` → registry `fishTank` |

- Contract: `props.fish[]` ≤ 40 specimens, `species: DomainId` (`ai|devops|mobile|platform`), bounded `size/depth/speed/glow` ∈ [0,1], `school` 0..15. Theme by `tankTheme` id — **never raw colours**.
- Scene states: `surface` (cat on the rim) ↔ `tank` (submerged), lerped by `stageProgress`. Chrome toggles `3d` ↔ `flat` DOM index.
- `highlightSlugs` / `curationLabel` drive bake dimming — non-highlighted fish fade when a job bake is active.
- Failures isolate via `components/FishTankErrorBoundary.tsx`; per-block throws via `render/BlockErrorBoundary.tsx`.
- **Optics.** `installBeerLambertFog()` (called once from the canvas) overrides three's `fog_fragment` chunk with per-wavelength extinction — red dies ~17x faster than blue, and `scene.fog.density` stays the strength knob. It is a chunk override, **not** a post pass: a depth-sampling pass reads the same target the composer writes, which WebGL rejects as a framebuffer feedback loop. Caustics are injected world-space into standard materials via `patchMaterialCaustics` so they ride rocks/coral/fish, not just the seabed plane.
- **Quality tiers gate the post chain.** `tier: "high"` → bokeh + bloom + wobble; `tier: "low"` (coarse pointer / dense small screens) → `RenderPass → OutputPass` only, so mobile keeps the old single-render cost. `timeScale: 0` (reduced motion) freezes every shader clock; the shell also drops the tank entirely for reduced-motion users.
- **Fish are swimmers, not path samples.** `computeFishPose` is a *target*; `fish/fishLocomotion.ts` owns each fish position, velocity and heading. It matches the target velocity as well as chasing its position (so a fish arrives *on* its path at path speed instead of braking onto it), and it only ever reads steering as a heading and a throttle — the body makes way along its own facing and can never slide, stall or pivot in place. Every input goes through it: boids output is a velocity bias, never a displaced target, because a separation term flips sign as two fish pass and a flipping target spins the fish. Shoal bias gain is 0.18 x cruise, measured: above ~0.2 the shoal term beats the path and fish wag.
- **Feeding is a state machine.** `fish/fishBehavior.ts`: `cruise → hunt → feed → sated → cruise`, with `focused` outranking all of them. Sense 28 / release 34 gives hysteresis on a sinking pellet; a 6 s hunt timeout covers pellets resting below the swim band; the 2.5 s sated cooldown stops one pellet holding the whole shoal. Behaviour decides *what a fish wants*; locomotion decides how fast it can get there.
- **Ambient shoal.** 240 (high) / 80 (low) commit-minnows in one `InstancedMesh`; orbit path *and* spine wave run in the vertex shader, so the frame loop writes one uniform regardless of population. Hero specimens keep their CPU spine rig — their materials, glow lights and raycast targets hang off those nodes.
- **HUD observations.** Sonar contacts ride the bus at ~10Hz (`tank:sonar`), the dossier anchor and dive progress at 60fps; all three are written to DOM refs, never React state. `tank:depth` (bathymetry) and `view:sonar` are commands, handled in `useFishTank`.
- **Depth is the timeline.** `fish/bathymetry.ts` maps the existing `depth` ∈ [0,1] to year bands — no per-fish year field, so the layout schema and its Python mirror are untouched.
- **Audio.** Positional cues pass `at` on `audio:fx` and route through an HRTF `PannerNode`; the listener tracks the camera at ~15Hz and `setImmersion` sweeps a lowpass 20kHz → 450Hz across the waterline. Still gated behind the user's sound toggle (autoplay policy).

## Modular 3D Cat Subsystem (`src/object3D/Cat/`)

Extensible 2D/3D skeletal rigging and procedural animation framework:

| Concern | Module | Description |
|---|---|---|
| Linear Transformations & Math | `math/LinearTransform.ts` | 4x4 Affine matrices, shear matrices, continuous arcsin look-at Euler angles, smoothstep FOV attention attenuation, hard $\pm 90^\circ$ angular limits. |
| Harmonic Oscillators | `math/SpringDamper.ts` | 1D & 3D spring damper physics for natural biological smoothing and impulse reactions. |
| Skeletal Tree & Bone Hierarchy | `rig/RigBone.ts`, `rig/CatRig.ts` | Forward kinematics bone nodes with anatomical rotation/translation clamps. |
| Layered Animation Engine | `animations/CatAnimationEngine.ts` | Extensible orchestrator running frame ticks across enabled weighted layers. |
| Gaze Tracking Layer | `animations/GazeTrackingLayer.ts` | Pointer/target tracking with spring-damped head yaw/pitch and eye socket translations. |
| Stochastic Blinking Layer | `animations/BlinkLayer.ts` | Poisson-distributed stochastic eyelid blinks with double-blink probability. |
| Purr Reaction Layer | `animations/PurrReactionLayer.ts` | Click-reactive 26Hz purr resonance, amplitude decay, and haptic feedback. |
| Idle Breathing & Tail Wave | `animations/BreathingLayer.ts` | Harmonic chest expansion and 7-segment fluid sinusoidal tail travelling wave. |
| Stylized Low-Poly Geometry | `mesh/CatMeshBuilder.ts` | Procedural Three.js Cat geometry bound to bones with glowing golden eyes. |
| Giant Perched Mascot | `mesh/catGiantMesh.ts` | Rim-perched giant cat with glowing/dilating pupils and hunting swat strike. |
| React & DOM Views | `components/Cat3DView.tsx`, `components/CatDOMCompanion.tsx` | Isolated WebGL canvas view & draggable dev companion widget (`import.meta.env.DEV`). |

- **Zero-Discontinuity Look-At**: Eliminates atan2 branch cuts along negative axes via forward-hemisphere projection and $\arcsin$ vector normalization.
- **Rear Attention Attenuation**: When targets move behind the cat ($\Delta z < 0$), a cosine-based smoothstep falloff smoothly relaxes the head to neutral forward gaze, preventing singularity jitter when orbiting the camera around to the cat's back.
- **Continuous Camera Unprojection**: `FishTankCanvas.tsx` continuously recalculates 3D cursor unprojection on camera orbit/pan/dive.

## Layout Contract

`src/content/schema.ts` is the single Zod source. Block union (19 types, all registered):

`hero · projectGrid · statStrip · starStory · archDiagram · codeSnippet · prose · chart · timeline · flowAnim · kpiGrid · comparison · quickActions · card · mcpSandbox · costSim · composite · scene2d · fishTank`

`chart` renders via lazy Recharts (`blocks/charts/RechartsBody`, kind registry). Colors are `--chart-1..5` aliases of theme chroma. Schema is still `kind` + `series[]`. Kind dispatch uses `CHART_KINDS.includes` (not `in` — prototype walk). `seriesKey` always folds the series index so duplicate names stay distinct; cartesian labels come from the longest series and missing points are `null` (gap), not `0`. Do not put `role="img"` on `ChartContainer` when the child uses `accessibilityLayer`.

- `composite` — recursive container DSL (`grid|stack|split|cards`), depth ≤ 3, ≤ 40 nodes, typed leaves (`LEAF_KINDS`).
- `scene2d` — declarative canvas-2D presets (`orbit|pulse-grid|particle-field`), not a drawing DSL.
- `meta` carries `audience`, `theme`, `accent`, allowlisted `themeOverrides` (`THEME_VAR_ALLOWLIST`, sanitized), `sources`, `mode`, `dag`, and job-bake framing (`jobCompany`, `jobRole`, `tailored`, `contentFingerprint`, `recipeId`, …).
- Mirrored server-side in `OpenCat-Mcp-Full/plugins/portfolio_plugin/schema/ui_layout_schema.py` (canonical mirror). `design/mirror-manifest.json` is canonical for the drift test; a vendored copy lives in OCT's test fixtures and must be updated in the same PR.
- Pending sync today: `design/pending-mirror/2026-08-10-fishTank.md` (BE `fish_tank_enabled` flag, default off).

## Backend Integration (OCT)

`src/config/runtimeConfig.ts` fetches unhashed `public/config.json` before first render (`octBaseUrl`, `mcpApiKey`, `askTimeoutMs`, default 600000). Patchable post-deploy without a rebuild — GitHub Pages has no build-time env injection. Falls back to `VITE_OCT_URL` / `VITE_OCT_API_KEY` / `VITE_ASK_TIMEOUT_MS`, then safe defaults. Docker injects the same fields via `docker-entrypoint.sh` (`OCT_BASE_URL`, `OCT_API_KEY`, `OCT_ASK_TIMEOUT_MS`).

Loaders in `src/content/loadLayout.ts` — every one falls back to `loadBaked()`:

| Function | Call |
|---|---|
| `loadBaked()` | Committed `layout.json` singleton |
| `loadLiveWithStatus(audience)` | `GET {VITE_OCT_URL}/portfolio/layout?audience=` (build-time env only — no runtime config, returns snapshot when unset) |
| `loadLayoutForQuery(text)` | `GET /api/portfolio/public/layout-for-query` — fast REST, server-side audience inference |
| `composeLayoutLive(body)` | `POST /api/portfolio/public/compose` — fragment compose, no MCP auth |
| `loadJobLayout(jobId)` | `GET /api/portfolio/public/layout/{jobId}` — accepts bare layout or `{layout, …}` envelope |

- **Chat-driven re-render:** `ChatPanel` fires `loadLayoutForQuery` alongside (not blocking) each turn, then `store/applyLayout.ts::applyLayoutToCache` dual-writes into the Query cache (`demoLayoutQueryKey(shortId)` or `["layout","default"]`) and the demo session store — no invalidate/refetch. Agentic path Zod-validates `response.carry.layout`; a registered `meta.theme` is applied through the preferences store.
- **MCP:** `api/octClient.ts` uses `StreamableHTTPClientTransport`. `callTool` passes SDK `RequestOptions` (`timeout`, `resetTimeoutOnProgress: true`, `onprogress`) — **not** a bare `Promise.race`. Without `onprogress` the client sends no `progressToken`, the server skips keepalives, and long agent turns die at the 60s SDK default.
- **One-shot CLI agent:** when OCT's core LLM is `claude-cli`/`agy-cli`, `askOct` still calls `run_graph` once; the server short-circuits to a headless CLI spawn and returns `meta.cli`. `extractCliMeta` renders a `one-shot cli · claude|agy` pill. Layout carry is best-effort there — REST `loadLayoutForQuery` stays the fallback.
- **Agent status:** `api/agentStatus.ts` polls public `GET /api/portfolio/public/agent-status` (`{job_id, status, updated_at}` only — never applicant PII), rendered by `AgentStatusPill` at `refetchInterval: 8000`. Polling by design; no SSE.
- **nginx (`nginx.conf`, `nginx.ngrok.conf`):** serves the SPA under `/CatPortfolio/` and reverse-proxies `/api/` and `/mcp` to `host.docker.internal:10000` so the browser stays same-origin. 600s read/send timeouts; Authorization forwarded on `/mcp`.

## Project Structure

```
CatPortfolio/
├── src/
│   ├── main.tsx                # Root: runtime config gate → ThemeProvider > QueryClient > Router
│   ├── router.tsx              # Route / + /ask→/ redirect, demoSearchSchema (j / v / f)
│   ├── App.tsx                 # Shell: nav, theme + accent switcher, demo chip, Outlet
│   ├── index.css               # Tailwind v4 CSS-first config + OKLCH tokens + shadcn bridge
│   ├── config/runtimeConfig.ts # public/config.json fetch (octBaseUrl, mcpApiKey, askTimeoutMs)
│   ├── content/
│   │   ├── schema.ts           # Zod LayoutSchema — 19-block union + meta
│   │   ├── layout.json         # Compiled, committed, gated (never hand-edit)
│   │   └── loadLayout.ts       # baked / live / for-query / compose / job loaders
│   ├── render/
│   │   ├── registry.ts         # type → component whitelist (`satisfies` completeness)
│   │   ├── LayoutRenderer.tsx  # Matrix bands when meta.dag; else stagger + span grid
│   │   ├── BlockErrorBoundary.tsx
│   │   └── LazyChunkBoundary.tsx  # retryable Suspense isolate for lazy charts in Composite
│   ├── blocks/                 # Whitelisted block components + barrel (index.ts)
│   │   ├── Hero Card ProjectGrid StatStrip StarStory KpiGrid Timeline Comparison
│   │   ├── Chart (+ charts/: toChartData, kinds registry, lazy RechartsBody) FlowAnim ArchDiagram MermaidDiagram (lazy) Prose CodeSnippet
│   │   ├── QuickActions Composite McpSandbox CostSimulator
│   │   ├── Scene2d + Scene2dCanvas + scene2dLayout.ts
│   │   ├── FishTank + FishTankCanvas + fishTankLayout.ts fishTankTokens.ts fishTankConfig.ts fishFromLayout.ts
│   │   └── primitives/         # Metric Quote Sparkline MarkdownText Divider Progress IconTile BadgeCloud
│   ├── object3D/               # 3D character avatars & forward kinematics rigs
│   │   └── Cat/                # Modular 2D/3D Cat Rig & Animation Engine
│   │       ├── math/           # LinearTransform.ts (affine, continuous arcsin look-at, FOV falloff, ±90° clamp) · SpringDamper.ts
│   │       ├── rig/            # RigBone.ts · CatRig.ts · types.ts (bone hierarchy, anatomical constraints)
│   │       ├── animations/     # AnimationLayer.ts · GazeTrackingLayer.ts · BlinkLayer.ts · PurrReactionLayer.ts · BreathingLayer.ts · CatAnimationEngine.ts
│   │       ├── mesh/           # CatMeshBuilder.ts · catGiantMesh.ts (perched giant mascot)
│   │       ├── components/     # Cat3DView.tsx · CatDOMCompanion.tsx (dev-only floating companion)
│   │       └── index.ts        # Module export barrel
│   ├── fish/                   # Pure models: sceneFromLayout matchFish formFromDomain speciesMeshes
│   │                           # fishBoids cursorIntent audioMath sonarProjection bathymetry minnowField
│   │                           # shaders/ (noiseCommon water caustic godRay spineDeform absorption
│   │                           #   causticProjection underwaterPass) · postprocessing/tankComposer
│   │                           # components/ (HoloReticle ArchHologram) · catMesh.ts (re-export from @/object3D/Cat)
│   ├── routes/                 # HomePage viewMode.ts
│   ├── components/
│   │   ├── FishTankStage.tsx FishTankErrorBoundary.tsx
│   │   ├── fish/               # FishTankChrome FishDossier FishFlatGrid SonarMiniMap DepthScrubber
│   │   ├── chat/               # ChatPanel ChatMessage
│   │   ├── ThemeProvider.tsx AgenticHeader.tsx SourceCitations.tsx AgentStatusPill.tsx
│   │   └── ui/                 # shadcn: button card chart (Recharts ChartContainer)
│   ├── store/                  # index.ts + preferences (persisted) / layout / fishTank / chat slices, applyLayout.ts
│   ├── hooks/                  # useFishTank useDemoLayout usePageLayout useLayoutDag useLayoutTheme
│   │                           # useThemeRegistry useThemeTokens useLayoutSessionHydrated
│   ├── api/                    # octClient harness instructions agentStatus
│   ├── themes/                 # cozy / neon / paper + Catppuccin; globbed by registry.ts (isLight from --bg)
│   ├── styles/                 # matrix.css (level bands, lighting) · fish-tank.css
│   ├── lib/                    # utils.ts (cn) · demoSearch.ts
│   └── types/three.d.ts
├── design/                     # Generation source of truth (human/agent editable)
│   ├── layout.yaml             # Matrix + fish tank source → layout.json
│   ├── design.md               # Design contract: tokens, voice, audience, block + matrix rules
│   ├── fragments.json          # Cached OCT fragment catalog (gen:fragments; includes themes: ids)
│   ├── sources.yaml            # External context sources (Zod-checked in tests)
│   ├── mirror-manifest.json    # Canonical mirror guard data
│   ├── pending-mirror/         # Block types awaiting OCT-side Pydantic sync
│   ├── fish/                   # tank3d extraction notes (README, body/css/js)
│   ├── prototypes/             # Layout drafts + HTML prototypes
│   └── sampleDesign/
├── scripts/                    # compile-layout · gen-layout · gen-fragments · gen-themes · sources-schema
├── .claude/skills/             # react-app-guide · react_generator · agy-tdd-pipeline
├── .github/workflows/          # ci.yml · deploy.yml · portfolio-gen.yml
├── public/                     # favicon.svg · config.json (runtime, unhashed)
├── Dockerfile docker-compose.yml docker-entrypoint.sh nginx.conf nginx.ngrok.conf
└── vite.config.ts              # base /CatPortfolio/, @ alias, port 11000, three manualChunk
```

## Essential Commands

```bash
npm run dev              # Vite dev server at http://localhost:11000/CatPortfolio/
npm run build            # tsc -b + production build
npm run preview          # Preview the build (port 11000)
npm run test             # Vitest (content, registry, fish, store, scripts)
npm run lint             # oxlint
npm run compile:layout   # design/layout.yaml → Zod validate → src/content/layout.json
npm run check:layout     # Fail if layout.json is stale (CI)
npm run gen:layout [-- --audience=recruiter|hiring-manager|peer|default]
                         # Seed layout.yaml from local OCT, then compile. Never in CI
npm run gen:fragments    # Refresh design/fragments.json from OCT (manual only)
npm run gen:themes       # Pull theme JSON from OCT design-context theme_defs (manual only)
npm run check:themes     # Diff on-disk src/themes vs live OCT (needs OCT_URL; not CI)
```

**Docker:** `docker compose up --build` → http://localhost:11000/CatPortfolio/. After editing `design/layout.yaml`, run `compile:layout` **and rebuild the image** — the bind mount will not update an nginx root baked at build time.

## Tech Stack

| Layer | Tool |
|-------|------|
| Framework | React 19 |
| Build | Vite 8 (`base: /CatPortfolio/`) |
| Language | TypeScript 6 (strict, verbatimModuleSyntax) |
| Routing | TanStack Router (code-based) |
| Server state | TanStack Query v5 |
| Client state | Zustand (persisted prefs + transient slices) |
| Validation | Zod v3 — fail loud on layout |
| 3D | three.js (lazy `three` chunk, fish tank only) |
| MCP client | `@modelcontextprotocol/sdk` |
| Styling | Tailwind v4 CSS-first + shadcn/ui + radix-ui + OKLCH tokens |
| Animation | motion (`motion/react`), respects reduced motion |
| Markdown | react-markdown + remark-gfm |
| Diagrams | mermaid (lazy chunk) |
| Icons / fonts | lucide-react · `@fontsource-variable/geist` |
| Tests | Vitest |
| Linter | oxlint |
| Layout pipeline | `yaml` + tsx scripts |
| Deploy | GitHub Pages via Actions (SPA 404 fallback) |

## Generation Pipeline (headless agent)

Two modes, one contract — both end in a PR, never a push to `main`:

- **Local:** `claude plugin marketplace add C:\OpenCat\Secret\OpenCat-Mcp-Full`, then `claude plugin install portfolio-gen@opencat-oct`, then `/portfolio-gen "<brief>"`. The agent edits `design/layout.yaml` (and may add block types via the checklist above), runs the full gate, branches, opens a PR with `gh`. With OCT running it pulls live context (`get_design_context`, `get_projects`, `get_star_stories`); otherwise it uses committed `design/` files.
- **Pipeline:** `gh workflow run portfolio-gen.yml -f brief="..." -f audience=recruiter`. Uses `anthropics/claude-code-action@v1` with the plugin sparse-checked-out from OpenCat-Mcp-Full. Needs repo secrets `ANTHROPIC_API_KEY` and `OCT_REPO_TOKEN`.
- `ci.yml` must pass on the PR (layout sync, lint, tests, build, mirror-drift). Branch protection on `main` recommended.

**External context sources:** declared in `design/sources.yaml` (Zod-validated in tests), resolved via OCT `fetch_external_context` / `get_project_context`. With OCT offline, CI falls back to `gh api` for GitHub repos, `WebFetch` for URLs/GDocs, and skips notion/search. Never block generation on an unreachable source — note skipped sources in the PR body.

## Content Streams (do not mix)

- **WelTel job work** (employer; AI / DevOps / Mobile / Platform tracks — the default tank school, sourced from `Secret/secrets_projects/*_contribution.md`)
- **OpenCat Tunnel** (personal OSS backend/MCP platform)
- **CatPortfolio** (this SPA)

## Deployment Notes

- One-time: GitHub → Settings → Pages → Source = **GitHub Actions**.
- The Action only builds; layout generation stays behind the commit gate, never in CI.
- Deep links work via `cp dist/index.html dist/404.html` in the workflow.
