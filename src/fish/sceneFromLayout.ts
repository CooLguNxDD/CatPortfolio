/**
 * Pure model helpers: derive tank scene config from a GenUI layout.
 * Views never walk layout.blocks for fishTank props themselves.
 */

import { fishFromLayout } from "@/blocks/fishFromLayout"
import type { FishSpecimenInput } from "@/blocks/fishTankLayout"
import type { Layout } from "@/content/schema"

/** Scene chrome derived from an authored or adapted fishTank block. */
export interface FishSceneConfig {
  fish: FishSpecimenInput[]
  title?: string
  caption?: string
  tankTheme?: string
  cameraFocus?: string | null
  highlightSlugs: string[]
  curationLabel?: string
  /** True when layout has an explicit fishTank block with specimens. */
  hasAuthoredTank: boolean
}

function fishTankBlock(layout: Layout | null | undefined) {
  if (!layout?.blocks?.length) return null
  for (const b of layout.blocks) {
    if (b.type === "fishTank") return b
  }
  return null
}

/** Extract aquarium scene config from layout (authored block or card adapter). */
export function sceneFromLayout(layout: Layout | null | undefined): FishSceneConfig {
  const block = fishTankBlock(layout)
  const fish = fishFromLayout(layout)
  const props = block?.props

  return {
    fish,
    title: typeof props?.title === "string" ? props.title : undefined,
    caption: typeof props?.caption === "string" ? props.caption : undefined,
    tankTheme: typeof props?.tankTheme === "string" ? props.tankTheme : undefined,
    cameraFocus:
      typeof props?.cameraFocus === "string" && props.cameraFocus.trim()
        ? props.cameraFocus.trim()
        : null,
    highlightSlugs: Array.isArray(props?.highlightSlugs)
      ? props.highlightSlugs.filter((s): s is string => typeof s === "string")
      : [],
    curationLabel:
      typeof props?.curationLabel === "string" ? props.curationLabel : undefined,
    hasAuthoredTank: Boolean(block),
  }
}

/** Look up one specimen by slug (focus / dossier). */
export function findFishBySlug(
  fish: FishSpecimenInput[],
  slug: string | null | undefined,
): FishSpecimenInput | null {
  if (!slug) return null
  const key = slug.toLowerCase()
  return fish.find((f) => f.slug.toLowerCase() === key) ?? null
}

/** Specimen index 1-based for dossier readout. */
export function fishIndexOf(
  fish: FishSpecimenInput[],
  slug: string | null | undefined,
): number {
  if (!slug) return 0
  const key = slug.toLowerCase()
  const i = fish.findIndex((f) => f.slug.toLowerCase() === key)
  return i >= 0 ? i + 1 : 0
}
