# CatPortfolio Front-End Browser Audit & Improvement Report

> **PR #36 verification (2026-08-31):** Mobile Ask-first (P1-2) and empty-state + Clear filters (P1-1b) shipped. Native `type="search"` cancel left as-is (P1-1a). Still open: Latte/Paper `--hairline` contrast, dossier/Ask glass `/40`, dossier link pills, snapshot tooltip. “Tokyo Night / Cyber” are not CatPortfolio themes. Full matrix: `../2026-08-31-pr36-verification.md`.

---

**Audit Date:** 2026-08-31  
**Auditor:** Gemini Agentic Reviewer  
**Target:** `http://localhost:11000/CatPortfolio/`  
**Recording Artifact:** `catportfolio_review_1788152356100.webp`

---

## 1. Executive Summary

A browser audit and front-end interaction review was performed against CatPortfolio. The application provides an engaging multi-modal portfolio experience comprising:
- **3D Aquarium (`?v=tank`)**: WebGL Three.js canvas featuring floating specimen objects, interactive feeding mechanics, sonar minimap, depth scrubber, and specimen dossier overlays.
- **Flat Index (`?v=tank` with flat chrome / `FishFlatGrid`)**: Recruiter-focused, fast-scanning categorized grid with category chip filters and search.
- **Text / GenUI View (`?v=text`)**: Two-column matrix combining an interactive AI Ask Chat dock with reactive DAG / grid block layout renderer.
- **Theme & Accent Engine**: Dynamic CSS custom property theming supporting multiple color themes (Latte, Paper, Cyber, Tokyo Night, etc.) and selectable accent palettes.

The core visual design is rich and interactive. However, several friction points were identified across search interactions, mobile responsiveness, light theme contrast tokens, and API error states.

---

## 2. Preconditions & Test Environment

| Item | Value |
| :--- | :--- |
| **URL** | `http://localhost:11000/CatPortfolio/` |
| **Base Path** | `/CatPortfolio/` (configured in Vite) |
| **Tested Viewports** | Desktop 1440×900, Desktop 1280×800, Mobile 390×844, Mobile 375×667 |
| **Engine / Framework** | React 19, Vite, TanStack Router, TanStack Query, Tailwind CSS v4, Three.js, Lucide Icons |
| **Backend State** | Offline / Snapshot mode (graceful fallback active) |

---

## 3. Surface Coverage Summary

| Surface / Flow | Browser Tested | Result | Notes |
| :--- | :---: | :---: | :--- |
| **3D Tank Canvas & Shaders** | Yes | **PASS** | High framerate, fluid physics, feeding drops, depth layer transitions work cleanly. |
| **Specimen Selection & Dossier** | Yes | **PASS** | Clicking specimens opens dossier card; hotkeys (Esc, arrow navigation) trigger correctly. |
| **Flat Recruiter Index** | Yes | **PASS** | Filter chips and search function smoothly; clear button UX missing. |
| **Text Matrix & GenUI Layout** | Yes | **PASS** | Blocks render DAG/grid hierarchies accurately with dynamic patch support. |
| **Theme & Accent Customizer** | Yes | **PASS** | Real-time CSS token switching functions across all surfaces. |
| **Ask Chat Panel (UI)** | Yes | **PASS** | Preset query chips trigger immediate layout block highlight. |
| **Mobile Text Mode (390×844)** | Yes | **WARN** | Chat panel occupies the top viewport above portfolio content. |
| **Light Themes (Paper / Latte)** | Yes | **WARN** | Low contrast on `--fg-subtle` and badge borders against light backgrounds. |
| **Live Layout Fetch (`/api`)** | Yes (Network) | **INFO** | Returns 404 / snapshot fallback gracefully without white-screening. |

---

## 4. Step-by-Step Walkthrough Findings

### A. 3D Aquarium Stage (`?v=tank`)
1. **Visual Presentation**:
   - The aquarium background lighting and particle effects render cleanly without stutter.
   - Sonar minimap accurately maps specimen positions in 3D coordinate space.
   - Depth scrubber provides smooth camera translation across water zones.
