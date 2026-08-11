# Portfolio layout prototypes

Drafts and visual prototypes live here. Production source of truth remains
`../layout.yaml` (compile → `src/content/layout.json`).

## Default matrix visual (Open Design)

- `default-matrix.html` — OD project `cat-portfolio-default-matrix` rebuild
  (WelTel job tracks + OpenCat Tunnel OSS + CatPortfolio SPA, three-stream labels).
- Preview in Open Design: project id `cat-portfolio-default-matrix`.

## open-cat-grok-fish-tank-prototype (Open Design · 2026-08)

- **OD project:** `CatPortfolio System Overhaul` (`cat-portfolio-system`)
- **Entry:** `prototypes/open-cat-grok-fish-tank-prototype.html` (hub default)
- **Repo mirror:** `open-cat-grok-fish-tank-prototype.html`
- **Role:** full-screen Three.js **page background** (fixed canvas + glass UI overlay)
- **Scene:** open-top low-poly glass tank · gravel/rocks · **23** seaweed stalks (vertex wave) ·
  cat on rim (dangling paw, wiggling tail) · **5** pastel fish (sine paths + `lookAt`) ·
  water opacity 0.4 · rising bubbles · paw ripple rings · mouse parallax · resize
- **Preview:** OD raw `…/prototypes/open-cat-grok-fish-tank-prototype.html`

## open cat grok prototype 1.0 (Open Design · 2026-08)

- **OD project:** `CatPortfolio System Overhaul` (`cat-portfolio-system`)
- **Entry:** `prototypes/open-cat-grok-1.0.html`
- **Repo mirror:** `open-cat-grok-1.0.html`
- **Audience:** programmers (dense skim, mono instrumentation, job/OSS stream chips)
- **Reusable kit:** glass chrome, surface cards, KPI tiles, scroll-reveal, stream chips
- **Bonus:** three.js low-poly game-dev sandbox (orbit, WASD cat agent, collectible orbs, portal)
- **Live port notes:** `src/styles/matrix.css` glass sticky chrome + `.mx-chip*`; `Hero.tsx` motion + chips
- Research refs: bento/glass portfolios, Framer motion patterns, Bruno Simon–style three.js heroes (kept small)

## Agentic Matrix v2 (Open Design · 2026-08)

- **OD project:** `cat-portfolio-agentic-matrix-v2` (`index.html`)
- **Repo mirror:** `agentic-matrix-v2.html`
- **Preview:** Open Design project *CatPortfolio Agentic Matrix v2*, or open the local OD raw URL when the daemon is running.
- **IA changes vs default:**
  - Research-backed skim: L0 position → L1 KPIs → L2 **capability matrix** (skills × streams)
  - L3 ranked cards with **OpenCat #1**, job/OSS chips, Pullfrog de-emphasized
  - L4 system flow + L5 **multi-chart evidence** (weight bars, AWS before/after, tool surface, persona paths)
  - L6 single STAR · L7 ask prompts
  - Sticky minimap + persona filters (recruiter / architect / exec)

## Streams (do not mix)

| Stream | Source | Kind |
|--------|--------|------|
| WelTel AI / DevOps / Mobile / Platform | `../../weltelprojects/*.md` | Employer / job |
| OpenCat Tunnel | `../../OpenCatTunnelProject/` | Personal OSS MCP platform |
| CatPortfolio | this repo | Personal agentic portfolio SPA |

## Cleared old drafts

Previous YAML drafts (`ai-systems`, `devops-cloud`, `mobile-platform`) were removed.

## Adding a prototype

1. Prefer Open Design HTML or layout YAML matching `LayoutSchema`.
2. Name by audience/domain slug, e.g. `weltel-ai-hm.yaml`.
3. Keep employer vs OSS labels explicit.
