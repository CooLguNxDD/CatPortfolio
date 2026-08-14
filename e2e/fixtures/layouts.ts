export const LAYOUT = {
  version: 1,
  meta: {
    audience: "default",
    generatedAt: "2026-01-01T00:00:00Z",
    dag: { levels: [{ level: 0, label: "Intro", nodes: ["h1"] }] },
  },
  blocks: [
    { type: "hero", id: "h1", props: { title: "Hi", subtitle: "there" } },
    { type: "card", id: "card-weltel-ai", props: { title: "AI" } },
    {
      type: "fishTank",
      id: "fish-tank-1",
      props: {
        renderer: "webgl",
        fish: [
          { slug: "weltel-ai", title: "AI", species: "ai", size: 0.5, depth: 0.3, speed: 0.5, glow: 0.5, school: 0, tags: [], metrics: [] },
          { slug: "weltel-devops", title: "DevOps", species: "devops", size: 0.5, depth: 0.7, speed: 0.5, glow: 0.5, school: 1, tags: [], metrics: [] },
        ],
        highlightSlugs: [],
        timeSpan: { min: 2020, max: 2025 },
      },
    },
    { type: "quickActions", id: "cta", props: { prompt: "Ask:", actions: [{ label: "a", prompt: "b" }] } },
  ],
};
