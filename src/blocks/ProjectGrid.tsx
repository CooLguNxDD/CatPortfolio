/**
 * Project inventory grid — same Card chrome as agent-authored tiles.
 * Recruiter order uses bake highlight slugs then fish timeline years.
 */

import { useMemo } from "react"
import type { Layout } from "@/content/schema"
import { Card } from "./Card"
import { useLayoutStore } from "@/store"
import { sceneFromLayout } from "@/fish/sceneFromLayout"
import { compareRecruiterOrder, yearRangeLabel } from "@/fish/matchFish"
import { useRenderedLayout } from "@/render/layoutContext"

type ProjectGridProps = Extract<
  Layout["blocks"][number],
  { type: "projectGrid" }
>["props"]

/**
 * Project inventory grid — renders each project via the shared Card block
 * so agent-authored cards and project tiles stay visually identical.
 */
export function ProjectGrid({ projects }: ProjectGridProps) {
  const rendered = useRenderedLayout()
  const working = useLayoutStore((s) => s.workingLayout)
  const layout = rendered ?? working
  const scene = sceneFromLayout(layout)
  const highlightSlugs =
    layout?.meta?.highlightSlugs ?? scene.highlightSlugs ?? []

  const ordered = useMemo(() => {
    if (!projects || projects.length === 0) return []
    const bySlug = new Map(scene.fish.map((f) => [f.slug.toLowerCase(), f]))
    return [...projects].sort((a, b) => {
      const fa = bySlug.get(String(a.id || "").toLowerCase())
      const fb = bySlug.get(String(b.id || "").toLowerCase())
      return compareRecruiterOrder(
        { slug: String(a.id || ""), startYear: fa?.startYear, endYear: fa?.endYear },
        { slug: String(b.id || ""), startYear: fb?.startYear, endYear: fb?.endYear },
        highlightSlugs,
      )
    })
  }, [projects, scene.fish, highlightSlugs])

  if (ordered.length === 0) return null

  return (
    <div className="w-full py-2">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {ordered.map((project) => {
          const fish = scene.fish.find(
            (f) => f.slug.toLowerCase() === String(project.id || "").toLowerCase(),
          )
          const range = fish ? yearRangeLabel(fish) : null
          const domain =
            (fish?.species as "ai" | "devops" | "mobile" | "platform" | undefined) ||
            inferDomain(project.tags, project.id)
          return (
            <Card
              key={project.id}
              title={project.name}
              eyebrow={range ? `${domain ?? "project"} · ${range}` : undefined}
              body={project.summary}
              tags={project.tags}
              metrics={project.metrics}
              links={project.links}
              domain={domain}
            />
          )
        })}
      </div>
    </div>
  )
}

/** Best-effort domain tint from tags/id for Open Design matrix chroma. */
function inferDomain(
  tags: string[] | undefined,
  id: string,
): "ai" | "devops" | "mobile" | "platform" | undefined {
  const hay = `${id} ${(tags ?? []).join(" ")}`.toLowerCase()
  if (/mcp|langgraph|pgvector|ai|llm|agent/.test(hay)) return "ai"
  if (/aws|terraform|eks|devops|infra|docker|k8s/.test(hay)) return "devops"
  if (/mobile|react.?native|amplify|graphql/.test(hay)) return "mobile"
  if (/sms|platform|axios|messaging/.test(hay)) return "platform"
  return undefined
}
