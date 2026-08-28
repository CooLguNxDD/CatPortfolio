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

/** Words too common to carry signal when scoring a visitor question.
 *  Keep in sync with OpenCat ``ask/router.py`` ``_ASK_STOPWORDS``. */
const STOPWORDS = new Set([
  "a", "an", "the", "this", "that", "these", "those",
  "i", "im", "ive", "id", "me", "my", "mine", "we", "us", "our",
  "you", "your", "yours", "they", "them", "their", "it", "its",
  "is", "am", "are", "was", "were", "be", "been", "being",
  "do", "does", "did", "done", "have", "has", "had", "having",
  "can", "could", "would", "should", "will", "shall", "may", "might", "must",
  "dont", "didnt", "cant", "wont",
  "how", "what", "when", "where", "which", "who", "whom", "why",
  "tell", "show", "describe", "explain", "walk", "talk", "ask",
  "give", "list", "see", "look", "looking", "know", "knew",
  "want", "wanted", "need", "needed", "get", "got", "getting",
  "make", "made", "use", "used", "using",
  "about", "regarding", "related",
  "work", "worked", "working", "works",
  "built", "build", "building",
  "project", "projects", "experience", "experiences",
  "portfolio", "resume", "site", "page",
  "thing", "things", "stuff", "one", "ones",
  "info", "information", "detail", "details",
  "and", "or", "but", "for", "with", "from", "into", "onto", "over", "under",
  "of", "on", "in", "at", "to", "by", "as", "if", "than", "then", "so",
  "not", "no", "nor", "through", "across", "around", "between",
  "after", "before", "during", "while", "because",
  "any", "some", "more", "much", "many", "most", "other", "another", "such", "same",
  "like", "just", "also", "too", "very", "really", "quite", "still", "even", "only",
  "please", "maybe", "actually", "basically",
  "something", "anything", "everything", "nothing",
  "here", "there", "now", "again", "well", "yeah", "yes", "ok", "okay",
  "hey", "hi", "hello",
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

/**
 * Resolve a chart series/point label to a specimen. Exact slug or title wins;
 * a unique substring match is accepted. No match → no affordance.
 */
export function matchFishByName(
  fish: FishSpecimenInput[],
  name: string,
): FishSpecimenInput | null {
  const n = name.trim().toLowerCase()
  if (!n || !fish.length) return null
  const exact = fish.find(
    (f) => f.slug.toLowerCase() === n || f.title.toLowerCase() === n,
  )
  if (exact) return exact
  const hits = fish.filter(
    (f) => f.slug.toLowerCase().includes(n) || f.title.toLowerCase().includes(n),
  )
  return hits.length === 1 ? hits[0] : null
}

/** Normalized highlight lookup for the recruiter sort. */
export function highlightSet(highlightSlugs?: string[] | null): Set<string> {
  return new Set((highlightSlugs ?? []).map((s) => s.trim().toLowerCase()).filter(Boolean))
}

interface RecruiterOrderable {
  slug: string
  startYear?: number
  endYear?: number
}

/** Recruiter sort: bake highlights first, then newest startYear/endYear. */
export function compareRecruiterOrder(
  a: RecruiterOrderable,
  b: RecruiterOrderable,
  highlightSlugs?: string[] | Set<string> | null,
): number {
  const hl = highlightSlugs instanceof Set ? highlightSlugs : highlightSet(highlightSlugs)
  const ah = hl.has(a.slug.toLowerCase()) ? 0 : 1
  const bh = hl.has(b.slug.toLowerCase()) ? 0 : 1
  if (ah !== bh) return ah - bh
  const year = (f: RecruiterOrderable) =>
    f.startYear ?? f.endYear ?? Number.NEGATIVE_INFINITY
  const ya = year(a)
  const yb = year(b)
  // Subtraction would yield NaN for two undated entries (-Inf - -Inf).
  if (ya === yb) return 0
  return yb > ya ? 1 : -1
}

/** Recruiter index: bake highlights first, then newest `startYear`/`endYear`. */
export function orderFishForRecruiter(
  fish: FishSpecimenInput[],
  highlightSlugs?: string[] | null,
): FishSpecimenInput[] {
  const hl = highlightSet(highlightSlugs)
  return [...fish].sort((a, b) => compareRecruiterOrder(a, b, hl))
}

/** Display range from fractional years (`2025.67` → `2025–now`). */
export function yearRangeLabel(f: {
  startYear?: number
  endYear?: number
}): string | null {
  if (f.startYear == null && f.endYear == null) return null
  const start = f.startYear != null ? String(Math.floor(f.startYear)) : "?"
  const end = f.endYear != null ? String(Math.floor(f.endYear)) : "now"
  return `${start}–${end}`
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
