/**
 * Home — live/baked layout, or `?j=<short_id>` demo.
 * Default view is the fish tank when capable; `?v=text` is the matrix + chat
 * column. Tank chrome opens the same ChatPanel as a dock.
 */

import { useEffect, useMemo, useState } from "react"
import { useNavigate, useSearch } from "@tanstack/react-router"
import { LayoutRenderer } from "@/render/LayoutRenderer"
import { usePageLayout } from "@/hooks/usePageLayout"
import { sceneFromLayout } from "@/fish/sceneFromLayout"
import { FishTankStage } from "@/components/FishTankStage"
import { FishTankErrorBoundary } from "@/components/FishTankErrorBoundary"
import { FishFlatGrid } from "@/components/fish/FishFlatGrid"
import { ChatPanel } from "@/components/chat/ChatPanel"
import { AgentStatusPill } from "@/components/AgentStatusPill"
import { fishBus } from "@/fish/fishBus"
import { useFishTankStore } from "@/store"
import {
  prefersReducedMotion,
  probeWebGL2,
  resolveViewMode,
} from "@/routes/viewMode"
import { cn } from "@/lib/utils"
import type { LayoutLoadResult } from "@/content/loadLayout"
import type { DemoSearch } from "@/router"

export { resolveViewMode } from "@/routes/viewMode"

function sourceLabel(data: LayoutLoadResult): string {
  const mode = data.layout?.meta?.mode
  if (mode === "scoped") return "live · scoped GenUI"
  if (mode === "template") return "live · template"
  if (mode === "showcase") {
    return data.shortId ? `demo · j=${data.shortId}` : "demo · showcase"
  }
  switch (data.source) {
    case "fragments":
      return data.fragments?.length
        ? `live · fragments (${data.fragments.length})`
        : "live · fragments"
    case "bake":
      return data.shortId ? `bake · j=${data.shortId}` : "bake"
    case "live":
      return mode ? `live · ${mode}` : "live"
    default:
      return `snapshot · ${data.layout.meta.generatedAt}`
  }
}

