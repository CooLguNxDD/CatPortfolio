import { describe, it, expect } from "vitest";
import { LayoutSchema } from "../schema";
import type { Layout } from "../schema";
import { loadBaked, loadLiveWithStatus } from "../loadLayout";
import type { LayoutSource } from "../loadLayout";

describe("Content layer tests", () => {
  it("baked fixture parses", () => {
    const layout: Layout = loadBaked();
    expect(layout.version).toBe(1);
    expect(layout.blocks).toHaveLength(7);

    const types = layout.blocks.map(b => b.type);
    expect(types).toContain("hero");
    expect(types).toContain("statStrip");
    expect(types).toContain("projectGrid");
    expect(types).toContain("starStory");
    expect(types).toContain("archDiagram");
    expect(types).toContain("codeSnippet");
    expect(types).toContain("prose");
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
