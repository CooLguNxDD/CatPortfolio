import { useQuery } from "@tanstack/react-query"
import { loadBaked, loadLiveWithStatus } from "@/content/loadLayout"
import { LayoutRenderer } from "@/render/LayoutRenderer"
import { cn } from "@/lib/utils"
import { ChatPanel } from "@/components/chat/ChatPanel"
import { AgentStatusPill } from "@/components/AgentStatusPill"

export function AskPage() {
  const { data } = useQuery({
    queryKey: ["layout", "default"],
    queryFn: () => loadLiveWithStatus("default"),
    retry: false,
    // Infinity + no refocus refetch: once an agent-designed layout (via
    // ChatPanel's setQueryData) lands in cache, a background refetch must
    // never silently overwrite it with the deterministic default layout.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    placeholderData: { layout: loadBaked(), source: "snapshot" as const },
  })

  if (!data) return null

  const isLive = data.source === "live"

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 space-y-10">
      <div className="flex flex-wrap items-center gap-2">
        <div className="rounded-full border border-(--hairline) px-3 py-1 text-xs font-mono inline-flex items-center gap-2 w-fit">
          <span className={cn("h-2 w-2 rounded-full", isLive ? "bg-(--neon)" : "bg-(--amber)")} />
          <span>
            {isLive ? "live" : `snapshot · ${data.layout.meta.generatedAt}`}
          </span>
        </div>
        <AgentStatusPill />
      </div>
      <ChatPanel />
      <LayoutRenderer layout={data.layout} />
    </div>
  )
}
