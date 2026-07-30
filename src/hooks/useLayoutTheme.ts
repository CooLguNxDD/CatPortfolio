/**
 * Apply layout.meta.theme + validated themeOverrides.
 *
 * Demo theme picks live only in the temporary layout store (themeOverride) —
 * they do not write preferences localStorage. Home/Ask keep the same override
 * until clearDemo or full reload.
 */

import { useEffect, useRef } from "react"
import type { Layout } from "@/content/schema"
import { sanitizeThemeOverrides } from "@/content/schema"
import { themeRegistry, DEFAULT_THEME_ID } from "@/themes/registry"
import { useLayoutStore, usePreferencesStore } from "@/store"

export type LayoutThemeMode = "home" | "ask" | "auto"

export type UseLayoutThemeOptions = {
  mode?: LayoutThemeMode
}

/** Applies layout-specific theme variables and overrides to the document. */
export function useLayoutTheme(
  layout: Layout | null | undefined,
  opts?: UseLayoutThemeOptions,
) {
  void opts?.mode
  const setTheme = usePreferencesStore((s) => s.setTheme)
  const lastOverridesRef = useRef<string>("")
  const appliedRef = useRef<string[]>([])
  const seededBakeRef = useRef<string | null>(null)

  useEffect(() => {
    if (!layout?.meta) return

    const session = useLayoutStore.getState()
    const layoutTheme =
      layout.meta.theme && themeRegistry[layout.meta.theme]
        ? layout.meta.theme
        : null
    const bakeTheme =
      session.bakeTheme && themeRegistry[session.bakeTheme]
        ? session.bakeTheme
        : layoutTheme
    const override =
      session.themeOverride && themeRegistry[session.themeOverride]
        ? session.themeOverride
        : null

    // Demo: apply override or bake by injecting CSS via ThemeProvider path —
    // only seed prefs once from bake when no override (don't persist override).
    if (session.isDemoSession) {
      const effective = override ?? bakeTheme
      if (effective) {
        // Drive the document through prefs store for ThemeProvider, but
        // themeOverride itself is the temporary source of truth for "user pick".
        // We still setTheme so ThemeProvider re-renders; prefs will retain last
        // applied id in localStorage — for pure temp theme, ThemeProvider reads
        // layout store first (see ThemeProvider).
        const current = usePreferencesStore.getState().theme
        if (!override && bakeTheme) {
          const seedKey = `${session.shortId ?? ""}:${bakeTheme}`
          if (seededBakeRef.current !== seedKey) {
            seededBakeRef.current = seedKey
            if (bakeTheme !== current) setTheme(bakeTheme)
          }
        }
        // When override is set, ThemeProvider reads it — no setTheme (no persist).
        void effective
      }
    } else if (layoutTheme) {
      const seedKey = `layout:${layoutTheme}:${layout.meta.generatedAt ?? ""}`
      if (seededBakeRef.current !== seedKey) {
        seededBakeRef.current = seedKey
        const current = usePreferencesStore.getState().theme
        if (layoutTheme !== current) setTheme(layoutTheme)
      }
    }

    const overrides = sanitizeThemeOverrides(layout.meta.themeOverrides)
    const overridesStr = JSON.stringify(overrides || {})
    if (overridesStr === lastOverridesRef.current) {
      return
    }
    lastOverridesRef.current = overridesStr

    const root = document.documentElement
    for (const prop of appliedRef.current) {
      root.style.removeProperty(prop)
    }
    const applied: string[] = []
    if (overrides) {
      for (const [k, v] of Object.entries(overrides)) {
        const prop = `--${k}`
        root.style.setProperty(prop, v)
        applied.push(prop)
      }
    }
    appliedRef.current = applied
  }, [layout, setTheme])

  useEffect(() => {
    return () => {
      const root = document.documentElement
      for (const prop of appliedRef.current) {
        root.style.removeProperty(prop)
      }
    }
  }, [])

  return layout?.meta?.theme && themeRegistry[layout.meta.theme]
    ? layout.meta.theme
    : DEFAULT_THEME_ID
}
