/**
 * Push a layout into TanStack Query cache + the demo session working layout.
 *
 * Extracted from ChatPanel so the dual-write path is unit-testable.
 * Server bake stays under demoLayoutQueryKey(shortId); default key for non-demo.
 */

import type { QueryClient } from "@tanstack/react-query"
import type { LayoutLoadResult } from "@/content/loadLayout"
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
