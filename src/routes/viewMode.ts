/**
 * Pure view-mode resolution for HomePage (tank default + fallback ladder).
 */

export type ViewMode = "tank" | "text"

export interface ViewCaps {
  webgl2: boolean
  reducedMotion: boolean
}

/**
 * Resolve whether to show the tank stage or the text layout.
 * Explicit `v=text` always wins. Tank only when capable + fish exist.
 */
export function resolveViewMode(
  search: { v?: "text" | "tank" | undefined } | null | undefined,
  caps: ViewCaps,
  fishCount: number,
): ViewMode {
  if (search?.v === "text") return "text"
  if (!caps.webgl2) return "text"
  if (caps.reducedMotion) return "text"
  if (fishCount < 1) return "text"
  return "tank"
}

/** Probe WebGL2 without creating a long-lived context (best-effort). */
export function probeWebGL2(): boolean {
  if (typeof document === "undefined") return false
  try {
    const canvas = document.createElement("canvas")
    const gl = canvas.getContext("webgl2")
    return !!gl
  } catch {
    return false
  }
}

/** prefers-reduced-motion media query. */
export function prefersReducedMotion(): boolean {
  if (typeof matchMedia !== "function") return false
  try {
    return matchMedia("(prefers-reduced-motion: reduce)").matches
  } catch {
    return false
  }
}
