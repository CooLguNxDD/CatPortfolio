/**
 * Pure helpers for demo URL search params.
 * Extracted so App.tsx navigate merges never drop unknown keys (v/f).
 */

import type { DemoSearch } from "@/router"

/** Merge a demo short id into prior search, preserving unrelated keys. */
export function mergeDemoSearch(
  prev: DemoSearch | undefined | null,
  shortId: string,
): DemoSearch {
  const base = prev && typeof prev === "object" ? { ...prev } : {}
  return { ...base, j: shortId }
}

/** Clear demo short id while preserving view/focus params. */
export function clearDemoSearch(prev: DemoSearch | undefined | null): DemoSearch {
  const next: DemoSearch = {}
  if (prev?.v) next.v = prev.v
  if (prev?.f) next.f = prev.f
  if (prev?.scrollTo) next.scrollTo = prev.scrollTo
  return next
}
