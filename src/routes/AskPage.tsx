/**
 * Ask — chat + live layout. When `?j=` (or rehydrated demo session) is active,
 * the same bake is shown and expansions write into the session working layout.
 */

import { useSearch } from "@tanstack/react-router"
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
import { useDemoLayoutQuery, useDemoShortId } from "@/hooks/useDemoLayout"

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
  const { j } = useSearch({ from: "/ask" })
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
        <span className="text-[11px] font-mono text-(--fg-subtle)">
          live layout engine · chat rewrites the canvas
        </span>
      </div>

      {/* Open Design agentic-ask-split: chat dock + live level stack */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)] lg:items-start">
        <aside className="lg:sticky lg:top-16 lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto rounded-[var(--radius-lg)] border border-(--hairline) bg-(--card)/40 p-3">
          <ChatPanel />
        </aside>
        <div className="min-w-0">
          <LayoutRenderer layout={data.layout} themeMode="ask" />
        </div>
      </div>
    </div>
  )
}
