/**
 * ThemeProvider — CSS vars from preferences, or temporary demo themeOverride
 * from the in-memory layout store (does not require localStorage).
 */

import { useEffect, type ReactNode } from "react"
import { useLayoutStore, usePreferencesStore } from "@/store"
import { themeRegistry, DEFAULT_THEME_ID } from "@/themes/registry"
import { ThemeContext } from "@/themes/theme-context"

/** Stable context value — registry is module-level and never changes. */
const CONTEXT_VALUE = { registry: themeRegistry }

/**
 * Renders the theme provider component wrapping ReactNode children.
 * Runs an effect to apply CSS variables from the selected theme to the root element.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const prefTheme = usePreferencesStore((s) => s.theme)
  const isDemoSession = useLayoutStore((s) => s.isDemoSession)
  const themeOverride = useLayoutStore((s) => s.themeOverride)
  const bakeTheme = useLayoutStore((s) => s.bakeTheme)

  // Temporary demo pick wins; else bake seed; else device prefs.
  const themeId =
    isDemoSession && themeOverride && themeRegistry[themeOverride]
      ? themeOverride
      : isDemoSession && !themeOverride && bakeTheme && themeRegistry[bakeTheme]
        ? bakeTheme
        : prefTheme

  useEffect(() => {
    const def = themeRegistry[themeId] ?? themeRegistry[DEFAULT_THEME_ID]
    if (!def) return
    const root = document.documentElement
    root.setAttribute("data-theme", def.id)
    root.setAttribute("data-light", def.isLight ? "true" : "false")
    for (const [key, value] of Object.entries(def.vars)) {
      root.style.setProperty(`--${key}`, value)
    }
  }, [themeId])

  return (
    <ThemeContext.Provider value={CONTEXT_VALUE}>
      {children}
    </ThemeContext.Provider>
  )
}
