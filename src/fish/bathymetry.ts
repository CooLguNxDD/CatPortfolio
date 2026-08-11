/**
 * Abyssal bathymetry — the tank's vertical axis read as a timeline.
 *
 * Depth already encodes age in the tank's own legend ("size = scope · depth =
 * age"), so the bands derive from the existing `depth` ∈ [0,1] specimen field.
 * No layout schema field is involved, and therefore no Zod / mirror sync.
 *
 * Pure and DOM-free: the scrubber component and the canvas both read from here.
 */

import { SWIM_Y_MAX, SWIM_Y_MIN } from "@/blocks/fishTankLayout"

export type BathymetryZone = "surface" | "mesopelagic" | "abyss"

export interface DepthBand {
  zone: BathymetryZone
  label: string
  /** Story framing shown under the label. */
  blurb: string
  /** Inclusive lower bound of the band in depth01 space. */
  from: number
  /** Exclusive upper bound (the deepest band includes 1). */
  to: number
  /** Year offset from "now": 0 = current year, -1 = last year, … */
  yearOffset: number
}

/**
 * Three bands, ordered shallow → deep. Boundaries are the report's 0–3 m /
 * 4–9 m / 10–15 m split renormalised onto depth01.
 */
export const DEPTH_BANDS: readonly DepthBand[] = [
  {
    zone: "surface",
    label: "Surface",
    blurb: "Shipped now · active",
    from: 0,
    to: 0.28,
    yearOffset: 0,
  },
  {
    zone: "mesopelagic",
    label: "Mid water",
    blurb: "Last year",
    from: 0.28,
    to: 0.66,
    yearOffset: -1,
  },
  {
    zone: "abyss",
    label: "Abyss",
    blurb: "Legacy · foundations",
    from: 0.66,
    to: 1,
    yearOffset: -2,
  },
] as const

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(1, v))
}

/** Band containing a depth01 value. Always returns a band (never null). */
export function bandForDepth(depth01: number): DepthBand {
  const d = clamp01(depth01)
  for (const band of DEPTH_BANDS) {
    if (d >= band.from && d < band.to) return band
  }
  return DEPTH_BANDS[DEPTH_BANDS.length - 1]
}

/** Year label for a band, resolved against a reference year (defaults to now). */
export function yearLabelForBand(band: DepthBand, referenceYear?: number): string {
  const base = referenceYear ?? new Date().getFullYear()
  const year = base + band.yearOffset
  return band.yearOffset <= -2 ? `${year} & earlier` : String(year)
}

/** Bands decorated with their resolved year label — what the scrubber renders. */
export function depthBands(referenceYear?: number): (DepthBand & { year: string })[] {
  return DEPTH_BANDS.map((band) => ({ ...band, year: yearLabelForBand(band, referenceYear) }))
}

/** World Y for a depth01 value, inside the usable swim band. */
export function worldYForDepth(depth01: number): number {
  return SWIM_Y_MAX - clamp01(depth01) * (SWIM_Y_MAX - SWIM_Y_MIN)
}

/** World Y at the centre of a band — where the camera parks when scrubbed. */
export function worldYForBand(band: DepthBand): number {
  return worldYForDepth((band.from + band.to) / 2)
}

/** Inverse of `worldYForDepth`, for reading a camera height back as a depth. */
export function depthForWorldY(y: number): number {
  const span = SWIM_Y_MAX - SWIM_Y_MIN
  if (span <= 0) return 0
  return clamp01((SWIM_Y_MAX - y) / span)
}
