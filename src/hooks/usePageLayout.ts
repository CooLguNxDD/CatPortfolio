/**
 * The layout currently on screen — demo bake, live default, or a patch.
 *
 * Home (tank + text) share this hook so an ask overlay written into
 * `workingLayout` is visible after switching `?v=` without a remount race.
 */

import {
  loadBaked,
  type LayoutLoadResult,
  type LayoutSource,
} from "@/content/loadLayout"
import type { Layout } from "@/content/schema"
import {
  loadProfilePieces,
  mergeProfilePieces,
  type ProfilePiece,
} from "@/content/profilePieces"
import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useLayoutStore } from "@/store"
import { useDemoLayoutQuery, useDemoShortId } from "@/hooks/useDemoLayout"

/** Inputs for the pure page-layout resolver (unit-testable, no Query). */
export interface ResolvePageLayoutInput {
  shortId: string | null
  isDemoSession: boolean
  demoResult: LayoutLoadResult | null
  liveResult?: LayoutLoadResult | null
  workingLayout: Layout | null
  workingSource: LayoutSource | null
  workingShortId: string | null
}

/**
 * Prefer demo bake, then a non-demo patch, then live/baked.
 * A working copy stamped with a different shortId is ignored.
 */
export function resolvePageLayout(
  input: ResolvePageLayoutInput,
): LayoutLoadResult {
  const {
    shortId,
    demoResult,
    liveResult,
    workingLayout,
    workingSource,
    workingShortId,
  } = input

  if (shortId) {
    if (workingLayout && workingShortId === shortId) {
      return {
        layout: workingLayout,
        source: workingSource ?? demoResult?.source ?? "bake",
        shortId,
        audience: demoResult?.audience,
      }
    }
    if (demoResult) return demoResult
    return { layout: loadBaked(), source: "snapshot", shortId }
  }

  // Patch from a leftover demo session must not paint the public homepage.
  if (workingLayout && !workingShortId) {
    return {
      layout: workingLayout,
      source: workingSource ?? "live",
    }
  }

  return liveResult ?? { layout: loadBaked(), source: "snapshot" }
}

const NO_PIECES: ProfilePiece[] = []

/**
 * Runtime profile pieces (`public/profile-pieces/`), fetched once per
 * session. Fail-soft: the loader resolves `[]` on any error.
 */
function useProfilePieces(): ProfilePiece[] {
  const query = useQuery({
    queryKey: ["profile-pieces"],
    queryFn: () => loadProfilePieces(),
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  })
  return query.data ?? NO_PIECES
}

/**
 * Resolve the layout for `/` (both view modes) from URL `j`, Query, and store.
 * Profile pieces are merged on top of whichever layout wins.
 */
export function usePageLayout(urlJ: string | undefined): {
  data: LayoutLoadResult
  layout: Layout
  isLoading: boolean
  shortId: string | null
  isDemoSession: boolean
} {
  const { shortId, isDemoSession } = useDemoShortId(urlJ)
  const demo = useDemoLayoutQuery(shortId)
  const workingLayout = useLayoutStore((s) => s.workingLayout)
  const workingSource = useLayoutStore((s) => s.workingSource)
  const workingShortId = useLayoutStore((s) => s.shortId)

  const pieces = useProfilePieces()

  const resolved = resolvePageLayout({
    shortId,
    isDemoSession,
    demoResult: shortId ? demo.result : null,
    liveResult: null,
    workingLayout,
    workingSource,
    workingShortId,
  })
  const merged = useMemo(
    () => mergeProfilePieces(resolved.layout, pieces),
    [resolved.layout, pieces],
  )
  const data =
    merged === resolved.layout ? resolved : { ...resolved, layout: merged }

  return {
    data,
    layout: data.layout,
    isLoading: shortId ? demo.isLoading : false,
    shortId,
    isDemoSession,
  }
}
