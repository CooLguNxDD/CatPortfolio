/**
 * Home — static bake, or `?j=<short_id>` demo layout.
 * Default view is the fish tank when capable; `?v=text` forces the layout.
 */

import { useCallback, useMemo } from "react"
import { useNavigate, useSearch } from "@tanstack/react-router"
import { loadBaked } from "@/content/loadLayout"
import { LayoutRenderer } from "@/render/LayoutRenderer"
import { useDemoLayoutQuery, useDemoShortId } from "@/hooks/useDemoLayout"
import { sceneFromLayout } from "@/fish/sceneFromLayout"
import { FishTankStage } from "@/components/FishTankStage"
import { FishTankErrorBoundary } from "@/components/FishTankErrorBoundary"
import {
  prefersReducedMotion,
  probeWebGL2,
  resolveViewMode,
} from "@/routes/viewMode"
import { cn } from "@/lib/utils"
import type { DemoSearch } from "@/router"

export { resolveViewMode } from "@/routes/viewMode"

export function HomePage() {
  const navigate = useNavigate()
  const search = useSearch({ from: "/" })
  const { j, v, f } = search
  const { shortId, isDemoSession } = useDemoShortId(j)
  const { result, isLoading } = useDemoLayoutQuery(shortId)

  const layout =
    isDemoSession && shortId && result.source !== "snapshot"
      ? result.layout
      : j
        ? result.layout
        : loadBaked()

  const scene = useMemo(() => sceneFromLayout(layout), [layout])
  const caps = useMemo(
    () => ({
      webgl2: probeWebGL2(),
      reducedMotion: prefersReducedMotion(),
    }),
    [],
  )
  const mode = resolveViewMode({ v }, caps, scene.fish.length)

  const demoSearch: DemoSearch = {
    ...(j ? { j } : {}),
    ...(v ? { v } : {}),
    ...(f ? { f } : {}),
  }

  const onFocusChange = useCallback(
    (slug: string | null) => {
      void navigate({
        to: "/",
        search: (prev) => {
          const p = (prev || {}) as DemoSearch
          if (!slug) {
            const next = { ...p }
            delete next.f
            return next
          }
          return { ...p, f: slug }
        },
        replace: true,
      })
    },
    [navigate],
  )

  const hasDag = Boolean(layout?.meta?.dag?.levels?.length)
  const usesSpanGrid =
    !hasDag &&
    Boolean(
      layout?.blocks?.some(
        (b) => b.layout && (b.layout.span != null || b.layout.order != null),
      ),
    )

  const textShell = (
    <div
      className={cn(
        "w-full",
        hasDag && "layout-shell layout-shell--matrix pt-4 md:pt-6",
        usesSpanGrid &&
          "layout-shell layout-shell--grid mx-auto max-w-[1180px] px-4 py-6 md:py-8",
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
      {mode === "text" && scene.fish.length > 0 ? (
        <div className="mb-4 flex justify-end px-4 md:px-0">
          <button
            type="button"
            className="rounded-full border border-(--hairline) bg-(--card) px-3 py-1 text-xs font-mono text-(--fg-muted) hover:text-(--fg)"
            onClick={() =>
              void navigate({
                to: "/",
                search: (prev) => {
                  const p = { ...((prev || {}) as DemoSearch) }
                  delete p.v
                  return p
                },
                replace: true,
              })
            }
          >
            View as tank
          </button>
        </div>
      ) : null}
      <LayoutRenderer layout={layout} themeMode="home" />
    </div>
  )

  if (mode === "tank") {
    return (
      <FishTankErrorBoundary fallback={textShell}>
        {isLoading ? (
          <p className="p-6 text-sm font-mono text-(--fg-muted) animate-pulse">
            loading demo layout…
          </p>
        ) : null}
        <FishTankStage
          layout={layout}
          focusedSlug={f ?? null}
          onFocusChange={onFocusChange}
          demoSearch={demoSearch}
        />
      </FishTankErrorBoundary>
    )
  }

  return textShell
}
