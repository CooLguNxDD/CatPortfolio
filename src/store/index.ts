/**
 * Global Store Entry Point
 *
 * react-app-guide ownership:
 *   - Preferences → localStorage (device)
 *   - Demo session (`?j=`, themeOverride, working layout) → **in-memory only**
 *     (transient UI; lost on full page reload — URL `?j=` re-seeds identity)
 *   - Layout payloads → TanStack Query (server state)
 *   - Chat pending prompt → non-persisted
 */

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { useShallow } from "zustand/react/shallow"
import { createPreferencesSlice, type PreferencesSlice } from "./preferencesSlice"
import { createLayoutSlice, type LayoutSlice } from "./layoutSlice"

type PreferencesStore = PreferencesSlice

/**
 * Store hook for user preferences (device-persistent).
 */
export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (...args) => ({
      ...createPreferencesSlice(...args),
    }),
    {
      name: "cat-portfolio-preferences",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        accent: state.accent,
        density: state.density,
        notifications: state.notifications,
      }),
    },
  ),
)

/**
 * Demo session — temporary in-memory store (no sessionStorage / localStorage).
 * Survives Home ↔ Ask client navigation; cleared on hard reload.
 * Re-enter via `?j=` in the URL.
 */
export const useLayoutStore = create<LayoutSlice>()((...args) => ({
  ...createLayoutSlice(...args),
}))

/** Shallow selector for demo session chrome / nav. */
export const useLayoutSession = () =>
  useLayoutStore(
    useShallow((s) => ({
      shortId: s.shortId,
      isDemoSession: s.isDemoSession,
      workingLayout: s.workingLayout,
      workingSource: s.workingSource,
      audience: s.audience,
      bakeTheme: s.bakeTheme,
      themeOverride: s.themeOverride,
    })),
  )

export type {
  Theme,
  Accent,
  Density,
  NotificationPreferences,
  ThemeAttrs,
} from "./preferencesSlice"
export { selectThemeAttrs } from "./preferencesSlice"
export type { LayoutSlice, LayoutSessionView } from "./layoutSlice"
