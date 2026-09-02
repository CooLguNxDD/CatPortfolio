Two stacked commits from the grok + gemini pending-report pass, now against `main`.

## Commit 1 — recruiter-readable front door
- Sticky matrix chrome is minimap-only and opaque so the hero name is readable
- Live layout URL is `GET /api/portfolio/public/layout?audience=&tank=1`
- Text/mobile: project index first, Ask next, matrix last; one persist notice
- Dive animator resets to 0; mobile rim sits below 3D/Flat/Text
- Agent-status stops polling on 503; one `<main>`; Bake/curation gated to job bakes; light themes skip night water
- Header: larger accents, wider theme select, Home link removed

## Commit 2 — remaining report leftovers
- Latte/Paper `--hairline` darker than `--card` so borders show
- Live layout abort raised 4s → 15s
- Nameplates: `devops` → `OPS` (not `DEV`)
- Sonar: moving blips visual-only; static specimen list is the hit target
- Ask/dossier glass 88%; dossier repo link is a pill
- Snapshot source pill + offline chip tooltips

Not in this PR: giant cat mesh (art rewrite). `compile-layout` yaml/json drift on `main` is unchanged.

Supersedes the stacked #36/#37 pair; merge this one into `main`.
