/**
 * Theme Context
 *
 * Holds the resolved theme registry for consumers (e.g. the theme selector UI).
 */
import { createContext } from "react"
import type { ThemeDef } from "./registry"

export interface ThemeContextValue {
  registry: Record<string, ThemeDef>
}

/** React context carrying the resolved theme registry; `null` outside a `ThemeProvider`. See file header. */
export const ThemeContext = createContext<ThemeContextValue | null>(null)
