/**
 * Global Store Entry Point
 *
 * react-app-guide ownership:
 *   - Preferences → localStorage (device)
 *   - Demo session (`?j=`, themeOverride, working layout) → **in-memory only**
 *     (transient UI; lost on full page reload — URL `?j=` re-seeds identity)
 *   - Layout payloads → TanStack Query (server state)
 *   - Fish tank chrome (scene state / filter / bake dim) → in-memory transient
 *   - Chat pending prompt → non-persisted
 *   - Shareable tank view → URL `?v=` (router); `?f=` focus is router-owned
 *     but mirrored into `useFishTankStore.focus` so the canvas can subscribe
 *     it without prop drilling — see fish/fishBus.ts and hooks/useFishTank.ts
 */

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { useShallow } from "zustand/react/shallow"
import {
  createPreferencesSlice,
  type Accent,
  type Density,
  type NotificationPreferences,
  type PreferencesSlice,
} from "./preferencesSlice"
import type { CircadianMode } from "@/blocks/fishTankTokens"
import { DEFAULT_THEME_ID } from "@/themes/registry"
import { createLayoutSlice, type LayoutSlice } from "./layoutSlice"
import { createFishTankSlice, type FishTankSlice } from "./fishTankSlice"

type PreferencesStore = PreferencesSlice

const ACCENTS: readonly Accent[] = ["amber", "pink", "neon", "cyan", "violet"]
const DENSITIES: readonly Density[] = ["comfortable", "compact"]
const CIRCADIAN_MODES: readonly CircadianMode[] = ["auto", "day", "night"]
const DEFAULT_NOTIFICATIONS: NotificationPreferences = {
  errors: true,
  health: true,
  auth: false,
  digest: false,
}

/**
 * Validate the shape of a persisted `cat-portfolio-preferences` blob before
 * trusting it, instead of blindly casting `unknown` localStorage content —
 * a hand-edited or stale-version value should fall back per-field to a safe
 * default, never crash the store on read.
 */
function sanitizePersistedPreferences(persistedState: unknown): Partial<PreferencesStore> {
  const raw = (persistedState ?? {}) as Record<string, unknown>

  const theme = typeof raw.theme === "string" && raw.theme.length > 0 ? raw.theme : DEFAULT_THEME_ID
  const accent = ACCENTS.includes(raw.accent as Accent) ? (raw.accent as Accent) : "amber"
  const density = DENSITIES.includes(raw.density as Density) ? (raw.density as Density) : "comfortable"
  const circadian = CIRCADIAN_MODES.includes(raw.circadian as CircadianMode)
    ? (raw.circadian as CircadianMode)
    : "auto"

  const rawNotifications = (raw.notifications ?? {}) as Record<string, unknown>
  const notifications: NotificationPreferences = {
    errors: typeof rawNotifications.errors === "boolean" ? rawNotifications.errors : DEFAULT_NOTIFICATIONS.errors,
    health: typeof rawNotifications.health === "boolean" ? rawNotifications.health : DEFAULT_NOTIFICATIONS.health,
    auth: typeof rawNotifications.auth === "boolean" ? rawNotifications.auth : DEFAULT_NOTIFICATIONS.auth,
    digest: typeof rawNotifications.digest === "boolean" ? rawNotifications.digest : DEFAULT_NOTIFICATIONS.digest,
  }

  return { theme, accent, density, circadian, notifications }
}

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
      version: 1,
      migrate: (persistedState: unknown, _version: number) => {
        return sanitizePersistedPreferences(persistedState) as PreferencesStore
      },
      partialize: (state) => ({
        theme: state.theme,
        accent: state.accent,
        density: state.density,
        circadian: state.circadian,
        notifications: state.notifications,
      }),
    },
  ),
)

/**
 * Demo session — temporary in-memory store (no sessionStorage / localStorage).
 * Survives tank ↔ text client navigation; cleared on hard reload.
 * Re-enter via `?j=` in the URL.
 */
export const useLayoutStore = create<LayoutSlice>()((...args) => ({
  ...createLayoutSlice(...args),
}))

/**
 * Fish tank transient UI — non-persisted (react-app-guide §2 State Ownership).
 * Focus for deep links stays on the router (`?f=`); scene/filter live here.
 */
export const useFishTankStore = create<FishTankSlice>()((...args) => ({
  ...createFishTankSlice(...args),
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
export type {
  FishTankSlice,
  FishTankScene,
  FishTankChrome,
  TankState,
} from "./fishTankSlice"
export { useChatStore, type ChatSlice } from "./chatSlice"
