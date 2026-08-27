import type { Layout } from "@/content/schema";
import { Card } from "./Card";
import { useLayoutStore } from "@/store";

type ProjectGridProps = Extract<
  Layout["blocks"][number],
  { type: "projectGrid" }
>["props"];

/**
 * Project inventory grid — renders each project via the shared Card block
 * so agent-authored cards and project tiles stay visually identical.
 */
export function ProjectGrid({ projects }: ProjectGridProps) {
  const highlightSlugs = useLayoutStore((s) => s.workingLayout?.meta?.highlightSlugs) ?? [];
  if (!projects || projects.length === 0) return null;
  const hl = new Set(highlightSlugs.map((s) => s.toLowerCase()));
  const ordered = [...projects].sort((a, b) => {
    const ah = hl.has(String(a.id || "").toLowerCase()) ? 0 : 1;
    const bh = hl.has(String(b.id || "").toLowerCase()) ? 0 : 1;
    return ah - bh;
  });

  return (
    <div className="w-full py-2">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {ordered.map((project) => (
          <Card
            key={project.id}
            title={project.name}
            body={project.summary}
            tags={project.tags}
            metrics={project.metrics}
            links={project.links}
            domain={inferDomain(project.tags, project.id)}
          />
        ))}
      </div>
    </div>
  );
}

/** Best-effort domain tint from tags/id for Open Design matrix chroma. */
function inferDomain(
  tags: string[] | undefined,
  id: string,
): "ai" | "devops" | "mobile" | "platform" | undefined {
  const hay = `${id} ${(tags ?? []).join(" ")}`.toLowerCase();
  if (/mcp|langgraph|pgvector|ai|llm|agent/.test(hay)) return "ai";
  if (/aws|terraform|eks|devops|infra|docker|k8s/.test(hay)) return "devops";
  if (/mobile|react.?native|amplify|graphql/.test(hay)) return "mobile";
  if (/sms|platform|axios|messaging/.test(hay)) return "platform";
  return undefined;
}
