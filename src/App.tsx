/**
 * App shell — nav, theme switcher, demo chip.
 *
 * Demo session + themeOverride live in an in-memory Zustand store (not
 * sessionStorage/localStorage). URL `?j=` re-seeds identity after reload.
 */

import { useEffect, useState } from "react"
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router"
import { useQueryClient } from "@tanstack/react-query"
import {
  useLayoutStore,
  usePreferencesStore,
  type Accent,
} from "@/store"
import {
  DEFAULT_LIGHT_THEME_ID,
  DEFAULT_THEME_ID,
  themeModeOf,
  themesForMode,
} from "@/themes/registry"
import { Button } from "@/components/ui/button"
import type { DemoSearch } from "@/router"
import { clearDemoSearch, mergeDemoSearch } from "@/lib/demoSearch"
import { CatDOMCompanion } from "@/object3D/Cat"

// Stable identity so the router selector doesn't return a fresh object
// (and re-render the shell) every time `location.search` is undefined.
const EMPTY_SEARCH: DemoSearch = {}

const ACCENTS: { id: Accent; label: string }[] = [
  { id: "amber", label: "Amber" },
  { id: "pink", label: "Pink" },
  { id: "neon", label: "Neon" },
  { id: "cyan", label: "Cyan" },
  { id: "violet", label: "Violet" },
]

