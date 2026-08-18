/**
 * Demo layout controller — URL `?j=` + session store + TanStack Query.
 *
 * react-app-guide: server payload in Query; session identity in Zustand
 * sessionStorage; `j` is baked into route search params for Home and Ask.
 */

import { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  loadBaked,
  loadJobLayout,
  type LayoutLoadResult,
} from "@/content/loadLayout"
import { useLayoutStore } from "@/store"
import { isValidJobId } from "@/lib/jobId"

/** Defines the TanStack Query key for resolving the demo layout. */
export const demoLayoutQueryKey = (j: string | null | undefined) =>
  ["layout", "demo", j ?? "none"] as const

/**
 * Resolves the active demo short id from URL param first, then temporary store.
 * Seeds the in-memory store when URL carries `j`.
 */
export function useDemoShortId(urlJ: string | undefined): {
  shortId: string | null
  hydrated: boolean
  isDemoSession: boolean
} {
  const storeShortId = useLayoutStore((s) => s.shortId)
  const isDemoSession = useLayoutStore((s) => s.isDemoSession)
  const enterDemo = useLayoutStore((s) => s.enterDemo)

  // Bake URL → temporary store. Invalid ids fall through to the baked
  // snapshot instead of hydrating the store / query key with garbage.
  const trimmedJ = urlJ?.trim()
  const validJ = trimmedJ && isValidJobId(trimmedJ) ? trimmedJ : null

  useEffect(() => {
    if (validJ) enterDemo(validJ)
  }, [validJ, enterDemo])

  const shortId = validJ ?? (isDemoSession ? storeShortId : null)

  return {
    shortId,
    hydrated: true,
    isDemoSession: !!shortId || isDemoSession,
  }
}

/**
 * Loads the bake layout for the active demo short id.
 * Prefers client working layout (Ask expansions) when present for that id.
 */
export function useDemoLayoutQuery(shortId: string | null): {
  result: LayoutLoadResult
  isLoading: boolean
  isFetching: boolean
} {
  const workingLayout = useLayoutStore((s) => s.workingLayout)
  const workingSource = useLayoutStore((s) => s.workingSource)
  const storeShortId = useLayoutStore((s) => s.shortId)
  const audience = useLayoutStore((s) => s.audience)

  const setBakeTheme = useLayoutStore((s) => s.setBakeTheme)

  const query = useQuery({
    queryKey: demoLayoutQueryKey(shortId),
    queryFn: () => loadJobLayout(shortId!),
    enabled: !!shortId,
    retry: false,
    staleTime: 5 * 60_000,
    // Keep expansions: only refetch when shortId changes.
    refetchOnWindowFocus: false,
  })

  // Stamp bake theme from the server layout once it lands (e.g. neon).
  // Derive just the theme so the effect doesn't re-fire on unrelated
  // query.data changes (e.g. a refetch that leaves theme unchanged).
  const serverTheme =
    query.data && query.data.source !== "snapshot"
      ? query.data.layout?.meta?.theme
      : undefined
  useEffect(() => {
    if (serverTheme) setBakeTheme(serverTheme)
  }, [serverTheme, setBakeTheme])

  // Expansion wins over network bake when it belongs to this shortId.
  // A homepage-fallback patch may carry source "snapshot"; that is still
  // the visitor's working copy and must not be discarded.
  if (
    shortId &&
    storeShortId === shortId &&
    workingLayout &&
    workingSource
  ) {
    return {
      result: {
        layout: workingLayout,
        source: workingSource,
        shortId,
        audience: audience ?? undefined,
      },
      isLoading: false,
      isFetching: query.isFetching,
    }
  }

  if (query.data && query.data.source !== "snapshot") {
    return {
      result: query.data,
      isLoading: query.isLoading,
      isFetching: query.isFetching,
    }
  }

  return {
    result: {
      layout: loadBaked(),
      source: "snapshot",
      shortId: shortId ?? undefined,
    },
    isLoading: !!shortId && query.isLoading,
    isFetching: query.isFetching,
  }
}
