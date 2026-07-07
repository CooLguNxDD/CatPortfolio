import type { Layout } from "@/content/schema";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type ProjectGridProps = Extract<Layout["blocks"][number], { type: "projectGrid" }>["props"];

export function ProjectGrid({ projects }: ProjectGridProps) {
  if (!projects || projects.length === 0) return null;

  return (
    <div className="w-full py-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {projects.map((project) => {
          const hasFooter = project.links && project.links.length > 0;
          return (
            <Card key={project.id} className="flex flex-col justify-between border border-(--hairline) bg-card rounded-xl">
              <div className="flex-1">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-(--fg)">
                    {project.name}
                  </CardTitle>
                  <CardDescription className="text-sm text-(--fg-muted) mt-1">
                    {project.summary}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4 pt-2">
                  {project.tags && project.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {project.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-md border border-(--accent-border) bg-(--accent-bg) px-2 py-0.5 text-xs text-(--amber) font-mono tracking-wider"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {project.metrics && project.metrics.length > 0 && (
                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-mono border-t border-(--hairline) pt-3 mt-3">
                      {project.metrics.map((metric, mIdx) => (
                        <div key={mIdx} className="flex items-center gap-1.5">
                          <span className="uppercase text-(--fg-subtle) tracking-[0.1em]">{metric.label}</span>
                          <span className="text-(--amber) font-semibold tabular-nums">{metric.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </div>

              {hasFooter && (
                <CardFooter className="flex gap-2 justify-end mt-auto">
                  {project.links.map((link, lIdx) => (
                    <Button key={lIdx} variant="outline" size="sm" asChild>
                      <a href={link.href} target="_blank" rel="noreferrer">
                        {link.label}
                      </a>
                    </Button>
                  ))}
                </CardFooter>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
