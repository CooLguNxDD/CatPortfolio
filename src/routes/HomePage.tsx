/**
 * Home — static bake, or `?j=<short_id>` demo layout.
 * URL param is baked into the session store; payload loads via TanStack Query.
 *
 * Main shell is layout-driven:
 * - meta.dag → matrix page frame (width/bands owned by LayoutRenderer)
 * - layout.span/order → fluid 12-col GenUI frame
 * - else → classic stacked max-width column
 */

import { useSearch } from "@tanstack/react-router"
import { loadBaked } from "@/content/loadLayout"
import { LayoutRenderer } from "@/render/LayoutRenderer"
import { useDemoLayoutQuery, useDemoShortId } from "@/hooks/useDemoLayout"
import { cn } from "@/lib/utils"

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

  const hasDag = Boolean(layout?.meta?.dag?.levels?.length)
  const usesSpanGrid =
    !hasDag &&
    Boolean(
      layout?.blocks?.some(
        (b) => b.layout && (b.layout.span != null || b.layout.order != null),
      ),
    )

  return (
    <div
      className={cn(
        "w-full",
        // Matrix / level-row GenUI — side inset via .matrix-page (10%); no fixed px gutters
        hasDag && "layout-shell layout-shell--matrix pt-4 md:pt-6",
        // Span-grid GenUI (no dag)
        usesSpanGrid &&
          "layout-shell layout-shell--grid mx-auto max-w-[1180px] px-4 py-6 md:py-8",
        // Classic stack
        !hasDag &&
          !usesSpanGrid &&
          "layout-shell layout-shell--stack mx-auto max-w-[1180px] px-4 py-6 md:py-8 space-y-6",
      )}
      data-layout-mode={hasDag ? "matrix" : usesSpanGrid ? "grid" : "stack"}
    >
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
