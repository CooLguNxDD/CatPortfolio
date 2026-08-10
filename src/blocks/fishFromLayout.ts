/**
 * Derive FishSpecimen[] from an existing layout (Phase 1 adapter).
 * Works on every already-baked ?j= row without a fishTank block.
 */

import type { DomainIdType, Layout } from "@/content/schema"
import { clamp01, type FishSpecimenInput } from "./fishTankLayout"
import { hashToUnit } from "./scene2dLayout"
import { ALL_DOMAIN_IDS } from "./fishTankTokens"

const DOMAIN_SET = new Set<string>(ALL_DOMAIN_IDS)

function asDomain(raw: unknown): DomainIdType {
  if (typeof raw === "string" && DOMAIN_SET.has(raw)) {
    return raw as DomainIdType
  }
  return "platform"
}

function clampTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return []
  return tags
    .filter((t): t is string => typeof t === "string")
    .slice(0, 24)
    .map((t) => t.slice(0, 48))
}

function clampBody(s: unknown): string | undefined {
  if (typeof s !== "string" || !s.trim()) return undefined
  return s.slice(0, 600)
}

function metricsFrom(raw: unknown): { label: string; value: string }[] {
  if (!Array.isArray(raw)) return []
  const out: { label: string; value: string }[] = []
  for (const m of raw) {
    if (!m || typeof m !== "object") continue
    const label = (m as { label?: unknown }).label
    const value = (m as { value?: unknown }).value
    if (label == null || value == null) continue
    out.push({ label: String(label).slice(0, 40), value: String(value).slice(0, 40) })
    if (out.length >= 6) break
  }
  return out
}

function linkFrom(raw: unknown): { label: string; href: string } | undefined {
  if (typeof raw === "string" && /^https?:\/\//i.test(raw)) {
    return { label: "Open", href: raw }
  }
  if (!raw || typeof raw !== "object") return undefined
  const href = (raw as { href?: unknown }).href
  const label = (raw as { label?: unknown }).label
  if (typeof href === "string" && /^https?:\/\//i.test(href)) {
    return { label: typeof label === "string" ? label : "Open", href }
  }
  return undefined
}

function schoolFrom(domain: DomainIdType, tags: string[]): number {
  // Stable school id from domain / first tag (dense from 0 in post-pass).
  const key = tags[0]?.toLowerCase() || domain
  return Math.floor(hashToUnit(`school:${key}`) * 12)
}

function sizeFromCard(body: string | undefined, tags: string[], metrics: unknown): number {
  const bodyLen = (body || "").length
  const tagN = tags.length
  const metricN = Array.isArray(metrics) ? metrics.length : 0
  // Rough map of content richness → size in [0,1]
  const s = bodyLen / 400 + tagN / 20 + metricN / 8
  return clamp01(s * 0.55 + 0.25)
}

function speedFromSlug(slug: string, size: number): number {
  // Deterministic visual variety — NOT labelled as activity.
  return clamp01(0.35 + 0.3 * hashToUnit(slug) + 0.25 * size)
}

interface PartialFish {
  slug: string
  title: string
  species: DomainIdType
  size: number
  depth: number
  speed: number
  glow: number
  school: number
  tags: string[]
  blurb?: string
  description?: string
  metrics: { label: string; value: string }[]
  link?: { label: string; href: string }
  bandIndex: number
}

