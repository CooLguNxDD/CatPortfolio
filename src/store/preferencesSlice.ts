/**
 * Preferences Slice
 *
 * Manages user-configurable UI preferences including themes, accent colors,
 * layout density, and notification settings. Persisted to localStorage.
 */

import type { StateCreator } from "zustand"

import type { CircadianMode } from "@/blocks/fishTankTokens"
import { DEFAULT_THEME_ID } from "@/themes/registry"

export type Theme = string
export type Accent = "amber" | "pink" | "neon" | "cyan" | "violet"
export type Density = "comfortable" | "compact"

export interface NotificationPreferences {
  errors: boolean
  health: boolean
  auth: boolean
  digest: boolean
}

export type ThemeAttrs = Record<string, string>

export interface PreferencesSlice {
  theme: Theme
  accent: Accent
  density: Density
  /**
   * Fish tank day/night cycle. A device preference (react-app-guide §2), so it
   * persists rather than living in the transient tank slice.
   */
  circadian: CircadianMode
  notifications: NotificationPreferences
  setTheme: (theme: Theme) => void
  setAccent: (accent: Accent) => void
  setDensity: (density: Density) => void
  setCircadian: (mode: CircadianMode) => void
  /** Cycle auto → day → night → auto, for the single chrome chip. */
  cycleCircadian: () => void
  setNotification: (key: keyof NotificationPreferences, enabled: boolean) => void
  toggleNotification: (key: keyof NotificationPreferences) => void
}

/** Selector: returns data-attribute props to spread on any `.ct-root` element. */
export function selectThemeAttrs(s: PreferencesSlice): ThemeAttrs {
  const attrs: ThemeAttrs = {}
  if (s.theme !== DEFAULT_THEME_ID) attrs["data-theme"] = s.theme
  if (s.accent !== "amber") attrs["data-accent"] = s.accent
  if (s.density !== "comfortable") attrs["data-density"] = s.density
  return attrs
}

const DEFAULT_NOTIFICATIONS: NotificationPreferences = {
  errors: true,
  health: true,
  auth: false,
  digest: false,
}

/**
 * Creates the preferences slice of the Zustand store.
 */
export const createPreferencesSlice: StateCreator<PreferencesSlice> = (set) => ({
  theme: DEFAULT_THEME_ID,
  accent: "amber",
  density: "comfortable",
  circadian: "auto",
  notifications: DEFAULT_NOTIFICATIONS,
  setTheme: (theme) => set({ theme }),
  setAccent: (accent) => set({ accent }),
  setDensity: (density) => set({ density }),
  setCircadian: (circadian) => set({ circadian }),
  cycleCircadian: () =>
    set((state) => ({
      circadian:
        state.circadian === "auto" ? "day" : state.circadian === "day" ? "night" : "auto",
    })),
  setNotification: (key, enabled) =>
    set((state) => ({
      notifications: { ...state.notifications, [key]: enabled },
    })),
  toggleNotification: (key) =>
    set((state) => ({
      notifications: { ...state.notifications, [key]: !state.notifications[key] },
    })),
})
