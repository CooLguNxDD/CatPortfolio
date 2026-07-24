import { useQuery } from "@tanstack/react-query"
import { loadBaked, loadLiveWithStatus, type LayoutLoadResult } from "@/content/loadLayout"
import { LayoutRenderer } from "@/render/LayoutRenderer"
import { cn } from "@/lib/utils"
import { ChatPanel } from "@/components/chat/ChatPanel"
import { AgentStatusPill } from "@/components/AgentStatusPill"

function sourceLabel(data: LayoutLoadResult): string {
  const mode = data.layout?.meta?.mode
  if (mode === "scoped") return "live · scoped GenUI"
  if (mode === "template") return "live · template"
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
  const { data } = useQuery({
    queryKey: ["layout", "default"],
    queryFn: () => loadLiveWithStatus("default"),
    retry: false,
    // Infinity + no refocus refetch: once ChatPanel lands a fragment/bake layout
    // in cache, a background refetch must not overwrite it with the default.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    placeholderData: { layout: loadBaked(), source: "snapshot" as const },
  })

  if (!data) return null

  const isLive = data.source !== "snapshot"

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 space-y-10">
      <div className="flex flex-wrap items-center gap-2">
        <div className="rounded-full border border-(--hairline) px-3 py-1 text-xs font-mono inline-flex items-center gap-2 w-fit">
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              data.source === "fragments"
                ? "bg-(--neon)"
                : data.source === "bake"
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
        <AgentStatusPill />
      </div>
      <ChatPanel />
      {/* Live layout — re-renders when ChatPanel setQueryData after fragment compose / bake */}
      <LayoutRenderer layout={data.layout} />
    </div>
  )
}
