/**
 * Push a layout into TanStack Query cache + the demo session working layout.
 *
 * Extracted from ChatPanel so the dual-write path is unit-testable.
 * Server bake stays under demoLayoutQueryKey(shortId); default key for non-demo.
 */

import type { QueryClient } from "@tanstack/react-query"
import type { LayoutLoadResult } from "@/content/loadLayout"
import { loadBaked } from "@/content/loadLayout"
import type { Block, Layout } from "@/content/schema"
import { demoLayoutQueryKey } from "@/hooks/useDemoLayout"
import { useLayoutStore } from "@/store"

/**
 * Apply a live/bake layout result to Query cache and the layout demo session.
 * Ignores snapshot fallbacks. When shortId changes, enterDemo follows the fork.
 */
export function applyLayoutToCache(
  queryClient: QueryClient,
  result: LayoutLoadResult,
): void {
  if (result.source === "snapshot") return
  const shortId =
    result.shortId || useLayoutStore.getState().shortId || undefined
  const next: LayoutLoadResult = shortId ? { ...result, shortId } : result
  if (shortId) {
    useLayoutStore.getState().enterDemo(shortId)
    useLayoutStore.getState().setWorkingLayout(next)
    queryClient.setQueryData(demoLayoutQueryKey(shortId), next)
  } else {
    queryClient.setQueryData(["layout", "default"], next)
  }
}

/** One ask-mode overlay: whole-block replacements plus recomputed chrome. */
export interface BlockPatch {
  blocks: Block[]
  patchedIds?: string[]
  dag?: Layout["meta"]["dag"] | null
  highlightSlugs?: string[]
}

/**
 * Merge patch blocks into a layout by block id.
 *
 * Existing ids are replaced in place so untouched blocks keep their position
 * (and, for the tank, their specimen identity). Unknown ids land before a
 * trailing quickActions — the same rule as the server's `insert_before_cta`,
 * so a block's neighbours don't depend on which side computed the merge.
 */
export function mergeBlockPatch(base: Layout, patch: BlockPatch): Layout {
  const byId = new Map(
    patch.blocks.filter((b) => b.id).map((b) => [b.id, b] as const),
  )
  const applied = new Set<string>()
  const merged: Block[] = base.blocks.map((block) => {
    const next = block.id ? byId.get(block.id) : undefined
    if (!next) return block
    applied.add(block.id)
    return next
  })

  const appended = patch.blocks.filter((b) => b.id && !applied.has(b.id))
  if (appended.length) {
    const ctaIndex = merged.findIndex((b) => b.type === "quickActions")
    if (ctaIndex === -1) merged.push(...appended)
    else merged.splice(ctaIndex, 0, ...appended)
  }

  const patchedIds = patch.patchedIds?.length
    ? patch.patchedIds
    : patch.blocks.map((b) => b.id).filter(Boolean)

  return {
    ...base,
    blocks: merged,
    meta: {
      ...base.meta,
      ...(patch.dag ? { dag: patch.dag } : {}),
      ...(patch.highlightSlugs ? { highlightSlugs: patch.highlightSlugs } : {}),
      patchedBlockIds: patchedIds,
    },
  }
}

/**
 * Apply an ask-mode block patch to the layout currently on screen.
 *
 * Ephemeral by design: this writes the working layout and the Query cache and
 * nothing else. No short_id is minted and no bake is mutated, so a reload
 * returns the visitor to the layout they were served.
 * Falls back to the baked snapshot when nothing is on screen yet.
 */
export function applyBlockPatch(
  queryClient: QueryClient,
  patch: BlockPatch,
): boolean {
  if (!patch.blocks?.length) return false

  const store = useLayoutStore.getState()
  const shortId = store.shortId || undefined
  const key = shortId ? demoLayoutQueryKey(shortId) : ["layout", "default"]
  // The store holds a bare Layout; the cache holds a LayoutLoadResult. Prefer
  // the store — it already carries any earlier patch from this session.
  const cached = queryClient.getQueryData<LayoutLoadResult>(key)
  // Homepage never seeds the cache; fall back to the committed snapshot so
  // a patch always has a base, on any route, at any load stage.
  const base = store.workingLayout ?? cached?.layout ?? loadBaked()
  const source = cached?.source ?? store.workingSource ?? "snapshot"

  const next: LayoutLoadResult = {
    ...(cached ?? { source }),
    ...(shortId ? { shortId } : {}),
    layout: mergeBlockPatch(base, patch),
  }
  store.setPatchedLayout(next.layout, next.source)
  queryClient.setQueryData(key, next)
  return true
}
