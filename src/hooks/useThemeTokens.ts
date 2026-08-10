/**
 * Reactive CSS custom-property reader.
 *
 * Child effects often run before ThemeProvider's parent effect in the same
 * commit, so a same-tick getComputedStyle can return the previous theme.
 * We re-read inside requestAnimationFrame after theme/override changes.
 */

import { useEffect, useState } from "react"
import { useLayoutStore, usePreferencesStore } from "@/store"

/** Read named CSS custom props from :root after theme paint. */
export function useThemeTokens(names: readonly string[]): Record<string, string> {
  const theme = usePreferencesStore((s) => s.theme)
  const themeOverride = useLayoutStore((s) => s.themeOverride)
  const bakeTheme = useLayoutStore((s) => s.bakeTheme)
  const [tokens, setTokens] = useState<Record<string, string>>({})

  useEffect(() => {
    let cancelled = false
    const frame = requestAnimationFrame(() => {
      if (cancelled) return
      if (typeof getComputedStyle !== "function") {
        setTokens({})
        return
      }
      const styles = getComputedStyle(document.documentElement)
      const next: Record<string, string> = {}
      for (const name of names) {
        const key = name.startsWith("--") ? name : `--${name}`
        next[name.startsWith("--") ? name.slice(2) : name] =
          styles.getPropertyValue(key).trim()
      }
      setTokens(next)
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
    }
  }, [theme, themeOverride, bakeTheme, names])

  return tokens
}
