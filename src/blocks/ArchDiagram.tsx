import { lazy, Suspense } from "react";
import type { Layout } from "@/content/schema";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

type ArchDiagramProps = Extract<Layout["blocks"][number], { type: "archDiagram" }>["props"];

const MermaidDiagram = lazy(() => import("./MermaidDiagram"));

/** `archDiagram` block: renders `source` as an inline SVG data-URI (`kind: "svg"`) or a lazy-loaded Mermaid diagram, in a titled card. */
export function ArchDiagram({ title, kind, source }: ArchDiagramProps) {
  return (
    <div className="w-full py-6">
      <Card className="border border-(--hairline) bg-card rounded-xl overflow-hidden">
        <CardHeader className="border-b border-(--hairline)">
          <CardTitle className="text-base font-mono uppercase tracking-[0.16em] text-(--fg)">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 flex justify-center items-center overflow-x-auto bg-(--bg-sunken)">
          {kind === "svg" ? (
            <img
              alt={title}
              src={"data:image/svg+xml;utf8," + encodeURIComponent(source)}
              className="max-w-full h-auto"
            />
          ) : (
            <Suspense
              fallback={
                <pre className="w-full overflow-x-auto p-4 font-mono text-xs text-(--fg-muted) bg-(--bg-sunken)">
                  {source}
                </pre>
              }
            >
              <MermaidDiagram source={source} />
            </Suspense>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
