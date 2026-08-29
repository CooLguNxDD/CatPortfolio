/**
 * Flat DOM project index — same fish[] contract as the 3D tank (tank3d #flat).
 * SEO-safe, reduced-motion / ?v=text / WebGL-fallback path.
 */

import { useMemo, useState } from "react"
import type { FishSpecimenInput } from "@/blocks/fishTankLayout"
import {
  DOMAIN_LABEL,
  SPECIES_TOKEN,
  SPECIES_FALLBACK_HEX,
} from "@/blocks/fishTankTokens"
import { domainsInSchool, filterFish, orderFishForRecruiter, yearRangeLabel } from "@/fish/matchFish"
import type { DomainIdType } from "@/content/schema"
import { cn } from "@/lib/utils"

export interface FishFlatGridProps {
  fish: FishSpecimenInput[]
  onSelect?: (slug: string) => void
  curationLabel?: string
  className?: string
  /** Bake / ask highlight set — recruiter order only, not a filter. */
  highlightSlugs?: string[]
}

/** Recruiter fast view — filterable card grid from fish[]. */
export function FishFlatGrid({
  fish,
  onSelect,
  curationLabel,
  className,
  highlightSlugs,
}: FishFlatGridProps) {
  // Local UI for standalone block use; stage prefers controller via props later.
  const [q, setQ] = useState("")
  const [domain, setDomain] = useState<string | null>(null)

  const ordered = useMemo(
    () => orderFishForRecruiter(fish, highlightSlugs),
    [fish, highlightSlugs],
  )

  const filtered = useMemo(
    () => filterFish(ordered, { query: q, domain }),
    [ordered, q, domain],
  )

  const domainsPresent = useMemo(() => domainsInSchool(fish), [fish])

  return (
    <main className={cn("ft-flat", className)} data-fishtank-flat>
      <div className="mb-3">
        <span className="ft-eyebrow">⚡ Recruiter fast view · no WebGL required</span>
      </div>
      <h2>Project index</h2>
      <p className="ft-lead">
        Same specimens as the 3D tank — size, depth, glow, and domain live in the
        data contract, not the renderer.
      </p>
      {curationLabel ? (
        <p className="ft-curation-inline">
          <b>{curationLabel}</b>
        </p>
      ) : null}
      <div className="ft-flat-tools">
        <label htmlFor="q" className="sr-only">
          Filter projects
        </label>
        <input
          id="q"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter by title, tag or tech…"
          aria-label="Filter projects"
          className="ft-input"
        />
        <div className="ft-chips" role="group" aria-label="Domain filter">
          <button
            type="button"
            className={cn("ft-chip", !domain && "on")}
            onClick={() => setDomain(null)}
          >
            All
          </button>
          {domainsPresent.map((d) => {
            const sp = d as DomainIdType
            const token = SPECIES_TOKEN[sp] ?? "accent-platform"
            const hex = SPECIES_FALLBACK_HEX[sp] ?? "#fbbf24"
            return (
              <button
                key={d}
                type="button"
                className={cn("ft-chip", domain === d && "on")}
                onClick={() => setDomain(domain === d ? null : d)}
                style={
                  domain === d
                    ? { borderColor: `var(--${token}, ${hex})` }
                    : undefined
                }
              >
                {DOMAIN_LABEL[d] || d}
              </button>
            )
          })}
        </div>
      </div>
      <div className="ft-grid">
        {filtered.map((f) => {
          const sp = f.species as DomainIdType
          const token = SPECIES_TOKEN[sp] || "accent-platform"
          const hex = SPECIES_FALLBACK_HEX[sp] || "#fbbf24"
          return (
            <article
              key={f.slug}
              data-slug={f.slug}
              className="ft-card glass"
              role={onSelect ? "button" : undefined}
              tabIndex={onSelect ? 0 : undefined}
              onClick={() => onSelect?.(f.slug)}
              onKeyDown={(e) => {
                if (onSelect && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault()
                  onSelect(f.slug)
                }
              }}
            >
              <div className="ft-badge-row">
                <span
                  className="ft-badge"
                  style={{
                    color: `var(--${token}, ${hex})`,
                    borderColor: `color-mix(in oklab, var(--${token}, ${hex}) 45%, transparent)`,
                  }}
                >
                  {DOMAIN_LABEL[f.species] || f.species}
                </span>
                <span className="ft-ref">
                  size {(f.size * 100) | 0}% · depth {(f.depth * 100) | 0}%
                </span>
              </div>
              <h3>{f.title}</h3>
              {yearRangeLabel(f) ? (
                <p className="ft-ref">
                  {DOMAIN_LABEL[f.species] || f.species} · {yearRangeLabel(f)}
                </p>
              ) : null}
              {f.blurb ? <p>{f.blurb}</p> : null}
              {(f.metrics?.length ?? 0) > 0 ? (
                <div className="ft-kv">
                  {f.metrics!.slice(0, 3).map((m) => (
                    <div key={`${m.label}-${m.value}`}>
                      <span>{m.label}</span>
                      <b>{m.value}</b>
                    </div>
                  ))}
                </div>
              ) : null}
              {(f.tags?.length ?? 0) > 0 ? (
                <div className="ft-tagrow">
                  {f.tags!.slice(0, 6).map((t) => (
                    <span key={t} className="ft-tag">
                      {t}
                    </span>
                  ))}
                </div>
              ) : null}
            </article>
          )
        })}
      </div>
      {filtered.length === 0 ? (
        <p className="ft-lead" style={{ marginTop: 24 }}>
          No specimens match this filter.
        </p>
      ) : null}
    </main>
  )
}