2. **Interaction & Dossier**:
   - Clicking a specimen opens the dossier overlay with metadata, tags, and summary.
   - Keyboard navigation (`j`/`k` or arrow keys) switches between specimens as intended.
3. **HUD Contrast**:
   - When the Ask drawer or Dossier is opened over bright 3D geometry, the backdrop blur and background opacity (`bg-(--card)/40`) occasionally allow specular highlights from the 3D scene to bleed through text.

### B. Flat Grid View
1. **Categorization & Filtering**:
   - Category filter pills (*AI & Agents*, *Infrastructure*, *MCP*, *Tools*) instantly filter the active cards.
   - Keyword search matches project titles and tag names responsively.
2. **UX Friction**:
   - **No Search Clear Action**: When a user types a search string into the search input, there is no one-click clear (`✕`) button. The user must manually backspace.
   - **Empty Result State**: When a filter combination yields no results, the section renders an empty space rather than an informative empty state with a reset filter button.

### C. Text / GenUI Matrix View (`?v=text`)
1. **Layout & Patching**:
   - Layout matrix dynamically calculates block span and hierarchy (DAG levels vs. standard grid).
   - Chat suggestions (*"Show all MCP agent tooling"*) trigger focus states and smooth scroll targets.
2. **Mobile Screen Distribution**:
   - On viewports < 768px, the layout switches to a single column with the Ask panel stacked on top. Because the chat panel has fixed height and suggested chips, the visitor must scroll past the entire chat block before seeing any project cards.

### D. Theming & Accessibility
1. **Dark vs. Light Palettes**:
   - Dark themes (*Tokyo Night, Cyber, Neon*) offer crisp contrast and glowing accent highlights.
   - Light themes (*Paper, Latte*) expose low contrast ratios on:
     - `text-(--fg-subtle)` (meta labels like `audience · recruiter`, status pills, timestamp notices).
     - Border hairline rules (`border-(--hairline)`) which become nearly invisible on light surfaces.

---

## 5. Prioritized Action Items & Recommendations

### P1 — High Priority (UX & Usability)
1. **Search Input Clear Button & Empty State**
   - **File:** `src/components/fish/FishFlatGrid.tsx`
   - **Change:** Add an inline clear (`✕`) icon button inside the search input when query is non-empty. Add a fallback `<EmptyState />` card with a *"Clear filters"* button when 0 cards match.
2. **Mobile Text Layout Optimization**
   - **File:** `src/routes/HomePage.tsx` / `src/components/chat/ChatPanel.tsx`
   - **Change:** Make the Ask Chat panel collapsible (accordion or toggle drawer) on mobile viewports (`sm:`/`md:`) so the portfolio overview remains immediately visible.

### P2 — Medium Priority (Visual Polish & Contrast)
1. **Light Theme Contrast Refinement**
   - **File:** `src/styles/theme-tokens.css` / `src/themes/`
   - **Change:** Enhance contrast values for `--fg-subtle`, `--fg-muted`, and `--hairline` under light theme selectors (`[data-theme="latte"]`, `[data-theme="paper"]`).
2. **Glassmorphism Backdrop Opacity in 3D Mode**
   - **File:** `src/components/fish/FishDossier.tsx` & `src/components/chat/ChatPanel.tsx`
   - **Change:** Increase overlay backdrop opacity (`bg-(--card)/85` with `backdrop-blur-md`) when docked over the 3D canvas to eliminate text bleed against bright shader highlights.

### P3 — Low Priority (Delight & Micro-Interactions)
1. **Specimen Link Action Badges**
   - **File:** `src/components/fish/FishDossier.tsx`
   - **Change:** Style external links (GitHub repo, live demo) as interactive pill badges with Lucide icons (`Github`, `ExternalLink`) rather than plain underlined text.
2. **Status Pill Tooltip / Offline Feedback**
   - **File:** `src/components/AgentStatusPill.tsx`
   - **Change:** Provide an explanatory hover tooltip on the status pill when running in snapshot fallback mode (`"Using cached layout snapshot (live agent offline)"`).
