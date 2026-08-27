import type { Layout } from "@/content/schema";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";

type StarStoryProps = Extract<Layout["blocks"][number], { type: "starStory" }>["props"];

/** `starStory` block: Situation/Task/Action/Result quadrant card with an optional tag footer. */
export function StarStory({ situation, task, action, result, tags }: StarStoryProps) {
  const sections = [
    { label: "Situation", content: situation },
    { label: "Task", content: task },
    { label: "Action", content: action },
    { label: "Result", content: result },
  ];

  return (
    <div className="w-full py-6">
      <Card className="border border-(--hairline) bg-card rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg font-mono uppercase tracking-[0.16em] text-(--fg)">
            S.T.A.R. Story
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sections.map((sec, idx) => (
            <div key={idx} className="space-y-1">
              <div className="font-mono uppercase tracking-[0.16em] text-xs text-(--fg-subtle)">
                {sec.label}
              </div>
              <div className="text-sm text-(--fg-muted) leading-relaxed">
                {sec.content}
              </div>
            </div>
          ))}
        </CardContent>
        {tags && tags.length > 0 && (
          <CardFooter className="flex flex-wrap gap-1.5 border-t border-(--hairline) bg-muted/30">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-(--accent-border) bg-(--accent-bg) px-2 py-0.5 text-xs text-(--amber) font-mono tracking-wider"
              >
                {tag}
              </span>
            ))}
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
