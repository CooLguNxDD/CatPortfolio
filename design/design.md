---
# Design tokens the agent must respect when authoring themes or block components.
# Same convention as OpenCat-Mcp-Full/frontend/cat-admin-frontend/DESIGN.md frontmatter.
theme:
  name: "Cat Portfolio — Cozy Cyberpunk"
  color_space: oklch
  source_of_truth: src/themes/*.theme.json   # auto-registered via import.meta.glob
  default_theme: cozy
  rules:
    - Components use CSS custom properties injected by ThemeProvider — never hardcode colors.
    - All color tokens are OKLCH.
    - Radii, shadows, fonts, padding come from theme vars.
typography:
  family: "Geist Variable (via @fontsource-variable/geist)"
motion:
  library: "motion (motion/react)"
  rule: Always respect useReducedMotion.
---

# Design contract

This file plus `layout.yaml` is the shared context a generation agent reads
before touching the portfolio. Keep it current — it is the CI-degradation
fallback when the OCT MCP server is unreachable.

## Voice & tone

- First-person, confident, playful-but-precise ("Andrew the cat" persona).
- Lead with systems substance: Postgres-first, agent infra, MCP.
- No filler adjectives; metrics beat superlatives.

## Audience guidance

| Audience | Lead with | Emphasize |
| --- | --- | --- |
| recruiter | hero + statStrip | breadth, impact metrics |
| hiring-manager | starStory | STAR outcomes, ownership |
| peer | archDiagram + codeSnippet | technical depth, design choices |
| default | balanced | one of everything |

## Block usage rules

- One `hero` per layout, always first.
- `statStrip` values are short strings ("144 → 2–3"), labels lowercase.
- `projectGrid` summaries ≤ 2 sentences; every project needs ≥ 1 tag.
- Prefer **`card`** (domain-tinted) for matrix project tiles; `projectGrid`
  remains for inventory grids and reuses the same Card shell.
- `card.domain`: `ai` | `devops` | `mobile` | `platform` (Open Design chroma).
- `card.accent` or `meta.accent`: global 5-accent axis (`amber`|`pink`|`neon`|`cyan`|`violet`).
- `starStory` fields are single sentences (situation/task/action/result).
- `archDiagram` prefers `kind: mermaid`; `svg` only for pre-rendered assets.
- `codeSnippet` code must be real code from this repo or OCT, never invented.
- `prose` is GitHub-flavored markdown (remark-gfm: tables OK).

## Level-row matrix (`meta.dag`)

Open Design contract: **one horizontal band = one topological level**.

Default home bands (see `layout.yaml`):

| Level | Label | Typical nodes |
| --- | --- | --- |
| L0 | Intro | hero |
| L1 | Impact | kpiGrid |
| L2 | Projects | domain `card` tiles (ai / devops / mobile / platform) |
| L3 | Architecture · MCP sandbox | flowAnim + mcpSandbox |
| L4 | Charts · cost sim | costSim + chart + comparison |
| L5 | Proof | timeline + starStory |
| L6 | Deep dive | composite, archDiagram, codeSnippet, prose — **`cols: 1`** (one full-width row per component; do not pack deep-dive into a multi-column band) |
| L7 | Ask | quickActions / CTA |

```yaml
meta:
  dag:
    levels:
      - level: 0
        label: Intro
        nodes: [h1]
      - level: 2
        label: Projects
        nodes: [card-ai, card-devops, card-mobile]
      - level: 6
        label: Deep dive
        cols: 1
        nodes: [composite-master, a1, c1, pr1]
```

- Optional per-level `cols` (1–4): peer column count for that band. Omit = auto from node count.
- Edges only between adjacent levels in the story graph (documentation).
- Missing `meta.dag` → LayoutRenderer falls back to simple stagger (+ span grid).
- Scroll lighting is **viewport-aligned** (`useLayoutDag` focus line under sticky chrome), not only scroll-fraction thresholds.
- Sticky chrome: minimap + persona + tech filter (filters `card.tech` tokens).
- Ask route is a **split page** (chat dock + live canvas), never a home drawer.
- OCT agent compose stamps the same `meta.dag` when emitting full pages (`layout-design-builder` skill).

## New block types

Creating a new block type follows the block-authoring checklist (see the
`portfolio-gen` Claude Code plugin in OpenCat-Mcp-Full): Zod schema member +
component in `src/blocks/` + barrel export + registry entry + tests +
Python mirror sync (`design/pending-mirror/`) + CLAUDE.md update. The
runtime whitelist (`src/render/registry.ts`) and fail-loud `LayoutSchema`
are invariants — never bypass them.

## Deploy gate

All generated changes go through a PR (`portfolio-gen/<date>-<slug>` branch).
Never push to `main`. Never modify `.github/workflows/deploy.yml`.
