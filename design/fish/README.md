# Fish tank — modular architecture

Ported from Open Design **CatPortfolio Fish Tank** (`tank3d.html` + `schema.md` + `fish.json`).

## Ownership (react-app-guide)

| Concern | Where |
|---|---|
| Specimens + scene props | Layout `fishTank` block / `fishFromLayout` adapter · `fish/sceneFromLayout` |
| Filter / lit math | Pure `fish/matchFish` |
| Domain → mesh form | `fish/formFromDomain` + `fish/speciesMeshes` (procedural fallback) |
| LayerLab GLB load + cache | `fish/modelLoader` (asks the registry for paths; skeleton clone + palette) |
| 3D asset registry | `fish/assetRegistry` — bundles `src/fish/generated/fish-manifest.json` (from `convert:fish`), aliases domains (`ai→MantaRay`), loaders resolve `path` from the catalog |
| Per-rig +Z facing | `fish/gltfFacing` |
| High vs low GLB gate | `fish/gltfQuality` — high: GLB heroes/reef/ambient; low: procedural only |
| Seabed GLB scatter | `fish/seabedFlora` (high tier; AbortSignal + caustic patch) |
| Transient UI (scene, chrome, query, bake) | Zustand `store/fishTankSlice` (non-persisted) |
| Shareable focus / text view | URL `?f=` / `?v=` via TanStack Router |
| Server / bake layout | TanStack Query (`useDemoLayout`) |
| Controller | `hooks/useFishTank` |
| Views | `components/FishTankStage` + `components/fish/*` |
| WebGL only | `blocks/FishTankCanvas` (lazy; never imported by chrome) |
| GenUI registry block | `blocks/FishTank` → `render/registry` `fishTank` |

## Default WelTel school

Authored in `design/layout.yaml` as `fish-tank-1` from employer contribution reports:

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
