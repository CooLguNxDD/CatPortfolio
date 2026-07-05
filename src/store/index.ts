/**
 * Global Store Entry Point
 *
 * Orchestrates the creation and composition of Zustand store slices.
 * Handles persistence for user preferences.
 */

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { createPreferencesSlice, type PreferencesSlice } from "./preferencesSlice"

type PreferencesStore = PreferencesSlice

/**
 * Store hook for user preferences.
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

export type {
  Theme,
  Accent,
  Density,
  NotificationPreferences,
  ThemeAttrs,
} from "./preferencesSlice"
export { selectThemeAttrs } from "./preferencesSlice"
