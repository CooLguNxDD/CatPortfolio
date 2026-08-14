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

/** Words too common to carry signal when scoring a visitor question. */
const STOPWORDS = new Set([
  "the", "and", "for", "you", "your", "with", "was", "are", "did", "any",
  "have", "has", "how", "what", "when", "where", "which", "who", "why",
  "tell", "show", "about", "work", "worked", "built", "build", "building",
  "project", "projects", "experience", "can", "could", "would", "does",
  "this", "that", "there", "some", "from", "into", "over", "more", "much",
  "like", "just", "also", "been", "them", "they", "were", "will",
])

/** Tokens worth scoring from a free-text question. */
export function questionTokens(question: string): string[] {
  return Array.from(
    new Set(
      (question || "")
        .toLowerCase()
        .split(/[^a-z0-9+#.]+/)
        // Two-char tokens survive because domains are short: "ai", "k8s", "go".
        .filter((t) => t.length > 1 && !STOPWORDS.has(t)),
    ),
  )
}

/**
 * Score one specimen against question tokens.
 *
 * Slug/title/tag hits weigh more than prose hits so "tell me about the devops
 * work" locks onto the devops fish rather than whichever blurb says "devops".
 */
export function scoreFishForQuestion(f: FishSpecimenInput, tokens: string[]): number {
  if (!tokens.length) return 0
  const strong = [f.slug, f.title, f.species, ...(f.tags || [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
  const weak = [f.blurb, f.description].filter(Boolean).join(" ").toLowerCase()
  let score = 0
  for (const t of tokens) {
    if (strong.includes(t)) score += 2
    else if (weak.includes(t)) score += 1
  }
  return score / tokens.length
}

/**
 * Best local match for a visitor question, or null when nothing clears `floor`.
 *
 * Runs before the network call so a fish already in the tank focuses with zero
 * latency; the server's `focus_slug` overrides this once the turn lands. Never
 * a substitute for server grounding — it only picks among fish already shown.
 */
export function bestFishForQuestion(
  fish: FishSpecimenInput[],
  question: string,
  floor = 0.5,
): FishSpecimenInput | null {
  const tokens = questionTokens(question)
  if (!tokens.length || !fish.length) return null
  let best: FishSpecimenInput | null = null
  let bestScore = 0
  for (const f of fish) {
    const score = scoreFishForQuestion(f, tokens)
    if (score > bestScore) {
      bestScore = score
      best = f
    }
  }
  return bestScore >= floor ? best : null
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
