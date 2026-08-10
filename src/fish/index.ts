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
