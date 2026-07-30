/**
 * Home — static bake, or `?j=<short_id>` demo layout.
 * URL param is baked into the session store; payload loads via TanStack Query.
 */

import { useSearch } from "@tanstack/react-router"
import { loadBaked } from "@/content/loadLayout"
import { LayoutRenderer } from "@/render/LayoutRenderer"
import { useDemoLayoutQuery, useDemoShortId } from "@/hooks/useDemoLayout"

export function HomePage() {
  const { j } = useSearch({ from: "/" })
  const { shortId, isDemoSession } = useDemoShortId(j)
  const { result, isLoading } = useDemoLayoutQuery(shortId)

  const layout =
    isDemoSession && shortId && result.source !== "snapshot"
      ? result.layout
      : j
        ? result.layout
        : loadBaked()

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 py-6 md:py-8 space-y-6">
      {isLoading ? (
        <p className="text-sm font-mono text-(--fg-muted) animate-pulse">
          loading demo layout…
        </p>
      ) : null}
      {/* Theme sticks across Home/Ask — user header pick is not reset here */}
      <LayoutRenderer layout={layout} themeMode="home" />
    </div>
  )
}
// Trigger Vite HMR re-evaluation of baked layout.json