/** `/` route component: resolves the active layout (live/baked/`?j=` demo) and renders it as the fish tank or the text matrix per `?v=`. See file header. */
export function HomePage() {
  const navigate = useNavigate({ from: "/" })
  const search = useSearch({ from: "/" })
  const { j, v, f, scrollTo } = search
  const { data, layout, isLoading, shortId, isDemoSession } = usePageLayout(j)
  const [askOpen, setAskOpen] = useState(false)

  const isLive = data.source !== "snapshot"
  const isDemo =
    data.source === "bake" ||
    data.layout?.meta?.mode === "showcase" ||
    (!!data.shortId && isDemoSession)

  const scene = useMemo(() => sceneFromLayout(layout), [layout])
  const caps = useMemo(
    () => ({
      webgl2: probeWebGL2(),
      reducedMotion: prefersReducedMotion(),
    }),
    [],
  )
  const mode = resolveViewMode({ v }, caps, scene.fish.length, scene.hasAuthoredTank)

  const demoSearch: DemoSearch = {
    ...(j ? { j } : {}),
    ...(v ? { v } : {}),
    ...(f ? { f } : {}),
  }

  useEffect(() => {
    useFishTankStore.getState().setFocus(f ?? null)
  }, [f])

  useEffect(() => {
    function pick({ slug }: { slug: string }) {
      void navigate({
        to: "/",
        search: (prev) => ({ ...(prev || {}), f: slug }),
        replace: true,
      })
    }
    function release() {
      void navigate({
        to: "/",
        search: (prev) => {
          const next = { ...(prev || {}) }
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

  useEffect(() => {
    const onAskOpen = () => setAskOpen(true)
    const onAskClose = () => setAskOpen(false)
    fishBus.on("ask:open", onAskOpen)
    fishBus.on("ask:close", onAskClose)
    return () => {
      fishBus.off("ask:open", onAskOpen)
      fishBus.off("ask:close", onAskClose)
    }
  }, [])

  useEffect(() => {
    if (!askOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAskOpen(false)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [askOpen])

  // Chat view-actions encode the block id in `?scrollTo=`; wait until the
  // matrix has actually mounted `[data-block-id]` before scrolling, then
  // drop the param so this doesn't re-fire.
  useEffect(() => {
    if (!scrollTo || mode !== "text") return
    const inLayout = Boolean(layout?.blocks?.some((b) => b.id === scrollTo))
    if (!inLayout) return

    let cancelled = false
    let raf = 0
    let attempts = 0
    const maxAttempts = 60

    const clearScrollTo = () => {
      void navigate({
        to: "/",
        search: (prev) => {
          const next = { ...(prev || {}) }
          delete next.scrollTo
          return next
        },
        replace: true,
        resetScroll: false,
      })
    }

    const tryScroll = () => {
      if (cancelled) return
      const el = document.querySelector(`[data-block-id="${CSS.escape(scrollTo)}"]`)
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" })
        clearScrollTo()
        return
      }
      attempts += 1
      if (attempts < maxAttempts) {
        raf = requestAnimationFrame(tryScroll)
      } else {
        clearScrollTo()
      }
    }

    raf = requestAnimationFrame(tryScroll)
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
    }
  }, [scrollTo, mode, navigate, layout])

  const setView = (next: "tank" | "text") =>
    void navigate({
      to: "/",
      search: (prev) => ({ ...(prev || {}), v: next }),
      replace: true,
    })

  const hasDag = Boolean(layout?.meta?.dag?.levels?.length)
  const usesSpanGrid =
    !hasDag &&
    Boolean(
      layout?.blocks?.some(
        (b) => b.layout && (b.layout.span != null || b.layout.order != null),
      ),
    )

  const matrix = (
    <div
      className={cn(
        "w-full min-w-0",
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
      <LayoutRenderer layout={layout} themeMode="ask" />
    </div>
  )

  if (mode === "tank") {
    return (
      <FishTankErrorBoundary fallback={matrix}>
        {isLoading ? (
          <p className="p-6 text-sm font-mono text-(--fg-muted) animate-pulse">
            loading demo layout…
          </p>
        ) : null}
        <FishTankStage layout={layout} demoSearch={demoSearch} />
      </FishTankErrorBoundary>
    )
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:py-8 space-y-6">
      {/* Top bar with status pills and 3D / Flat / Text view router pills */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="rounded-full border border-(--hairline) px-3 py-1 text-xs font-mono inline-flex items-center gap-2 w-fit"
            title={
              data.source === "snapshot"
                ? "Using cached layout snapshot (live layout unreachable)"
                : undefined
            }
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                data.source === "fragments"
                  ? "bg-(--neon)"
                  : isDemo || data.source === "bake"
                    ? "bg-(--amber)"
                    : isLive
                      ? "bg-(--neon)"
                      : "bg-(--amber)",
              )}
            />
            <span>{sourceLabel(data)}</span>
          </div>
          {data.audience ? (
            <div className="rounded-full border border-(--hairline) px-3 py-1 text-xs font-mono text-(--fg-muted)">
              audience · {data.audience}
            </div>
          ) : null}
          {shortId ? (
            <div className="rounded-full border border-(--amber)/30 px-3 py-1 text-xs font-mono text-(--amber)">
              j={shortId}
            </div>
          ) : null}
          <AgentStatusPill />
          <span className="text-[11px] font-mono text-(--fg-subtle) hidden sm:inline">
            live layout engine · chat patches the blocks it needs
          </span>
        </div>

        <div
          className="ft-view-pills shrink-0"
          role="group"
          aria-label="Tank view"
        >
          <button
            type="button"
            className="ft-chip-btn"
            onClick={() => {
              useFishTankStore.getState().setChrome("3d")
              setView("tank")
            }}
          >
            3D
          </button>
          <button
            type="button"
            className="ft-chip-btn"
            onClick={() => {
              useFishTankStore.getState().setChrome("flat")
              setView("tank")
            }}
          >
            Flat
          </button>
          <button
            type="button"
            className="ft-chip-btn is-on"
            aria-pressed="true"
          >
            Text
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)] lg:items-start">
        {scene.fish.length > 0 ? (
          <div className="order-1 min-w-0 lg:col-start-2">
            <FishFlatGrid
              fish={scene.fish}
              highlightSlugs={
                layout.meta?.highlightSlugs ?? scene.highlightSlugs
              }
              curationLabel={
                layout.meta?.tailored || j ? scene.curationLabel : undefined
              }
              onSelect={(slug) => fishBus.emit("fish:pick", { slug })}
            />
          </div>
        ) : null}
        <aside
          data-ask-panel
          className="order-2 rounded-[var(--radius-lg)] border border-(--hairline) bg-(--card)/40 p-3 lg:col-start-1 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-16"
        >
          <ChatPanel layout={layout} view="text" />
        </aside>
        <div className="order-3 min-w-0 space-y-6 lg:col-start-2" data-print-root>
          {matrix}
        </div>
      </div>
    </div>
  )
}
