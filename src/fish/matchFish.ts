/**
 * Pure filter predicates for tank + flat grid (tank3d matches/applyFilter).
 */

import type { FishSpecimenInput } from "@/blocks/fishTankLayout"

export interface FishFilter {
  /** Free-text over title, blurb, description, tags, species. */
  query: string
  /** DomainId / species equality, or null for all. */
  domain: string | null
  /** Bake highlight set; empty = no bake filter. */
  highlightSlugs?: string[]
  /** When true, only highlight_slugs stay "lit" for dimming math. */
  bakeActive?: boolean
}

/** Normalize query once at the controller boundary. */
export function normalizeQuery(q: string | null | undefined): string {
  return (q ?? "").trim().toLowerCase()
}

/** Whether a specimen passes the active filter (search + domain). */
export function matchesFish(f: FishSpecimenInput, filter: FishFilter): boolean {
  const domain = filter.domain
  if (domain && f.species !== domain) return false
  const q = normalizeQuery(filter.query)
  if (!q) return true
  const hay = [f.title, f.blurb, f.description, f.species, ...(f.tags || [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
  return hay.includes(q)
}

/** Filter list for flat grid / count badges. */
export function filterFish(
  fish: FishSpecimenInput[],
  filter: FishFilter,
): FishSpecimenInput[] {
  return fish.filter((f) => matchesFish(f, filter))
}

/**
 * Lit factor for 3D opacity (0..1).
 * Search/domain dim non-matches; bake boosts highlight set.
 */
export function fishLitFactor(
  f: FishSpecimenInput,
  filter: FishFilter,
  focusedSlug?: string | null,
): number {
  if (focusedSlug && f.slug === focusedSlug) return 1
  if (!matchesFish(f, filter)) return 0.16
  if (filter.bakeActive && filter.highlightSlugs?.length) {
    return filter.highlightSlugs.includes(f.slug) ? 1.12 : 0.72
  }
  return 1
}

/** Domains present in the school (stable DomainId order optional via preferred). */
export function domainsInSchool(
  fish: FishSpecimenInput[],
  preferredOrder: readonly string[] = ["ai", "devops", "mobile", "platform"],
): string[] {
  const present = new Set(fish.map((f) => f.species))
  const ordered = preferredOrder.filter((d) => present.has(d))
  for (const d of present) {
    if (!ordered.includes(d)) ordered.push(d)
  }
  return ordered
}
