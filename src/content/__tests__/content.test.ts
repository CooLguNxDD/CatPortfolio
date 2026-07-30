import { describe, it, expect } from "vitest";
import { LayoutSchema } from "../schema";
import type { Layout } from "../schema";
import { loadBaked, loadLiveWithStatus } from "../loadLayout";
import type { LayoutSource } from "../loadLayout";

describe("Content layer tests", () => {
  it("baked fixture parses", () => {
    const layout: Layout = loadBaked();
    expect(layout.version).toBe(1);
    expect(layout.blocks.length).toBeGreaterThanOrEqual(13);

    const types = layout.blocks.map(b => b.type);
    expect(types).toContain("hero");
    expect(types).toContain("kpiGrid");
    expect(types).toContain("flowAnim");
    expect(types).toContain("card");
    expect(types).toContain("chart");
    expect(types).toContain("comparison");
    expect(types).toContain("timeline");
    expect(types).toContain("composite");
    expect(types).toContain("starStory");
    expect(types).toContain("archDiagram");
    expect(types).toContain("codeSnippet");
    expect(types).toContain("prose");
    expect(types).toContain("quickActions");
    // Open Design matrix level-row DAG
    expect(layout.meta.dag?.levels?.length).toBeGreaterThan(0);
    expect(layout.meta.dag?.levels?.[0]?.nodes).toContain("h1");
  });

  it("accepts card block with domain accent", () => {
    const layout = LayoutSchema.parse({
      version: 1,
      meta: {
        audience: "default",
        generatedAt: "2026-07-30T00:00:00Z",
        dag: {
          levels: [
            { level: 0, label: "Projects", nodes: ["c1"] },
          ],
        },
      },
      blocks: [
        {
          type: "card",
          id: "c1",
          props: {
            title: "OpenCat",
            domain: "ai",
            body: "42 tools",
            metrics: [{ label: "tools", value: "42" }],
          },
        },
      ],
    });
    expect(layout.blocks[0].type).toBe("card");
  });

  it("unknown block type is rejected", () => {
    const invalidLayout = {
      version: 1,
      meta: {
        audience: "default",
        generatedAt: "2026-07-04T00:00:00Z"
      },
      blocks: [
        {
          type: "iframe",
          id: "x",
          props: {}
        }
      ]
    };
    expect(() => LayoutSchema.parse(invalidLayout)).toThrow();
  });

  it("relative href is rejected", () => {
    const invalidHeroLayout = {
      version: 1,
      meta: {
        audience: "default",
        generatedAt: "2026-07-04T00:00:00Z"
      },
      blocks: [
        {
          type: "hero",
          id: "h1",
          props: {
            name: "Andrew (the cat)",
            tagline: "Postgres-first systems, agent infra, OpenCat Tunnel",
            links: [
              {
                label: "invalid-relative",
                href: "/relative"
              }
            ]
          }
        }
      ]
    };
    expect(() => LayoutSchema.parse(invalidHeroLayout)).toThrow();
  });

  it("loadLiveWithStatus falls back to snapshot when VITE_OCT_URL is unset", async () => {
    const result = await loadLiveWithStatus("default");
    const source: LayoutSource = result.source;
    expect(source).toBe("snapshot");
    expect(result.layout).toStrictEqual(loadBaked());
  });
});
