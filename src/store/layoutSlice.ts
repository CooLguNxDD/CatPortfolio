/**
 * Layout demo session slice — **temporary in-memory only** (no persist).
 *
 * Identity of the demo is the short_id (`?j=`). Full layout payloads are
 * server state (TanStack Query). Survives Home↔Ask client nav; lost on reload
 * (URL `?j=` re-enters the demo). Theme rules:
 *   - bakeTheme  — stamped from layout.meta.theme when the bake loads
 *   - themeOverride — header pick (not written to localStorage)
 */

import type { StateCreator } from "zustand"
import type { LayoutLoadResult, LayoutSource } from "@/content/loadLayout"
import type { Layout } from "@/content/schema"

export interface LayoutSlice {
  /** Active bake short id, e.g. `andrew_weltel_showcase_4` — mirrors `?j=`. */
  shortId: string | null
  /** True while a demo session is active (URL or rehydrated session). */
  isDemoSession: boolean
  /**
   * Working layout after chat expansions. When null, pages load via Query
   * using `shortId`. Not the initial server bake (that lives in Query cache).
   */
  workingLayout: Layout | null
  workingSource: LayoutSource | null
  audience: string | null
  /** Theme baked into the layout (layout.meta.theme). Authoritative on Home. */
  bakeTheme: string | null
  /**
   * Temporary theme from the header switcher during a demo session.
   * Cleared when returning to Home so the bake theme re-applies.
   */
  themeOverride: string | null

  /** Enter / re-enter demo from a URL `j` param (or bake meta). */
  enterDemo: (shortId: string) => void
  /** Record the theme from a successful bake load. */
  setBakeTheme: (theme: string | null | undefined) => void
  /** User picked a theme while viewing a demo (preview until Home). */
  setThemeOverride: (theme: string) => void
  /** Clear temporary theme so bake theme wins (Home navigation). */
  clearThemeOverride: () => void
  /** Apply an Ask/compose expansion onto the active demo. */
  setWorkingLayout: (result: LayoutLoadResult) => void
  /** Exit demo — clear session + working layout. */
  clearDemo: () => void
}

const EMPTY: Pick<
  LayoutSlice,
  | "shortId"
  | "isDemoSession"
  | "workingLayout"
  | "workingSource"
  | "audience"
  | "bakeTheme"
  | "themeOverride"
> = {
  shortId: null,
  isDemoSession: false,
  workingLayout: null,
  workingSource: null,
  audience: null,
  bakeTheme: null,
  themeOverride: null,
}

function audienceOf(result: LayoutLoadResult): string | null {
  if (typeof result.audience === "string" && result.audience.trim()) return result.audience
  const a = result.layout?.meta?.audience
  return typeof a === "string" && a.trim() ? a : null
}

/**
 * Creates the layout demo session slice.
 */
export const createLayoutSlice: StateCreator<LayoutSlice> = (set, get) => ({
  ...EMPTY,

  enterDemo: (shortId) => {
    const id = shortId?.trim()
    if (!id) return
    const prev = get()
    // Same id: keep working layout + theme state. New id: reset working copy.
    if (prev.shortId === id && prev.isDemoSession) return
    set({
      shortId: id,
      isDemoSession: true,
      workingLayout: prev.shortId === id ? prev.workingLayout : null,
      workingSource: prev.shortId === id ? prev.workingSource : null,
      audience: prev.shortId === id ? prev.audience : null,
      bakeTheme: prev.shortId === id ? prev.bakeTheme : null,
      themeOverride: prev.shortId === id ? prev.themeOverride : null,
    })
  },

  setBakeTheme: (theme) => {
    const t = typeof theme === "string" && theme.trim() ? theme.trim() : null
    if (!t) return
    const prev = get()
    if (prev.bakeTheme === t) return
    set({ bakeTheme: t })
  },

  setThemeOverride: (theme) => {
    const t = theme?.trim()
    if (!t) return
    set({ themeOverride: t })
  },

  clearThemeOverride: () => {
    if (get().themeOverride == null) return
    set({ themeOverride: null })
  },

  setWorkingLayout: (result) => {
    if (result.source === "snapshot") return
    const fromResult =
      typeof result.shortId === "string" && result.shortId.trim()
        ? result.shortId.trim()
        : null
    const shortId = fromResult ?? get().shortId
    const bakeFromLayout =
      typeof result.layout?.meta?.theme === "string"
        ? result.layout.meta.theme
        : null
    set({
      shortId,
      isDemoSession: true,
      workingLayout: result.layout,
      workingSource: result.source,
      audience: audienceOf(result) ?? get().audience,
      // Expansion may carry a new theme; otherwise keep prior bake theme.
      bakeTheme: bakeFromLayout ?? get().bakeTheme,
    })
  },

  clearDemo: () => set({ ...EMPTY }),
})

/** Stable selector fields for demo chrome (use with useShallow). */
export type LayoutSessionView = {
  shortId: string | null
  isDemoSession: boolean
  workingLayout: Layout | null
  workingSource: LayoutSource | null
  audience: string | null
  bakeTheme: string | null
  themeOverride: string | null
}
