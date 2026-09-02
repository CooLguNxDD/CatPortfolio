import { describe, it, expect } from "vitest"
import { resolveModelId, rigForModelId } from "../modelLoader"
import { FISH_CATALOG_METADATA } from "../fishCatalogMetadata"

describe("3D Model Loader & Catalog Metadata", () => {
  it("resolves portfolio domains to concrete flagship 3D models", () => {
    expect(resolveModelId("ai")).toBe("MantaRay")
    expect(resolveModelId("devops")).toBe("GreateWhiteShark")
    expect(resolveModelId("mobile")).toBe("Clownfish")
    expect(resolveModelId("platform")).toBe("GreenTurtle")
  })

  it("maps flagship models onto catalog rigs", () => {
    expect(rigForModelId("ai")).toBe("ray")
    expect(rigForModelId("devops")).toBe("shark")
    expect(rigForModelId("mobile")).toBe("fish")
    expect(rigForModelId("platform")).toBe("turtle")
    expect(rigForModelId("zebra-seahorse")).toBe("seahorse")
    expect(rigForModelId("blue-lobster")).toBe("lobster")
  })

  it("resolves direct species slugs and display names", () => {
    expect(resolveModelId("manta-ray")).toBe("MantaRay")
    expect(resolveModelId("achiles-tang")).toBe("AchilesTang")
    expect(resolveModelId("zebra-seahorse")).toBe("ZebraSeahorse")
    expect(resolveModelId("blue-lobster")).toBe("BlueLobster")
    expect(resolveModelId("copperband-butterflyfish")).toBe("CopperbandButterflyfish")
  })

  it("contains all 17 indexed biological and environmental groups", () => {
    const groupKeys = Object.keys(FISH_CATALOG_METADATA)
    expect(groupKeys.length).toBe(17)

    expect(groupKeys).toContain("tangs_surgeonfish")
    expect(groupKeys).toContain("angelfish")
    expect(groupKeys).toContain("butterflyfish")
    expect(groupKeys).toContain("clownfish")
    expect(groupKeys).toContain("damselfish_chromis")
    expect(groupKeys).toContain("gobies_basslets")
    expect(groupKeys).toContain("pelagic_groupers")
    expect(groupKeys).toContain("sharks")
    expect(groupKeys).toContain("rays")
    expect(groupKeys).toContain("seahorses")
    expect(groupKeys).toContain("sea_turtles")
    expect(groupKeys).toContain("dolphins")
    expect(groupKeys).toContain("crustaceans_lobsters")
    expect(groupKeys).toContain("corals_sea_flora")
    expect(groupKeys).toContain("seaweed_kelp")
    expect(groupKeys).toContain("rocks_and_terrain")
    expect(groupKeys).toContain("shells_and_starfish")
  })

  it("contains exactly 153 indexed 3D models", () => {
    let totalModels = 0
    for (const group of Object.values(FISH_CATALOG_METADATA)) {
      totalModels += group.models.length
    }
    expect(totalModels).toBe(153)
  })

  it("ensures all creature models have valid geometry bounds and vertex counts", () => {
    for (const group of Object.values(FISH_CATALOG_METADATA)) {
      for (const model of group.models) {
        expect(model.id).toBeTruthy()
        expect(model.vertices).toBeGreaterThan(0)
        expect(model.triangles).toBeGreaterThan(0)
        expect(model.bounds).toBeDefined()
        expect(model.bounds.width).toBeGreaterThanOrEqual(0)
      }
    }
  })
})
