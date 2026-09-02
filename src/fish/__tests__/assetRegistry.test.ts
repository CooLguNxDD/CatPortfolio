import { describe, it, expect, beforeEach, afterEach } from "vitest"
import fishManifest from "../generated/fish-manifest.json" with { type: "json" }
import {
  AssetRegistry,
  assetRegistry,
  registerAllFish,
  ManifestEntrySchema,
  parseManifestEntries,
  kebabAssetId,
  normalizeAssetKey,
  DOMAIN_ASSET_ALIASES,
} from "../assetRegistry"

describe("assetRegistry", () => {
  let registry: AssetRegistry

  beforeEach(() => {
    registry = new AssetRegistry()
  })

  afterEach(() => {
    registry.reset()
  })

  it("resolves portfolio domains to flagships before the manifest is loaded", () => {
    expect(registry.resolve("ai")).toBe("MantaRay")
    expect(registry.resolve("devops")).toBe("GreateWhiteShark")
    expect(registry.resolve("mobile")).toBe("Clownfish")
    expect(registry.resolve("platform")).toBe("GreenTurtle")
    expect(registry.size).toBe(0)
  })

  it("registers a single asset and looks it up by id, kebab, and compact alias", () => {
    const asset = registry.register({
      id: "BlueTang",
      path: "models/fish/BlueTang.glb",
      type: "creature",
      rig: "fish",
      vertices: 10,
      triangles: 4,
      bones: 6,
      sizeBytes: 1000,
    })
    expect(asset.aliases).toContain("blue-tang")
    expect(registry.get("BlueTang")?.path).toBe("models/fish/BlueTang.glb")
    expect(registry.get("blue-tang")?.id).toBe("BlueTang")
    expect(registry.get("bluetang")?.id).toBe("BlueTang")
    expect(registry.pathFor("blue-tang")).toBe("models/fish/BlueTang.glb")
  })

  it("hydrates the convert:fish manifest and indexes creatures vs props", () => {
    const count = registry.registerManifest(fishManifest)
    expect(count).toBeGreaterThan(100)
    expect(registry.size).toBe(count)

    const creatures = registry.list({ type: "creature" })
    const props = registry.list({ type: "prop" })
    expect(creatures.length).toBe(98)
    expect(props.length).toBe(55)
    expect(creatures.length + props.length).toBe(count)

    expect(registry.get("MantaRay")?.path).toBe("models/fish/MantaRay.glb")
    expect(registry.get("CoralAA")?.path).toBe("models/props/CoralAA.glb")
    expect(registry.get("CoralAA")?.type).toBe("prop")
    expect(registry.list({ rig: "ray" }).some((a) => a.id === "MantaRay")).toBe(true)
  })

  it("skips invalid manifest rows instead of throwing", () => {
    const n = registry.registerManifest({
      Good: {
        id: "Good",
        path: "models/fish/Good.glb",
        type: "creature",
        rig: "fish",
        vertices: 1,
        triangles: 1,
        bones: 0,
        sizeBytes: 8,
      },
      Bad: { id: "Bad", path: "/etc/passwd" },
    })
    expect(n).toBe(1)
    expect(registry.has("Good")).toBe(true)
    expect(registry.has("Bad")).toBe(false)
  })

  it("falls back to a constructed path when an id is aliased but not yet in the catalog", () => {
    expect(registry.pathFor("ai", "creature")).toBe("models/fish/MantaRay.glb")
    expect(registry.pathFor("CoralAA", "prop")).toBe("models/props/CoralAA.glb")
  })

  it("accepts extra aliases on top of the manifest", () => {
    registry.registerManifest(fishManifest)
    registry.alias("flagship-ai", "MantaRay")
    expect(registry.resolve("flagship-ai")).toBe("MantaRay")
    expect(registry.get("flagship-ai")?.id).toBe("MantaRay")
  })
})

describe("manifest schema helpers", () => {
  it("parses the on-disk convert:fish manifest", () => {
    const entries = parseManifestEntries(fishManifest)
    expect(entries.length).toBe(153)
    for (const entry of entries) {
      expect(ManifestEntrySchema.safeParse(entry).success).toBe(true)
    }
  })

  it("normalizes keys and kebab-cases Pascal ids", () => {
    expect(normalizeAssetKey("Manta Ray")).toBe("mantaray")
    expect(kebabAssetId("MantaRay")).toBe("manta-ray")
    expect(kebabAssetId("GreateWhiteShark")).toBe("greate-white-shark")
    expect(DOMAIN_ASSET_ALIASES.ai).toBe("MantaRay")
  })
})

describe("bundled singleton", () => {
  it("registers every fish and prop from the convert:fish manifest on import", () => {
    expect(registerAllFish()).toBe(153)
    expect(assetRegistry.size).toBe(153)
    expect(assetRegistry.list({ type: "creature" })).toHaveLength(98)
    expect(assetRegistry.list({ type: "prop" })).toHaveLength(55)

    for (const entry of parseManifestEntries(fishManifest)) {
      expect(assetRegistry.has(entry.id)).toBe(true)
      expect(assetRegistry.pathFor(entry.id)).toBe(entry.path)
    }
  })
})
