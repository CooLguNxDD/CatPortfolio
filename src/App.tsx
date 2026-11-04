/**
 * App shell — nav, theme switcher, demo chip.
 *
 * Demo session + themeOverride live in an in-memory Zustand store (not
 * sessionStorage/localStorage). URL `?j=` re-seeds identity after reload.
 */

import { useEffect } from "react"
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
import { Check, Moon, Palette, Sun } from "lucide-react"
import { Popover } from "radix-ui"
import type { DemoSearch } from "@/router"
import { clearDemoSearch, mergeDemoSearch } from "@/lib/demoSearch"

// The dev-only Cat companion (`@/object3D/Cat` CatDOMCompanion) is no longer
// mounted from the shell. Keep it out of App's static imports: that barrel
// pulls three.js and would make every page modulepreload the three chunk.

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

  const liveSearch = useRouterState({
    select: (s) => (s.location.search as DemoSearch | undefined) ?? EMPTY_SEARCH,
  })
  const searchJ = liveSearch?.j
  const onHome = useRouterState({ select: (s) => s.matches.some((match) => match.routeId === "/") })

  // If the temporary store has a shortId but URL lost `j`, bake it back
  // without dropping view/focus params (v/f).
  useEffect(() => {
    if (!onHome || !isDemoSession || !shortId) return
    if (searchJ === shortId) return
    void navigate({
      to: "/",
      search: (prev) => mergeDemoSearch(prev as DemoSearch, shortId),
      replace: true,
    })
  }, [onHome, isDemoSession, shortId, searchJ, navigate])

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
        <div className="max-w-6xl mx-auto px-4 min-h-14 py-2 flex items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-x-3 sm:gap-x-6 gap-y-2 min-w-0">
            <Link
              to="/"
              search={demoSearch}
              className="font-semibold text-(--fg) shrink-0 text-sm sm:text-base whitespace-nowrap"
            >
              🐱 Cat Portfolio
            </Link>
            <nav aria-label="Portfolio">
              <Link
                to="/pipeline"
                search={demoSearch}
                aria-label="How this portfolio tailors itself"
                className="text-xs underline underline-offset-4 whitespace-nowrap shrink-0"
              >
                <span className="lg:hidden" aria-hidden="true">How it works</span>
                <span className="hidden lg:inline" aria-hidden="true">How this portfolio tailors itself</span>
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
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* One appearance control instead of a header full of swatches
                (design review 2026-11-04, P3). Names stay explicit inside. */}
            <Popover.Root>
              <Popover.Trigger asChild>
                <button
                  type="button"
                  data-testid="appearance-trigger"
                  className="inline-flex h-9 items-center gap-2 rounded-full border border-(--hairline) bg-(--bg-elevated) px-3 text-xs font-medium text-(--fg) hover:border-(--amber)/60 data-[state=open]:border-(--amber)"
                  aria-label="Appearance settings"
                >
                  <span
                    className="h-3.5 w-3.5 rounded-full ring-1 ring-(--hairline)"
                    style={{ background: `var(--accent-${accent})` }}
                    aria-hidden
                  />
                  <Palette className="h-4 w-4 text-(--fg-muted)" aria-hidden />
                  <span className="hidden sm:inline">Appearance</span>
                </button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content
                  align="end"
                  sideOffset={8}
                  collisionPadding={12}
                  className="appearance-panel z-[90] w-72 rounded-2xl border border-(--hairline) bg-(--bg-elevated) p-4 text-(--fg) shadow-xl"
                  {...accentAttr}
                >
                  <p className="mb-2 text-[11px] font-mono uppercase tracking-wider text-(--fg-muted)">
                    Mode
                  </p>
                  <div
                    className="grid grid-cols-2 gap-1 rounded-full border border-(--hairline) p-1"
                    role="group"
                    aria-label="Color mode"
                  >
                    {(["dark", "light"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        aria-pressed={activeMode === m}
                        onClick={() => handleModeClick(m)}
                        className={
                          activeMode === m
                            ? "inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-(--amber) text-sm font-semibold text-(--bg)"
                            : "inline-flex h-9 items-center justify-center gap-1.5 rounded-full text-sm text-(--fg-muted) hover:text-(--fg)"
                        }
                      >
                        {m === "dark" ? <Moon className="h-4 w-4" aria-hidden /> : <Sun className="h-4 w-4" aria-hidden />}
                        {m === "dark" ? "Dark" : "Light"}
                      </button>
                    ))}
                  </div>

                  <p className="mb-2 mt-4 text-[11px] font-mono uppercase tracking-wider text-(--fg-muted)">
                    Accent
                  </p>
                  <div className="flex items-center gap-2" role="group" aria-label="Accent color">
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
                            ? "inline-flex h-9 w-9 items-center justify-center rounded-full ring-2 ring-(--fg) ring-offset-2 ring-offset-(--bg-elevated)"
                            : "inline-flex h-9 w-9 items-center justify-center rounded-full opacity-75 hover:opacity-100"
                        }
                        style={{ background: `var(--accent-${a.id})` }}
                      >
                        {accent === a.id ? <Check className="h-4 w-4 text-(--bg)" aria-hidden /> : null}
                      </button>
                    ))}
                  </div>

                  <label
                    htmlFor="theme-select"
                    className="mb-2 mt-4 block text-[11px] font-mono uppercase tracking-wider text-(--fg-muted)"
                  >
                    Theme
                  </label>
                  <span className="relative flex">
                    <select
                      id="theme-select"
                      aria-label="Theme"
                      className="h-9 w-full appearance-none rounded-lg border border-(--hairline) bg-(--bg) px-3 pr-8 text-sm text-(--fg)"
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
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-(--fg-muted)"
                      aria-hidden
                    >
                      ▾
                    </span>
                  </span>
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

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
