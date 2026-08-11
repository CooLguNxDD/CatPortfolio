# Fish tank — modular architecture

Ported from Open Design **CatPortfolio Fish Tank** (`tank3d.html` + `schema.md` + `fish.json`).

## Ownership (react-app-guide)

| Concern | Where |
|---|---|
| Specimens + scene props | Layout `fishTank` block / `fishFromLayout` adapter · `fish/sceneFromLayout` |
| Filter / lit math | Pure `fish/matchFish` |
| Domain → mesh form | `fish/formFromDomain` + `fish/speciesMeshes` |
| Transient UI (scene, chrome, query, bake) | Zustand `store/fishTankSlice` (non-persisted) |
| Shareable focus / text view | URL `?f=` / `?v=` via TanStack Router |
| Server / bake layout | TanStack Query (`useDemoLayout`) |
| Controller | `hooks/useFishTank` |
| Views | `components/FishTankStage` + `components/fish/*` |
| WebGL only | `blocks/FishTankCanvas` (lazy; never imported by chrome) |
| GenUI registry block | `blocks/FishTank` → `render/registry` `fishTank` |

## Default WelTel school

Authored in `design/layout.yaml` as `fish-tank-1` from `secrets_projects` contribution reports:

| slug | domain |
|---|---|
| `weltel-ai` | AI |
| `weltel-devops` | DevOps |
| `weltel-mobile` | Mobile |
| `weltel-platform` | Platform |

Compile: `npm run compile:layout`.

## URLs

- Tank (default when WebGL + fish): `/CatPortfolio/`
- Text matrix: `?v=text`
- Focus specimen: `?f=weltel-ai`
- Flat chrome: use header **Flat** (store `chrome`, not URL)

## Open Design prototype

- Project: `catportfolio-fishtank`
- Entry: `tank3d.html` (full interaction contract)
- Mirror extract: `design/fish/tank3d-extract.{js,css}` (reference only)
