export interface ThemeDef {
  id: string
  label: string
  description?: string
  default?: boolean
  vars: Record<string, string>
}

export interface RawThemeFile {
  id: string
  label: string
  description?: string
  default?: boolean
  extends?: string
  vars: Record<string, string>
}

/**
 * Hand-rolled type guard validating a raw theme module.
 * It ensures id, label, and vars are present and of correct types,
 * and that all variables in the vars object are string values.
 * Optional fields extends, description, and default are validated if present.
 */
export function isValidRawTheme(obj: unknown): obj is RawThemeFile {
  if (typeof obj !== "object" || obj === null) {
    return false
  }

  const raw = obj as Record<string, unknown>

  if (typeof raw.id !== "string" || !raw.id) {
    return false
  }

  if (typeof raw.label !== "string" || !raw.label) {
    return false
  }

  if (typeof raw.vars !== "object" || raw.vars === null) {
    return false
  }

  // Validate vars: all keys must map to string values
  const vars = raw.vars as Record<string, unknown>
  for (const key of Object.keys(vars)) {
    if (typeof vars[key] !== "string") {
      return false
    }
  }

  if ("description" in raw && raw.description !== undefined && typeof raw.description !== "string") {
    return false
  }

  if ("default" in raw && raw.default !== undefined && typeof raw.default !== "boolean") {
    return false
  }

  if ("extends" in raw && raw.extends !== undefined && typeof raw.extends !== "string") {
    return false
  }

  return true
}

/**
 * Resolves the extends chain for a theme.
 * Recursively climbs the extends hierarchy to merge variable overrides.
 * Catches cyclic references and missing ancestor targets, logging via console.error.
 */
export function resolveThemeVars(
  themeId: string,
  rawThemes: Record<string, RawThemeFile>
): Record<string, string> {
  const visited = new Set<string>()
  const chain: RawThemeFile[] = []
  let currentId: string | undefined = themeId
  const maxDepth = 10

  while (currentId) {
    if (visited.has(currentId)) {
      console.error(
        `Cycle detected in theme extends chain starting from theme "${themeId}" involving theme "${currentId}".`
      )
      return rawThemes[themeId].vars
    }

    const currentTheme: RawThemeFile | undefined = rawThemes[currentId]
    if (!currentTheme) {
      console.error(
        `Theme "${currentId}" extended by another theme is missing in the registry.`
      )
      return rawThemes[themeId].vars
    }

    visited.add(currentId)
    chain.push(currentTheme)

    if (chain.length > maxDepth) {
      console.error(`Max inheritance depth reached resolving theme "${themeId}".`)
      return rawThemes[themeId].vars
    }

    currentId = currentTheme.extends
  }

  // Merge vars base-first (ancestors first, then overrides)
  let resolvedVars: Record<string, string> = {}
  for (let i = chain.length - 1; i >= 0; i--) {
    resolvedVars = { ...resolvedVars, ...chain[i].vars }
  }

  return resolvedVars
}

/**
 * Builds the final theme registry from a record of globbed modules.
 * Filters out malformed modules, resolves inheritance chains, and builds final ThemeDefs.
 */
export function buildRegistry(rawModules: Record<string, unknown>): Record<string, ThemeDef> {
  const rawThemes: Record<string, RawThemeFile> = {}

  for (const [path, mod] of Object.entries(rawModules)) {
    if (isValidRawTheme(mod)) {
      rawThemes[mod.id] = mod
    } else {
      console.error(`Theme file at ${path} is malformed or invalid.`)
    }
  }

  const registry: Record<string, ThemeDef> = {}

  for (const id of Object.keys(rawThemes)) {
    const rawTheme = rawThemes[id]
    const resolvedVars = resolveThemeVars(id, rawThemes)

    registry[id] = {
      id: rawTheme.id,
      label: rawTheme.label,
      description: rawTheme.description,
      default: rawTheme.default,
      vars: resolvedVars,
    }
  }

  return registry
}

// Vite glob import of all theme files in the directory
const rawModules = import.meta.glob<unknown>("./*.theme.json", {
  eager: true,
  import: "default",
})

export const themeRegistry: Record<string, ThemeDef> = buildRegistry(rawModules)
export const themeList: ThemeDef[] = Object.values(themeRegistry)
export const DEFAULT_THEME_ID = "mocha"
export const DEFAULT_LIGHT_THEME_ID = "latte"

/** Theme ids whose surfaces are light (Mermaid, mermaid-neutral, etc.). */
export const LIGHT_THEME_IDS = new Set(["paper", "latte"])

export type ThemeMode = "dark" | "light"

/** Dark vs light from a registered theme id (unknown ids count as dark). */
export function themeModeOf(themeId: string): ThemeMode {
  return LIGHT_THEME_IDS.has(themeId) ? "light" : "dark"
}

/** Themes available in a light or dark mode. */
export function themesForMode(mode: ThemeMode): ThemeDef[] {
  return themeList.filter((t) => themeModeOf(t.id) === mode)
}
