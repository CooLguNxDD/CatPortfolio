/**
 * Fish tank models — pure helpers (no React / three).
 * Views import from components/; canvas imports speciesMeshes.
 */

export {
  sceneFromLayout,
  findFishBySlug,
  fishIndexOf,
  type FishSceneConfig,
} from "./sceneFromLayout"
export {
  matchesFish,
  filterFish,
  fishLitFactor,
  domainsInSchool,
  normalizeQuery,
  type FishFilter,
} from "./matchFish"
export { resolveFishForm, DOMAIN_FORM, type FishForm } from "./formFromDomain"
export {
  assetRegistry,
  registerAsset,
  registerAssetAlias,
  registerManifest,
  registerAllFish,
  ensureAssetManifest,
  DOMAIN_ASSET_ALIASES,
  type ManifestEntry,
  type RegisteredAsset,
  type AssetKind,
} from "./assetRegistry"
