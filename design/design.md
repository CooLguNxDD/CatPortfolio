---
# Design tokens the agent must respect when authoring themes or block components.
# Same convention as Weltel-Mcp-Full/frontend/cat-admin-frontend/DESIGN.md frontmatter.
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
- `starStory` fields are single sentences (situation/task/action/result).
- `archDiagram` prefers `kind: mermaid`; `svg` only for pre-rendered assets.
- `codeSnippet` code must be real code from this repo or OCT, never invented.
- `prose` is GitHub-flavored markdown (remark-gfm: tables OK).

## New block types

Creating a new block type follows the block-authoring checklist (see the
`portfolio-gen` Claude Code plugin in Weltel-Mcp-Full): Zod schema member +
component in `src/blocks/` + barrel export + registry entry + tests +
Python mirror sync (`design/pending-mirror/`) + CLAUDE.md update. The
runtime whitelist (`src/render/registry.ts`) and fail-loud `LayoutSchema`
are invariants — never bypass them.

## Deploy gate

All generated changes go through a PR (`portfolio-gen/<date>-<slug>` branch).
Never push to `main`. Never modify `.github/workflows/deploy.yml`.
