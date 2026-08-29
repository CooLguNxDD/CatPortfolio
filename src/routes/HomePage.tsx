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
import { fishBus } from "@/fish/fishBus"
import { useFishTankStore } from "@/store"
import {
  prefersReducedMotion,
  probeWebGL2,
  resolveViewMode,
} from "@/routes/viewMode"
import { cn } from "@/lib/utils"
import type { DemoSearch } from "@/router"

export { resolveViewMode } from "@/routes/viewMode"

/** `/` route component: resolves the active layout (live/baked/`?j=` demo) and renders it as the fish tank or the text matrix per `?v=`. See file header. */
export function HomePage() {
  const navigate = useNavigate({ from: "/" })
  const search = useSearch({ from: "/" })
  const { j, v, f, scrollTo } = search
  const { layout, isLoading } = usePageLayout(j)
  const [askOpen, setAskOpen] = useState(false)

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
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:py-8 space-y-8">
      {/* 3D / Flat / Text view router pills */}
      <div className="flex items-center justify-end">
        <div
          className="ft-view-pills"
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

      <main className="min-w-0 w-full space-y-8" data-print-root>
        {scene.fish.length > 0 ? (
          <FishFlatGrid
            fish={scene.fish}
            highlightSlugs={
              layout.meta?.highlightSlugs ?? scene.highlightSlugs
            }
            curationLabel={scene.curationLabel}
            onSelect={(slug) => fishBus.emit("fish:pick", { slug })}
          />
        ) : null}
        {matrix}
      </main>

      {/* Floating Chatbot Dialog / Popup on Bottom-Right */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2.5 print:hidden">
        {askOpen && (
          <aside
            data-ask-panel
            className="w-[calc(100vw-2.5rem)] sm:w-[440px] max-h-[82vh] sm:max-h-[640px] rounded-2xl border border-(--hairline) bg-(--card)/85 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-5 duration-200"
            aria-label="Ask Agent Chatbot"
          >
            <div className="flex items-center justify-between border-b border-(--hairline) px-4 py-3 bg-(--card)/60">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-(--neon) animate-pulse" />
                <span className="text-sm font-semibold font-mono text-(--fg) tracking-tight">
                  Ask Portfolio Agent
                </span>
              </div>
              <button
                type="button"
                className="rounded-full px-2.5 py-1 text-xs font-mono text-(--fg-muted) hover:text-(--fg) hover:bg-(--hairline)/50 transition-colors cursor-pointer"
                onClick={() => setAskOpen(false)}
                aria-label="Close Chatbot"
                title="Close Chatbot (Esc)"
              >
                ✕ Close
              </button>
            </div>
            <div className="p-3 overflow-y-auto max-h-[calc(82vh-3.5rem)] sm:max-h-[580px]">
              <ChatPanel layout={layout} view="text" />
            </div>
          </aside>
        )}

        <button
          type="button"
          onClick={() => setAskOpen((prev) => !prev)}
          className={cn(
            "group flex items-center gap-2.5 rounded-full px-4 py-3 shadow-2xl backdrop-blur-md transition-all duration-200 cursor-pointer",
            "border border-(--amber)/35 bg-(--bg-elevated)/90 hover:bg-(--amber)/20 hover:border-(--amber) text-(--fg)",
            askOpen && "bg-(--amber) text-(--bg) hover:bg-(--amber)/90 font-semibold border-(--amber)",
          )}
          aria-expanded={askOpen}
          aria-label={askOpen ? "Close chat with AI Agent" : "Chat with AI Agent"}
          title={askOpen ? "Close chat (Esc)" : "Ask Portfolio Agent"}
        >
          <span className="text-base leading-none">{askOpen ? "✕" : "💬"}</span>
          <span className="text-xs font-mono font-medium">
            {askOpen ? "Close Agent" : "Ask Agent"}
          </span>
          {!askOpen && (
            <span className="h-2 w-2 rounded-full bg-(--neon) animate-pulse shrink-0" />
          )}
        </button>
      </div>
    </div>
  )
}
