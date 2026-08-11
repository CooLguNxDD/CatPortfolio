import { describe, expect, it } from "vitest"
import { findFishBySlug, fishIndexOf, sceneFromLayout } from "../sceneFromLayout"
import type { Layout } from "@/content/schema"

const layout = {
  version: 1,
  meta: {},
  blocks: [
    {
      type: "fishTank",
      id: "fish-tank-1",
      props: {
        renderer: "webgl",
        title: "WelTel tank",
        curationLabel: "From secrets_projects",
        highlightSlugs: ["weltel-ai"],
        fish: [
          {
            slug: "weltel-ai",
            title: "AI",
            species: "ai",
            size: 1,
            depth: 0.1,
            speed: 0.5,
            glow: 1,
            school: 0,
            tags: [],
            metrics: [],
          },
          {
            slug: "weltel-devops",
            title: "DevOps",
            species: "devops",
            size: 0.9,
            depth: 0.2,
            speed: 0.4,
            glow: 0.9,
            school: 0,
            tags: [],
            metrics: [],
          },
        ],
      },
    },
  ],
} as unknown as Layout

describe("sceneFromLayout", () => {
  it("extracts authored tank scene without views walking blocks", () => {
    const scene = sceneFromLayout(layout)
    expect(scene.hasAuthoredTank).toBe(true)
    expect(scene.fish).toHaveLength(2)
    expect(scene.highlightSlugs).toEqual(["weltel-ai"])
    expect(scene.curationLabel).toBe("From secrets_projects")
    expect(scene.title).toBe("WelTel tank")
  })

  it("finds specimens by slug", () => {
    const scene = sceneFromLayout(layout)
    expect(findFishBySlug(scene.fish, "weltel-ai")?.title).toBe("AI")
    expect(fishIndexOf(scene.fish, "weltel-devops")).toBe(2)
    expect(findFishBySlug(scene.fish, null)).toBeNull()
  })
})
