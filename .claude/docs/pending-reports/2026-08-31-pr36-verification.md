# Verification vs pending reports — PR #36

Date: 2026-08-31  
Branch: `portfolio-gen/2026-08-31-pending-report-fixes` @ `e3d4481`  
PR: https://github.com/CooLguNxDD/CatPortfolio/pull/36  
Target: Docker `catportfolio` at `http://localhost:11000/CatPortfolio/`  
Reports: `grok/2026-08-31-frontend-walkthrough.md`, `gemini/2026-08-31-frontend-audit-gemini.md`

Playwright re-walk after the PR image rebuild (desktop 1440×900, mobile 390×844, Latte).

---

## Grok report — ranked list

| # | Finding | Status | Evidence |
|---|---|---|---|
| P0-1 | Story-levels chrome hides hero name | **SHIPPED** | Sticky chrome is minimap-only + `bg` 96%. `h1` “Andrew Liang (the cat)” readable; `overlay: false` at rest; `jumpToLevel` leaves name below chrome (`readable: true`). |
| P1-2 | Live layout 404 `/portfolio/layout` | **SHIPPED (URL)** / **env still snapshot** | Browser now requests `GET /api/portfolio/public/layout?audience=default&tank=1`. Nginx no longer 404s. This session: **499** (client 4s abort) then snapshot pill `2026-08-10`. Pill will stay snapshot until OCT answers inside 4s. |
| P1-3 | Text/mobile Ask-first; duplicate persist | **SHIPPED** | Desktop: Ask left, index+matrix right. Mobile 390: Project index `y=254` above the fold; Ask `y=2055` after cards; matrix later. One `portfolio_ask_turns` paragraph. `data-ask-persist-notice` gone. |
| P1-4 | Mobile tank HUD + persisted dive | **SHIPPED** | `?v=tank` opens on surface hero + Dive CTA. After dive, rim card sits *below* 3D/Flat/Text pills. `diveAnimator.reset()` emits 0. Search placeholder fully readable. Sonar still overlaps the search field (not in this item). |
| P2-5 | agent-status 503 poll forever | **SHIPPED** | Throws on `!res.ok`; pill `retry: 1` then `refetchInterval: false`. Logs: two 503s, then stop. |
| P2-6 | Three `<main>`; surface a11y | **PARTIAL** | Exactly **one** `<main>`. Surface `data-off` still uses `visibility: hidden` (verified skip — already removes from a11y/tab). Not newly marked `aria-hidden`. |
| P2-7 | Public Bake + “Employer contribution reports” | **SHIPPED** | `showBake` / curation gated to `?j=` or `meta.tailored`. Public tank dock has no Bake; body text has no “Employer contribution reports”. |
| P2-8 | Latte chrome on dark water | **SHIPPED** | `applyCircadian` skips night dim when `palette.light`. Mobile tank on Latte is a light lagoon column. |
| P2-9 | Header accents / theme clip / Home | **SHIPPED** | Accent buttons `h-5 w-5`; theme select `max-w-[10rem]/[14rem]`; Home link removed (logo is home). |
| P3-10 | Giant cat / `DEV` fish labels | **OPEN** | 3D nameplates still `species.slice(0, tickerLength).toUpperCase()` → `DEV`/`MOB`/`PLA` (`FishTankCanvas.tsx:794`). Giant cat unchanged. |
| P3-11 | Sonar blips not a stable hit target | **OPEN** | Still animated SVG `<g role="button">` / circles in `SonarMiniMap.tsx`. |
| P3-12 | Ask intro clipped | **SHIPPED** | Intro starts with “Ask about experience, projects, or a job fit…”. Log does not auto-scroll when `messages.length === 0`. |
| Docker | `config.json` permission denied | **SHIPPED earlier** | `d3e709a` on main. Container serves `/CatPortfolio/config.json` 200. (Compose healthcheck currently **unhealthy** while HTTP 200 — wget probe, not the SPA.) |

Grok “not reproduced” items stay skipped: surface Ask in a11y tree (`visibility: hidden`), Gemini native search-cancel, Gemini empty copy (now also has Clear filters).

---

## Gemini report — action items

Gemini’s walkthrough **PASSed** tank/flat/text/theme/Ask UI. Remaining recommendations:

| # | Finding | Status | Notes |
|---|---|---|---|
| P1-1a | Extra ✕ on search | **WONTFIX (this PR)** | Input is `type="search"`. Chrome already draws a native cancel. Extra ✕ not added. |
| P1-1b | Empty state + reset | **SHIPPED** | “No specimens match this filter.” + visible **Clear filters** (typed `zzzz-no-match` in Playwright). |
| P1-2 | Mobile Ask occupies first screen | **SHIPPED** (reorder, not accordion) | Project index is the first mobile screen. Ask is after the four cards, not a collapsible drawer. |
| P2-1 | Light `--fg-subtle` / `--hairline` contrast | **OPEN** | Latte: `--hairline` **equals** `--card` (`oklch(0.857 0.014 268)`); `--bg` is `0.958`. Card borders vanish. `--fg-subtle` `0.550` on `0.958` bg is usable but still soft. File `src/styles/theme-tokens.css` **does not exist**; tokens live in `src/themes/*.theme.json`. |
| P2-2 | Ask/dossier glass `bg-(--card)/40` over 3D | **OPEN** | `ChatPanel` preview chip and `FishDossier` metric cells still `/40`. Not raised to `/85`. |
| P3-1 | Dossier link pills + Lucide icons | **OPEN** | Not done. |
| P3-2 | Snapshot-mode tooltip on status pill | **OPEN** | Pill still renders nothing when fetch fails/null. Snapshot fallback is the source chip, not a tooltip. |
| Themes named Tokyo Night / Cyber | **INVALID** | CatPortfolio themes: cozy, neon, paper, latte, frappe, macchiato, mocha. |

Gemini “live layout 404 / INFO” is **superseded**: path is correct; failure mode is now timeout/snapshot, not 404.

---

## Playwright recap (this pass)

- `?v=text` Latte: name present, 1 `<main>`, 1 persist notice, empty-state + Clear filters.
- 390×844 `?v=text`: Project index first.
- `?v=tank`: surface hero; after dive, pills clear of rim; light water on Latte; no Bake on public school.
- Network: layout URL correct, 499/timeout; agent-status 503 ×2 then quiet.

---

## Follow-up branch

`portfolio-gen/2026-08-31-report-leftovers` lands the leftovers (hairline, 15s live timeout, OPS ticker, sonar legend, glass `/88`, dossier pill, snapshot tooltip). Giant cat mesh is still skipped.

Do not mix these into OpenCat Tunnel.
