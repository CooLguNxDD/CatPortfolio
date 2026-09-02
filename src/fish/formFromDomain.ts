/**
 * Map portfolio DomainId (schema species) → tank3d procedural mesh form.
 * Visual family only — accent colour still comes from DomainId tokens.
 */

import type { DomainIdType } from "@/content/schema"

/** Procedural mesh families from Open Design tank3d.html `buildFish`. */
export type FishForm =
  | "grouper"
  | "tuna"
  | "shark"
  | "manta"
  | "ray"
  | "eel"
  | "pufferfish"
  | "crab"
  | "lobster"
  | "turtle"
  | "seahorse"
  | "dolphin"
  | "jellyfish"
  | "anglerfish"
  | "angelfish"
  | "clownfish"
  | "tetra"
  | "sardine"

/** Default WelTel / portfolio domain → silhouette mapping. */
export const DOMAIN_FORM: Record<DomainIdType, FishForm> = {
  ai: "manta",
  devops: "shark",
  mobile: "clownfish",
  platform: "turtle",
}

const FORM_SET = new Set<string>([
  "grouper",
  "tuna",
  "shark",
  "manta",
  "ray",
  "eel",
  "pufferfish",
  "crab",
  "lobster",
  "turtle",
  "seahorse",
  "dolphin",
  "jellyfish",
  "anglerfish",
  "angelfish",
  "clownfish",
  "tetra",
  "sardine",
])

/** Resolve mesh form: explicit form field, known species name, else domain map. */
export function resolveFishForm(
  species: string,
  form?: string | null,
): FishForm {
  if (form && FORM_SET.has(form)) return form as FishForm
  if (FORM_SET.has(species)) return species as FishForm
  if (species in DOMAIN_FORM) return DOMAIN_FORM[species as DomainIdType]
  return "angelfish"
}
