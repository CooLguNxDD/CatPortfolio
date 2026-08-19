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
import { createPreferencesSlice, type PreferencesSlice } from "./preferencesSlice"
import { createLayoutSlice, type LayoutSlice } from "./layoutSlice"
import { createFishTankSlice, type FishTankSlice } from "./fishTankSlice"

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
      version: 1,
      migrate: (persistedState: unknown, _version: number) => {
        return persistedState as PreferencesStore
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
