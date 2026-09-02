# CatPortfolio frontend walkthrough — 2026-08-31

> **PR #36 verification (2026-08-31):** P0 + P1 + most P2 + Ask-intro P3 shipped on `portfolio-gen/2026-08-31-pending-report-fixes`. Still open: giant cat / `DEV` nameplates, sonar hit target. Live layout URL is fixed; this machine still snapshots because OCT exceeds the 4s abort. Full matrix: `../2026-08-31-pr36-verification.md`.

---

Playwright MCP pass over the live Docker image at `http://localhost:11000/CatPortfolio/`. Goal: find UX / layout / network improvements, not prove a specific PR.

This is a pending report. UI findings were **not** implemented. The Docker `config.json` permission crash **was** fixed so the walkthrough could run.

---

## Preconditions

| Item | Value |
|---|---|
| Date | 2026-08-31 |
| Target | CatPortfolio Docker (`catportfolio` → `localhost:11000`) |
| Image | rebuilt from local source after the entrypoint fix (`catportfolio-catportfolio`) |
| OCT | `open-cat-mcp-server` healthy on `:10000`; nginx proxies `/api/` and `/mcp` |
| Browser | Playwright MCP, desktop 1440×900 then mobile 390×844 |
| Prefs | existing `localStorage` key `cat-portfolio-preferences` (`theme: neon` → later switched to Latte) |
| Ask live-agent turns | not exercised (long `run_graph`; skill notes Ask is not fully browser-verifiable without a confirmed bake) |

Rebuild used:

```
cd CatPortfolio
docker compose build catportfolio
docker compose up -d catportfolio
```

The previous container was crash-looping (`Restarting (1)`) on:

```
/docker-entrypoint.sh: line 29: can't create /usr/share/nginx/html/config.json: Permission denied
```

That is a real production-shape bug, not a walkthrough artifact. Fix is in `docker-entrypoint.sh` / `Dockerfile` / `nginx.conf` / `nginx.ngrok.conf`: runtime config now writes `/var/cache/nginx/config.json` (nginx-owned) and the SPA locations alias that file. Confirmed: `GET /CatPortfolio/config.json` → 200, container restart stays up.

---

## Coverage summary

| Surface | Browser verified? | Result |
|---|---|---|
| Docker boot + `config.json` | yes | PASS (after fix) |
| Tank surface hero | yes | PASS (visual polish issues) |
| Tank dive + submerged HUD | yes | FAIL (chrome density, default curation chip) |
| Tank Ask dock | yes (open/close only) | FAIL (truncated copy, duplicate Ask) |
| Shortcuts modal | yes | PASS |
| Flat recruiter index | yes | PASS (strongest HR surface) |
| Text matrix + chat | yes | FAIL (hero overlay, chat-first layout) |
| Light theme (Latte) | yes | FAIL (same overlay; tank/chrome mismatch) |
| Mobile text 390×844 | yes | FAIL (Ask is the first screen) |
| Mobile tank | yes | FAIL (HUD collision, persisted dive) |
| Live layout fetch | yes (network) | FAIL (`/portfolio/layout` 404) |
| Agent status poll | yes (network) | FAIL (503 every 8s) |
| MCP `/mcp` proxy | yes (network) | PASS (200 / 202) |
| Send a live Ask turn | no | BLOCKED — not run |

---

## Steps

### 1. Tank default — `http://localhost:11000/CatPortfolio/`

Why this catches a regression: this is the public front door. Header, WebGL canvas, dive CTA, and live layout fetch all have to work on first paint.

**Expected:** header `🐱 Cat Portfolio`, view pills `3D` / `Flat` / `Text`, canvas `Interactive portfolio fish tank`, zero console errors.

**Observed:**
- Canvas, dive CTA, sonar, depth scrubber all present.
- Theme combobox showed **Neon Alley** (persisted prefs), not the design default Cozy.
- Header nav is logo + **Home** only (no Ask). Accent dots are 16px unlabeled.
- Two Ask entry points already (hero `💬 Ask` + later dock).
- Giant perched cat reads as a low-poly blob against the rest of the scene.
- Console: `GET /portfolio/layout?audience=default` → **404**, warning `[loadLayout] live layout failed, using snapshot`.

**Result: FAIL** — 2026-08-31 — `catportfolio-tank-surface.png`

### 2. Dive / submerged HUD

Why this catches a regression: dive is the primary 3D interaction; HUD must stay usable over the canvas.

