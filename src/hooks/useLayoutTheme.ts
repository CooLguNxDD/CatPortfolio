/**
 * Apply layout.meta.theme + validated themeOverrides on every render path
 * (baked, ?j=, live, chat-carry) — not only ChatPanel.
 */

import { useEffect, useRef } from "react";
import type { Layout } from "@/content/schema";
import { sanitizeThemeOverrides } from "@/content/schema";
import { themeRegistry, DEFAULT_THEME_ID } from "@/themes/registry";
import { usePreferencesStore } from "@/store";

/** Applies layout-specific theme variables and overrides to the document. */
export function useLayoutTheme(layout: Layout | null | undefined) {
  const setTheme = usePreferencesStore((s) => s.setTheme);
  const lastOverridesRef = useRef<string>("");
  const appliedRef = useRef<string[]>([]);

  useEffect(() => {
    if (!layout?.meta) return;

    const themeId = layout.meta.theme;
    const currentTheme = usePreferencesStore.getState().theme;
    if (themeId && themeRegistry[themeId] && themeId !== currentTheme) {
      setTheme(themeId as typeof currentTheme);
    }

    const overrides = sanitizeThemeOverrides(layout.meta.themeOverrides);
    const overridesStr = JSON.stringify(overrides || {});
    // Skip re-applying when a background refetch returns a structurally
    // identical layout (new object reference, same overrides) — but keep
    // whatever is already applied on the root untouched either way.
    if (overridesStr === lastOverridesRef.current) {
      return;
    }
    lastOverridesRef.current = overridesStr;

    const root = document.documentElement;
    for (const prop of appliedRef.current) {
      root.style.removeProperty(prop);
    }
    const applied: string[] = [];
    if (overrides) {
      for (const [k, v] of Object.entries(overrides)) {
        const prop = `--${k}`;
        root.style.setProperty(prop, v);
        applied.push(prop);
      }
    }
    appliedRef.current = applied;
  }, [layout, setTheme]);

  useEffect(() => {
    return () => {
      const root = document.documentElement;
      for (const prop of appliedRef.current) {
        root.style.removeProperty(prop);
      }
    };
  }, []);

  // fallback default theme id export for callers
  return layout?.meta?.theme && themeRegistry[layout.meta.theme]
    ? layout.meta.theme
    : DEFAULT_THEME_ID;
}
