# React Web App Engineering Guide (CatPortfolio)

> **Scope**: Public portfolio SPA (Vite + TS) | **Target**: TanStack Router/Query · Zustand · mitt · shadcn/ui · motion · Tailwind CSS · Recharts 3 · three.js

This is **not** the admin console. Admin OAuth/playground/MCP-host patterns live in OpenCat-Mcp-Full's `react-app-guide`. CatPortfolio is a self-rendering layout: Zod `layout.json` → block registry. Unknown block types are skipped.

---

## 1. Stack Overview

| Layer | Technology | Purpose |
|---|---|---|
| Build & UI | Vite + TypeScript · shadcn/ui | Fast HMR, type-safety, accessible primitives |
| Styling & Router | Tailwind CSS v4 · TanStack Router (code-based `src/router.tsx`) | Design tokens, `j`/`v`/`f`/`scrollTo` search params |
| Client State | Zustand (persisted prefs + non-persisted layout/fish/chat) | Device prefs vs transient UI |
| Server State | TanStack Query v5 | Live/job layouts, agent status — never Zustand for server payloads |
| Signals | mitt `fishBus` | Fish focus/spawn without prop drilling |
| Series charts | Recharts 3 · `components/ui/chart.tsx` + `ChartConfig` | bar/line/area/donut/radar; theme via `--chart-1..5` |

---

## 2. Architecture Principles

* **Separation of Concerns**: *Models* (Zod schema) → *Views* (block components) → *Controllers* (hooks/stores) → *Services* (`api/octClient`, `content/loadLayout`).
* **State Ownership** (see `CLAUDE.md`):
  * **Shareable**: URL search params (`j`, `v`, `f`, `scrollTo`).
  * **Server Data**: TanStack Query (baked/live/job layouts). Dual-write via `applyLayoutToCache` — do not `setQueryData` inside a random `useEffect`.
  * **Preferences**: Zustand `localStorage` (theme, accent).
  * **Transient UI**: Zustand non-persisted (working layout, fish tank, chat).
  * **One-Way Signals**: `fishBus` (focus, spawn, sonar).
* **Anti-Patterns**:
  * ❌ Raw `fetch()` in block components (use `src/api/` / `loadLayout`).
  * ❌ Zustand for server data.
  * ❌ Hand-rolled SVG for series charts (`kind` bar/line/area/donut/radar).
  * ❌ Hardcoded `oklch(...)` in chart bodies — use `--chart-N`.

---

## 3. Project Structure

```text
src/
├── main.tsx · App.tsx · router.tsx
├── content/          ← schema.ts (Zod) · layout.json (compiled) · loadLayout.ts
├── render/           ← registry.ts whitelist · LayoutRenderer · layoutContext
├── blocks/           ← one component per block type + charts/
│   └── charts/       ← toChartData.ts · kinds.ts · bodies.tsx · RechartsBody.tsx (lazy)
├── components/ui/    ← shadcn: button, card, chart
├── store/            ← preferences (persisted) / layout / fishTank / chat
├── hooks/            ← usePageLayout useFishTank useDemoLayout …
├── api/              ← octClient harness agentStatus
├── themes/           ← *.theme.json globbed by registry.ts
└── index.css         ← OKLCH tokens + --chart-1..5 aliases
```

---

## 15. Charts (config-driven Recharts)

Series charts go through `src/components/ui/chart.tsx` (`ChartContainer` injects `--color-<key>` from a `ChartConfig`). Kind dispatch is `CHART_KIND_REGISTRY` in `blocks/charts/kinds.ts` — not a `switch` in `Chart.tsx` / `Composite.tsx`.

```ts
import { seriesToChartConfig, seriesToRows, type Series } from "@/blocks/charts/toChartData"

const config = seriesToChartConfig(series) // name → var(--chart-(i % 5))
const rows = seriesToRows(series)          // { label, [slug]: y }
```

Rules:

* Layout schema stays `kind` + `series[{name, points}]`. Do not add a `chartConfig` field — the renderer maps names.
* Lazy-load `RechartsBody` (Vite `manualChunks` splits `recharts`). Sparkline primitive stays SVG.
* `ChartFishHits` stays in `Chart.tsx` (outside the library): `aria-label`, `aria-controls="fish-tank"`, `data-slug`.
* Adding a Zod `kind` without a registry entry fails `chartKinds.test.ts`.