/** Nav shell + theme/accent/mode switchers, demo-session chip, and dev-only Cat companion toggle. Wraps `<Outlet/>`. See file header. */
function App() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const theme = usePreferencesStore((s) => s.theme)
  const setTheme = usePreferencesStore((s) => s.setTheme)
  const accent = usePreferencesStore((s) => s.accent)
  const setAccent = usePreferencesStore((s) => s.setAccent)
  // data-accent on shell (not <html>) so it beats ThemeProvider inline --amber.
  const accentAttr =
    accent !== "amber" ? ({ "data-accent": accent } as const) : {}
  const shortId = useLayoutStore((s) => s.shortId)
  const isDemoSession = useLayoutStore((s) => s.isDemoSession)
  const themeOverride = useLayoutStore((s) => s.themeOverride)
  const bakeTheme = useLayoutStore((s) => s.bakeTheme)
  const clearDemo = useLayoutStore((s) => s.clearDemo)
  const setThemeOverride = useLayoutStore((s) => s.setThemeOverride)
  const [showCompanion, setShowCompanion] = useState(false)

  const liveSearch = useRouterState({
    select: (s) => (s.location.search as DemoSearch | undefined) ?? EMPTY_SEARCH,
  })
  const searchJ = liveSearch?.j

  // If the temporary store has a shortId but URL lost `j`, bake it back
  // without dropping view/focus params (v/f).
  useEffect(() => {
    if (!isDemoSession || !shortId) return
    if (searchJ === shortId) return
    void navigate({
      to: "/",
      search: (prev) => mergeDemoSearch(prev as DemoSearch, shortId),
      replace: true,
    })
  }, [isDemoSession, shortId, searchJ, navigate])

  // Preserve j/v/f across header nav links.
  const demoSearch: DemoSearch = {
    ...(liveSearch?.j || (isDemoSession && shortId)
      ? { j: liveSearch?.j ?? shortId ?? undefined }
      : {}),
    ...(liveSearch?.v ? { v: liveSearch.v } : {}),
    ...(liveSearch?.f ? { f: liveSearch.f } : {}),
  }

  const activeThemeId =
    isDemoSession && themeOverride
      ? themeOverride
      : isDemoSession && bakeTheme
        ? bakeTheme
        : theme

  const handleClearDemo = () => {
    const id = shortId
    clearDemo()
    if (id) {
      queryClient.removeQueries({ queryKey: ["layout", "demo", id] })
    }
    queryClient.removeQueries({ queryKey: ["layout", "default"] })
    void navigate({
      to: "/",
      search: (prev) => clearDemoSearch(prev as DemoSearch),
      replace: true,
    })
  }

  /**
   * Demo: theme only in temporary store (no localStorage).
   * Outside demo: preferences persist as usual.
   */
  const handleThemeClick = (id: string) => {
    if (isDemoSession) {
      setThemeOverride(id)
      return
    }
    setTheme(id)
  }

  const activeMode = themeModeOf(activeThemeId)
  const modeThemes = themesForMode(activeMode)
  const selectValue = modeThemes.some((t) => t.id === activeThemeId)
    ? activeThemeId
    : modeThemes[0]?.id

  const handleModeClick = (mode: "dark" | "light") => {
    if (themeModeOf(activeThemeId) === mode) return
    const fallback = mode === "light" ? DEFAULT_LIGHT_THEME_ID : DEFAULT_THEME_ID
    const next = themesForMode(mode).find((t) => t.id === fallback) ?? themesForMode(mode)[0]
    if (next) handleThemeClick(next.id)
  }

  return (
    <div
      className="app-root min-h-screen flex flex-col bg-(--bg) text-(--fg)"
      {...accentAttr}
    >
      <header className="sticky top-0 z-30 backdrop-blur-md border-b border-(--hairline) bg-(--bg)/80">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 min-w-0">
            <Link
              to="/"
              search={demoSearch}
              className="font-semibold text-(--fg) shrink-0"
            >
              🐱 Cat Portfolio
            </Link>
            <nav className="flex items-center gap-4 text-sm font-medium">
              <Link
                to="/"
                search={demoSearch}
                activeProps={{ className: "text-(--amber)" }}
                className="text-(--fg-muted) hover:text-(--fg)"
              >
                Home
              </Link>
            </nav>
            {isDemoSession && shortId ? (
              <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-(--amber)/40 bg-(--amber)/10 px-2.5 py-0.5 text-[11px] font-mono text-(--amber) max-w-[14rem] truncate">
                <span className="truncate" title={shortId}>
                  demo · {shortId}
                </span>
                <button
                  type="button"
                  className="shrink-0 opacity-70 hover:opacity-100"
                  aria-label="Clear demo session"
                  onClick={handleClearDemo}
                >
                  ×
                </button>
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div
              className="hidden sm:flex items-center gap-1"
              role="group"
              aria-label="Accent color"
            >
              {ACCENTS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  title={a.label}
                  aria-label={`Accent ${a.label}`}
                  aria-pressed={accent === a.id}
                  onClick={() => setAccent(a.id)}
                  className={
                    accent === a.id
                      ? "h-4 w-4 rounded-full ring-2 ring-(--fg) ring-offset-1 ring-offset-(--bg)"
                      : "h-4 w-4 rounded-full opacity-70 hover:opacity-100"
                  }
                  style={{
                    background: `var(--accent-${a.id})`,
                  }}
                />
              ))}
            </div>
            <div
              className="hidden md:flex items-center gap-1"
              role="group"
              aria-label="Color mode"
            >
              <Button
                size="xs"
                variant={activeMode === "dark" ? "default" : "ghost"}
                onClick={() => handleModeClick("dark")}
                aria-pressed={activeMode === "dark"}
              >
                Dark
              </Button>
              <Button
                size="xs"
                variant={activeMode === "light" ? "default" : "ghost"}
                onClick={() => handleModeClick("light")}
                aria-pressed={activeMode === "light"}
              >
                Light
              </Button>
            </div>
            <label className="inline-flex items-center gap-1.5 text-xs text-(--fg-muted)">
              <span className="hidden sm:inline">Theme</span>
              <span className="relative inline-flex">
                <select
                  id="theme-select"
                  aria-label="Theme"
                  className="h-7 max-w-[7.5rem] sm:max-w-[12rem] appearance-none rounded-md border border-(--hairline) bg-(--bg-elevated) px-2 pr-6 text-xs text-(--fg)"
                  value={selectValue}
                  onChange={(e) => handleThemeClick(e.target.value)}
                >
                  {modeThemes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <span
                  className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-(--fg-muted)"
                  aria-hidden
                >
                  ▾
                </span>
              </span>
            </label>
            {import.meta.env.DEV ? (
              <Button
                size="xs"
                variant={showCompanion ? "default" : "outline"}
                onClick={() => setShowCompanion(!showCompanion)}
                title="Toggle 3D Interactive Cat Companion (Dev only)"
                className="hidden sm:inline-flex"
              >
                🐾 Companion
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      {import.meta.env.DEV && showCompanion && (
        <CatDOMCompanion initialPosition={{ x: 24, y: 80 }} />
      )}

      {liveSearch?.v === "text" && (
        <footer className="py-6 text-center text-xs font-mono text-(--fg-muted) border-t border-(--hairline) max-w-6xl mx-auto w-full px-4">
          schema-driven blocks · matrix levels · GenUI layout.json ·{" "}
          {new Date().getFullYear()}
        </footer>
      )}
    </div>
  )
}

export default App