**Expected:** surface hero hides; toolbar (search, domain chips, Ask/Feed/Audio/circadian/Bake/Shortcuts) usable; fish visible.

**Observed:**
- Dive works. Fish labels, sonar, year-band scrubber appear.
- Default public school shows **Employer contribution reports** + a **clear** chip — reads as an internal demo bake, not a public portfolio.
- Search placeholder `Ask the tank — mcp, kubernetes, planner` sits beside four domain chips in one crowded row; toolbar is ~123px tall.
- Duplicate Ask (hero still in the a11y tree with `aria-hidden=false` even when `data-off=true`, plus toolbar Ask).
- Sonar blips (`<g role="button" class="ft-sonar-blip">`) are animated and fail a normal click (`element is not stable`).

**Result: FAIL** — 2026-08-31 — `catportfolio-tank-submerged.png`

### 3. Ask dock (open / close, no send)

Why this catches a regression: Ask is the live-patch path; the dock has to be readable over the tank.

**Expected:** complementary `Ask Agent` panel with a complete intro, starter chips, enabled composer once text is entered.

**Observed:**
- Panel opens. Status `oct online` + `preview`. Starter chips work as buttons.
- Intro copy is **clipped at the start**: visible text begins `or a job fit — the page re-renders…`.
- Persist disclaimer (`portfolio_ask_turns`) is shown to the recruiter in-panel.
- Send stays disabled until input (correct). Close works.
- MCP: `POST /mcp` → 200 / 202. Layout-for-query was not fired (no send).

**Result: FAIL** — 2026-08-31 — `catportfolio-tank-ask.png`

### 4. Shortcuts modal

Why this catches a regression: `?` / Shortcuts is the discoverability path for hotkeys.

**Expected:** dialog with Aquarium & Interaction + Filters & Navigation groups; Esc dismisses.

**Observed:** matches. Space / F / M / `/` / 1–4 / Esc documented.

**Result: PASS** — 2026-08-31 — `catportfolio-shortcuts.png`

### 5. Flat recruiter index

Why this catches a regression: Flat is the no-WebGL HR path and should carry the same four specimens.

**Expected:** `Project index` + four WelTel cards with metrics/tags; domain filter.

**Observed:** cards are the strongest surface in the app (metrics, tags, domain). Filter row is readable at 1440px. Curation label `Employer contribution reports` still sits under the heading.

**Result: PASS** (with P2 copy nit) — 2026-08-31 — `catportfolio-flat.png`

### 6. Text mode — `?v=text`

Why this catches a regression: text mode is the canonical/OG URL and the recruiter matrix + chat column.

**Expected:** Ask column + `FishFlatGrid` + live `LayoutRenderer` matrix; hero name readable; one `<main>`.

**Observed:**
- Snapshot pill: `snapshot · 2026-08-10T20:00:00Z` (live layout never loaded).
- Chat column ~22rem with **two nested scrollbars**. Persist notice duplicated (page banner + panel).
- **P0:** DAG chrome `Story levels · 21% · Intro` and L0–L8 chips are painted **on top of** the hero. `Andrew Liang (the cat)` and the subtitle are unreadable. Source: `LayoutRenderer.tsx` (`Story levels ·`) over `Hero.tsx` (`mx-hero`).
- Nested landmarks: **three `<main>`** elements.
- Page is ~8252px tall; 19 layout blocks did mount (hero, KPI, cards, tank, sandbox, charts, timeline, CTA).

**Result: FAIL** — 2026-08-31 — `catportfolio-text-top.png`, `catportfolio-text-hero.png`, `catportfolio-text-bottom.png`

### 7. Light theme (Latte)

Why this catches a regression: light mode is a first-class theme; overlay/contrast bugs that hide on neon will show here.

**Expected:** readable hero, contrast on accents, tank chrome matching the theme.

**Observed:** Latte applies (`data-theme=latte`, `data-light=true`). Same hero overlay. Accent dots go low-contrast on the light header. Later, tank on Latte keeps a dark WebGL water column under light HUD.

**Result: FAIL** — 2026-08-31 — `catportfolio-text-light.png`

### 8. Mobile text — 390×844

Why this catches a regression: recruiters open the link on a phone.

**Expected:** project index or hero first; Ask available but not the whole first screen; no horizontal overflow.

**Observed:**
- No horizontal overflow (`scrollWidth` ≈ inner width).
- Accents and Dark/Light hide (`hidden sm` / `hidden md`); only the Theme `<select>` remains.
- **Ask is the entire first viewport.** Project cards and hero are below the fold.
- Persist notice is still the first body paragraph.

