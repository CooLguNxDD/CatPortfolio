/**
 * Apply layout.meta.theme + validated themeOverrides on every render path
 * (baked, ?j=, live, chat-carry) — not only ChatPanel.
 */

import { useEffect } from "react";
import type { Layout } from "@/content/schema";
import { sanitizeThemeOverrides } from "@/content/schema";
import { themeRegistry, DEFAULT_THEME_ID } from "@/themes/registry";
import { usePreferencesStore } from "@/store";

export function useLayoutTheme(layout: Layout | null | undefined) {
  const setTheme = usePreferencesStore((s) => s.setTheme);
  const currentTheme = usePreferencesStore((s) => s.theme);

  useEffect(() => {
    if (!layout?.meta) return;

    const themeId = layout.meta.theme;
    if (themeId && themeRegistry[themeId] && themeId !== currentTheme) {
      setTheme(themeId as typeof currentTheme);
    }

    const overrides = sanitizeThemeOverrides(layout.meta.themeOverrides);
    const root = document.documentElement;
    const applied: string[] = [];

    if (overrides) {
      for (const [k, v] of Object.entries(overrides)) {
        const prop = `--${k}`;
        root.style.setProperty(prop, v);
        applied.push(prop);
      }
    }

    return () => {
      for (const prop of applied) {
        root.style.removeProperty(prop);
      }
    };
    // intentionally not depending on currentTheme to avoid override thrash loops
    // eslint-disable-next-line react-hooks/exhaustive-deps -- layout identity drives apply
  }, [layout, setTheme]);

  // fallback default theme id export for callers
  return layout?.meta?.theme && themeRegistry[layout.meta.theme]
    ? layout.meta.theme
    : DEFAULT_THEME_ID;
}
