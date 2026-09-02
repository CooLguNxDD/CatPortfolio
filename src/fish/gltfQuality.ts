/**
 * Quality split for LayerLab GLB loads. High tier is the real-3D path;
 * low (coarse pointer / dense small screens) keeps the procedural renderer
 * so mobile does not fetch skinned meshes.
 */

export type GltfQualityTier = "high" | "low"

export function shouldLoadGltfHeroes(tier: GltfQualityTier): boolean {
  return tier === "high"
}

export function shouldLoadGltfScenery(tier: GltfQualityTier): boolean {
  return tier === "high"
}

export function shouldLoadGltfAmbient(tier: GltfQualityTier): boolean {
  return tier === "high"
}