**Result: FAIL** — 2026-08-31 — `catportfolio-text-mobile.png`

### 9. Mobile tank — `?v=tank` at 390×844

Why this catches a regression: the default front door on a phone.

**Expected:** surface hero or a clear Dive CTA; one HUD row; tappable search/chips.

**Observed:**
- Store kept the desktop dive: page opened **already submerged**, no surface hero.
- 3D / Flat / Text pills sit **on top of** the rim card; `clear` is hidden under **Text**.
- Search truncates to `Ask the tank — mcp, k`.
- Domain chips stack over the canvas. Icon-only dock (labels dropped).
- Light Latte chrome + dark tank water.

**Result: FAIL** — 2026-08-31 — `catportfolio-tank-mobile.png`

### 10. Console + network (whole session)

Why this catches a regression: a page that *looks* right while 404/503 looping is the failure mode this pass exists to catch.

**Expected:** zero console errors *and* zero warnings (CatPortfolio target override). Public probes 200.

**Observed:**

| Request | Status | Notes |
|---|---|---|
| `GET /CatPortfolio/config.json` | 200 | after Docker fix |
| `GET /portfolio/layout?audience=default` | **404** | `loadLiveWithStatus` — missing `/api/` prefix |
| `GET /api/portfolio/public/agent-status` | **503** | polled every 8s for the rest of the session |
| `POST /mcp` | 200 / 202 | Ask transport is alive |

Root cause for the 404: `src/content/loadLayout.ts` `loadLiveWithStatus` fetches `${base}/portfolio/layout`. Other loaders use `${base}/api/portfolio/public/...`. With Docker `octBaseUrl = window.location.origin`, the request never reaches OCT and the SPA silently uses the baked snapshot.

**Result: FAIL** — 2026-08-31

---

## Ranked improvements

Do these in order. Do not mix with OpenCat Tunnel product work.

### P0

1. **Stop DAG chrome overlapping the hero.** `LayoutRenderer` “Story levels” overlay must be its own row, not `position: absolute` over L0. Recruiter never sees the name today.

### P1

2. **Point `loadLiveWithStatus` at `/api/portfolio/layout`** (or stop fetching a private path). Until this, every visit 404s and the snapshot date (2026-08-10) is what HR sees.
3. **Text / mobile: collapse Ask behind a button.** Lead with the project index (or hero). Kill the duplicate persist notices.
4. **Mobile tank: one HUD row.** Don’t persist dive/`stageProgress` across view changes. Don’t park 3D/Flat/Text on top of the rim card.

### P2

5. Quiet or gate `AgentStatusPill` when `/api/portfolio/public/agent-status` is 503.
6. One `<main>`. Mark surface-scene controls `aria-hidden="true"` when `data-off`.
7. Drop `Bake` / `Employer contribution reports` from the public default school (keep for `?j=` demos).
8. Light theme: either retint the tank or don’t leave Latte chrome on a night water column.
9. Header: label or enlarge accent dots; don’t clip theme names; drop redundant Home (logo is enough).

### P3

10. Giant cat mesh / “DEV” fish labels.
11. Sonar blips need a hit target that isn’t a constantly-moving SVG `<g>`.
12. Ask intro must not clip the first sentence.

---

## Files that already changed (Docker only)

Not part of the UI list above. Landed so this pass could run:

- `docker-entrypoint.sh` — write `/var/cache/nginx/config.json`
- `Dockerfile` — stop `chown` of html `config.json`
- `nginx.conf`, `nginx.ngrok.conf` — alias both config URLs at the cache-dir file

No CatPortfolio UI PR from this pass.

---

## Screenshots (this folder)

| File | What it shows |
|---|---|
| `catportfolio-tank-surface.png` | Default tank, surface hero, giant cat |
| `catportfolio-tank-submerged.png` | Dive HUD, fish, sonar |
| `catportfolio-tank-ask.png` | Ask dock over tank (clipped intro) |
| `catportfolio-shortcuts.png` | Shortcuts modal |
| `catportfolio-flat.png` | Recruiter index cards |
| `catportfolio-text-top.png` | Text mode: chat-first column |
| `catportfolio-text-hero.png` | P0: Story-levels overlay on the hero |
| `catportfolio-text-bottom.png` | Same overlay + L1 KPI strip |
| `catportfolio-text-light.png` | Latte, same overlay |
| `catportfolio-text-mobile.png` | Phone: Ask is the first screen |
| `catportfolio-tank-mobile.png` | Phone tank HUD collision |