/** Prefer explicit fishTank block; else derive from card / projectGrid. */
export function fishFromLayout(layout: Layout | null | undefined): FishSpecimenInput[] {
  if (!layout?.blocks?.length) return []

  // Phase 2 path: authored fishTank block wins when present and non-empty.
  for (const b of layout.blocks) {
    if (b.type === "fishTank") {
      const fish = b.props?.fish
      if (Array.isArray(fish) && fish.length > 0) {
        return fish.slice(0, 40).map((f) => normalizeSpecimen(f))
      }
    }
  }

  const partials: PartialFish[] = []
  const seen = new Set<string>()
  let bandIndex = 0

  for (const b of layout.blocks) {
    if (b.type === "card") {
      const id = String(b.id || "")
      let slug = id.startsWith("card-") ? id.slice(5) : id
      if (!slug) slug = `card-${bandIndex}`
      const key = slug.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      const props = b.props || {}
      const tags = clampTags(props.tags)
      const body = clampBody(props.body)
      const metrics = metricsFrom(props.metrics)
      const species = asDomain(props.domain)
      const size = sizeFromCard(body, tags, props.metrics)
      const badgeN = Array.isArray(props.badges) ? props.badges.length : 0
      partials.push({
        slug,
        title: String(props.title || slug).slice(0, 80),
        species,
        size,
        depth: clamp01(bandIndex / Math.max(1, 12)),
        speed: speedFromSlug(slug, size),
        glow: clamp01(0.3 + badgeN * 0.1 + size * 0.25),
        school: schoolFrom(species, tags),
        tags,
        blurb: body,
        description: body,
        metrics,
        link: Array.isArray(props.links) ? linkFrom(props.links[0]) : undefined,
        bandIndex,
      })
      bandIndex += 1
      continue
    }

    if (b.type === "projectGrid") {
      const projects = b.props?.projects
      if (!Array.isArray(projects)) continue
      for (const p of projects) {
        if (!p || typeof p !== "object") continue
        const slug = String(p.id || "").trim()
        if (!slug) continue
        const key = slug.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        const tags = clampTags(p.tags)
        const body = clampBody(p.summary)
        const metrics = metricsFrom(p.metrics)
        const species = asDomain(undefined)
        const size = sizeFromCard(body, tags, p.metrics)
        partials.push({
          slug,
          title: String(p.name || slug).slice(0, 80),
          species,
          size,
          depth: clamp01(bandIndex / Math.max(1, 12)),
          speed: speedFromSlug(slug, size),
          glow: clamp01(0.3 + size * 0.3),
          school: schoolFrom(species, tags),
          tags,
          blurb: body,
          description: body,
          metrics,
          link: Array.isArray(p.links) ? linkFrom(p.links[0]) : undefined,
          bandIndex,
        })
        bandIndex += 1
      }
    }
  }

  // Densify school ids to 0..N-1 while keeping relative grouping.
  const schoolKeys = new Map<number, number>()
  let nextSchool = 0
  for (const p of partials) {
    if (!schoolKeys.has(p.school)) {
      schoolKeys.set(p.school, nextSchool++)
    }
    p.school = schoolKeys.get(p.school)!
  }

  return partials.slice(0, 40).map((p) => ({
    slug: p.slug,
    title: p.title,
    species: p.species,
    size: clamp01(p.size),
    depth: clamp01(p.depth),
    speed: clamp01(p.speed),
    glow: clamp01(p.glow),
    school: p.school,
    tags: p.tags,
    blurb: p.blurb,
    description: p.description,
    metrics: p.metrics,
    link: p.link,
  }))
}

function normalizeSpecimen(raw: Record<string, unknown> | FishSpecimenInput): FishSpecimenInput {
  const r = raw as Record<string, unknown>
  const slug = String(r.slug || "fish").slice(0, 80)
  const size = clamp01(typeof r.size === "number" ? r.size : 0.5)
  return {
    slug,
    title: String(r.title || slug).slice(0, 80),
    species: asDomain(r.species),
    size,
    depth: clamp01(typeof r.depth === "number" ? r.depth : 0.5),
    speed: clamp01(typeof r.speed === "number" ? r.speed : speedFromSlug(slug, size)),
    glow: clamp01(typeof r.glow === "number" ? r.glow : 0.3),
    school: Math.max(0, Math.min(15, Math.floor(Number(r.school) || 0))),
    tags: clampTags(r.tags),
    blurb: clampBody(r.blurb),
    description: clampBody(r.description),
    metrics: metricsFrom(r.metrics),
    link: linkFrom(r.link),
  }
}
