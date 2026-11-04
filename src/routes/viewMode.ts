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
 * Explicit `v=text` always wins. Tank when capable and either specimens
 * exist or a fishTank block is authored (including fish: []).
 */
export function resolveViewMode(
  search: { v?: "text" | "tank" | undefined } | null | undefined,
  caps: ViewCaps,
  fishCount: number,
  hasAuthoredTank = false,
): ViewMode {
  if (search?.v === "text") return "text"
  if (!caps.webgl2) return "text"
  if (caps.reducedMotion) return "text"
  if (fishCount < 1 && !hasAuthoredTank) return "text"
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

/** Phone held upright: touch-first, portrait, and narrow. */
export const PHONE_PORTRAIT_QUERY =
  "(pointer: coarse) and (orientation: portrait) and (max-width: 820px)"

export interface OrientationCaps {
  /** `PHONE_PORTRAIT_QUERY` currently matches. */
  phonePortrait: boolean
  /** Visitor already rotated or chose "continue in portrait" this session. */
  acknowledged: boolean
}

/**
 * Whether the tank should be held behind the landscape gate.
 * Only ever true in tank mode; the gate never applies to `?v=text`.
 */
export function shouldGateOrientation(
  mode: ViewMode,
  caps: OrientationCaps,
): boolean {
  return mode === "tank" && caps.phonePortrait && !caps.acknowledged
}

/** Best-effort probe of `PHONE_PORTRAIT_QUERY` (false without matchMedia). */
export function probePhonePortrait(): boolean {
  if (typeof matchMedia !== "function") return false
  try {
    return matchMedia(PHONE_PORTRAIT_QUERY).matches
  } catch {
    return false
  }
}
