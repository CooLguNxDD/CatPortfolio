/**
 * Home — static bake, or `?j=<short_id>` demo layout.
 * Default view is the fish tank when capable; `?v=text` forces the layout.
 */

import { useEffect, useMemo } from "react"
import { useNavigate, useSearch } from "@tanstack/react-router"
import { loadBaked } from "@/content/loadLayout"
import { LayoutRenderer } from "@/render/LayoutRenderer"
import { useDemoLayoutQuery, useDemoShortId } from "@/hooks/useDemoLayout"
import { sceneFromLayout } from "@/fish/sceneFromLayout"
import { FishTankStage } from "@/components/FishTankStage"
import { FishTankErrorBoundary } from "@/components/FishTankErrorBoundary"
import { fishBus } from "@/fish/fishBus"
import { useFishTankStore, useLayoutStore } from "@/store"
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
  const workingLayout = useLayoutStore((s) => s.workingLayout)

  const layout =
    workingLayout ??
    (isDemoSession && shortId && result.source !== "snapshot"
      ? result.layout
      : j
        ? result.layout
        : loadBaked())

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

  // Router owns `?f=` (see fish/fishBus.ts header). Sync URL → store so the
  // canvas can subscribe focus without prop drilling, and subscribe the
  // canvas's pick/release intent → URL, matching the pre-refactor round trip
  // (focusFish callback → navigate → new focusedSlug prop → canvas), just
  // through the bus instead of props.
  useEffect(() => {
    useFishTankStore.getState().setFocus(f ?? null)
  }, [f])

  useEffect(() => {
    function pick({ slug }: { slug: string }) {
      void navigate({
        to: "/",
        search: (prev) => ({ ...((prev || {}) as DemoSearch), f: slug }),
        replace: true,
      })
    }
    function release() {
      void navigate({
        to: "/",
        search: (prev) => {
          const next = { ...((prev || {}) as DemoSearch) }
          delete next.f
          return next
        },
        replace: true,
      })
    }
    fishBus.on("fish:pick", pick)
    fishBus.on("fish:release", release)
    return () => {
      fishBus.off("fish:pick", pick)
      fishBus.off("fish:release", release)
    }
  }, [navigate])

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
        <FishTankStage layout={layout} demoSearch={demoSearch} />
      </FishTankErrorBoundary>
    )
  }

  return textShell
}
