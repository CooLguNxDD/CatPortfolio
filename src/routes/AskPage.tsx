/**
 * Ask — chat + live layout. When `?j=` (or rehydrated demo session) is active,
 * the same bake is shown and expansions write into the session working layout.
 */

import { useEffect, useMemo } from "react"
import { useNavigate, useSearch } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import {
  loadBaked,
  loadLiveWithStatus,
  type LayoutLoadResult,
} from "@/content/loadLayout"
import { LayoutRenderer } from "@/render/LayoutRenderer"
import { cn } from "@/lib/utils"
import { ChatPanel } from "@/components/chat/ChatPanel"
import { AgentStatusPill } from "@/components/AgentStatusPill"
import { FishTankStage } from "@/components/FishTankStage"
import { FishTankErrorBoundary } from "@/components/FishTankErrorBoundary"
import { fishBus } from "@/fish/fishBus"
import { sceneFromLayout } from "@/fish/sceneFromLayout"
import { useFishTankStore } from "@/store"
import {
  prefersReducedMotion,
  probeWebGL2,
  resolveViewMode,
} from "@/routes/viewMode"
import { useDemoLayoutQuery, useDemoShortId } from "@/hooks/useDemoLayout"
import type { DemoSearch } from "@/router"

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

export function AskPage() {
  const navigate = useNavigate()
  const { j, v, f } = useSearch({ from: "/ask" })
  const { shortId, isDemoSession } = useDemoShortId(j)
  const demo = useDemoLayoutQuery(shortId)

  // Non-demo: default audience live layout (server state via Query).
  const live = useQuery({
    queryKey: ["layout", "default"],
    queryFn: () => loadLiveWithStatus("default"),
    enabled: !shortId,
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    placeholderData: { layout: loadBaked(), source: "snapshot" as const },
  })

  const data: LayoutLoadResult =
    shortId && isDemoSession
      ? demo.result
      : (live.data ?? { layout: loadBaked(), source: "snapshot" as const })

  const isLive = data.source !== "snapshot"
  const isDemo =
    data.source === "bake" ||
    data.layout?.meta?.mode === "showcase" ||
    (!!data.shortId && isDemoSession)

  // Ask now resolves the tank/text view exactly like Home, so a chat turn that
  // focuses a fish has somewhere to land. Text stays the default here (the
  // chat dock is the point of the page); `?v=tank` opts in.
  const scene = useMemo(() => sceneFromLayout(data.layout), [data.layout])
  const caps = useMemo(
    () => ({ webgl2: probeWebGL2(), reducedMotion: prefersReducedMotion() }),
    [],
  )
  const mode = scene.fish.length
    ? resolveViewMode({ v: v ?? "text" }, caps, scene.fish.length)
    : "text"
  const canShowTank = scene.fish.length > 0 && caps.webgl2 && !caps.reducedMotion

  const demoSearch: DemoSearch = {
    ...(j ? { j } : {}),
    ...(v ? { v } : {}),
    ...(f ? { f } : {}),
  }

  // Router owns `?f=`; mirror it into the store so the canvas can subscribe
  // focus without prop drilling (same round trip as HomePage).
  useEffect(() => {
    useFishTankStore.getState().setFocus(f ?? null)
  }, [f])

  useEffect(() => {
    function pick({ slug }: { slug: string }) {
      void navigate({
        to: "/ask",
        search: (prev) => ({ ...((prev || {}) as DemoSearch), f: slug }),
        replace: true,
      })
    }
    function release() {
      void navigate({
        to: "/ask",
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

  const setView = (next: "tank" | "text") =>
    void navigate({
      to: "/ask",
      search: (prev) => ({ ...((prev || {}) as DemoSearch), v: next }),
      replace: true,
    })

  const canvas =
    mode === "tank" ? (
      <FishTankErrorBoundary
        fallback={<LayoutRenderer layout={data.layout} themeMode="ask" />}
      >
        <FishTankStage layout={data.layout} demoSearch={demoSearch} />
      </FishTankErrorBoundary>
    ) : (
      <LayoutRenderer layout={data.layout} themeMode="ask" />
    )

return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:py-8 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="rounded-full border border-(--hairline) px-3 py-1 text-xs font-mono inline-flex items-center gap-2 w-fit">
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
        {canShowTank ? (
          <div
            className="inline-flex rounded-full border border-(--hairline) p-0.5 text-xs font-mono"
            role="group"
            aria-label="Canvas view"
          >
            {(["tank", "text"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={mode === option}
                onClick={() => setView(option)}
                className={cn(
                  "rounded-full px-3 py-0.5 transition-colors",
                  mode === option
                    ? "bg-(--amber)/15 text-(--amber)"
                    : "text-(--fg-muted) hover:text-(--fg)",
                )}
              >
                {option === "tank" ? "3D tank" : "matrix"}
              </button>
            ))}
          </div>
        ) : null}
        <span className="text-[11px] font-mono text-(--fg-subtle)">
          live layout engine · chat patches the blocks it needs
        </span>
      </div>

      {/* Open Design agentic-ask-split: chat dock + live level stack */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)] lg:items-start">
        <aside className="lg:sticky lg:top-16 lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto rounded-[var(--radius-lg)] border border-(--hairline) bg-(--card)/40 p-3">
          <ChatPanel layout={data.layout} view={mode === "tank" ? "tank" : "text"} />
        </aside>
        <div className="min-w-0">{canvas}</div>
      </div>
    </div>
  )
}
