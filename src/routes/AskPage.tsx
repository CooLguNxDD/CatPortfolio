import { useQuery } from "@tanstack/react-query"
import { loadBaked, loadLiveWithStatus } from "@/content/loadLayout"
import { LayoutRenderer } from "@/render/LayoutRenderer"
import { cn } from "@/lib/utils"
import { ChatPanel } from "@/components/chat/ChatPanel"

export function AskPage() {
  const { data } = useQuery({
    queryKey: ["layout", "default"],
    queryFn: () => loadLiveWithStatus("default"),
    retry: false,
    staleTime: 60_000,
    placeholderData: { layout: loadBaked(), source: "snapshot" as const },
  })

  if (!data) return null

  const isLive = data.source === "live"

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 space-y-10">
      <div className="rounded-full border border-(--hairline) px-3 py-1 text-xs font-mono inline-flex items-center gap-2 w-fit">
        <span className={cn("h-2 w-2 rounded-full", isLive ? "bg-(--neon)" : "bg-(--amber)")} />
        <span>
          {isLive ? "live" : `snapshot · ${data.layout.meta.generatedAt}`}
        </span>
      </div>
      <ChatPanel />
      <LayoutRenderer layout={data.layout} />
    </div>
  )
}
