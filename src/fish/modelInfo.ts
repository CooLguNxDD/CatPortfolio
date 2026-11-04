/**
 * Pure fish-model catalog lookups: species/domain → model id → catalog info.
 * Deliberately free of `three` so DOM views (FishDossier) can import it
 * without pulling the three chunk into the entry bundle.
 */
import { FISH_CATALOG_METADATA } from "./fishCatalogMetadata"
import { assetRegistry } from "./assetRegistry"

/**
 * Maps a domain ID (ai, devops, mobile, platform) or custom species slug to a concrete model ID.
 * Prefers the manifest-backed `assetRegistry`; catalog metadata fills display-name gaps.
 */
export function resolveModelId(speciesOrDomain: string): string {
  const fromRegistry = assetRegistry.resolve(speciesOrDomain)
  // Domain aliases + heuristics resolve before the manifest fetch.
  if (fromRegistry !== "AchilesTang") return fromRegistry

  const norm = speciesOrDomain.toLowerCase().replace(/[-_\s]/g, "")
  for (const group of Object.values(FISH_CATALOG_METADATA)) {
    for (const model of group.models) {
      const mNorm = model.id.toLowerCase().replace(/[-_\s]/g, "")
      const nameNorm = (model.displayName || model.display_name || "").toLowerCase().replace(/[-_\s]/g, "")
      if (norm === mNorm || norm === nameNorm) {
        return model.id
      }
    }
  }

  return fromRegistry
}

export interface ModelInfo {
  modelId: string
  displayName: string
  groupName: string
  family: string
  rig: string
  vertices: number
  triangles: number
  bones: number
}

/**
 * Returns complete catalog information for a given species or domain.
 */
export function getModelInfo(speciesOrDomain: string): ModelInfo | null {
  const modelId = resolveModelId(speciesOrDomain)
  for (const group of Object.values(FISH_CATALOG_METADATA)) {
    const model = group.models.find((m) => m.id === modelId)
    if (model) {
      return {
        modelId: model.id,
        displayName: model.displayName || model.display_name || model.id,
        groupName: group.name,
        family: group.family,
        rig: group.rig,
        vertices: model.vertices,
        triangles: model.triangles,
        bones: model.bones,
      }
    }
  }
  return null
}
