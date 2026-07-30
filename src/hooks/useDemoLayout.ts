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

  // Bake URL → temporary store.
  useEffect(() => {
    if (urlJ?.trim()) enterDemo(urlJ.trim())
  }, [urlJ, enterDemo])

  const shortId =
    (urlJ?.trim() || null) ?? (isDemoSession ? storeShortId : null)

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
  useEffect(() => {
    if (!query.data || query.data.source === "snapshot") return
    const t = query.data.layout?.meta?.theme
    if (t) setBakeTheme(t)
  }, [query.data, setBakeTheme])

  // Expansion wins over network bake when it belongs to this shortId.
  if (
    shortId &&
    storeShortId === shortId &&
    workingLayout &&
    workingSource &&
    workingSource !== "snapshot"
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
