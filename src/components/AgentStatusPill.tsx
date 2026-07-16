import { useQuery } from "@tanstack/react-query"
import { fetchAgentStatus } from "@/api/agentStatus"

const POLL_INTERVAL_MS = 8000

/** Live job-search agent activity widget — polls, never blocks the page. */
export function AgentStatusPill() {
  const { data } = useQuery({
    queryKey: ["agent-status"],
    queryFn: () => fetchAgentStatus(),
    refetchInterval: POLL_INTERVAL_MS,
    retry: false,
  })

  if (!data) return null

  return (
    <div className="rounded-full border border-(--hairline) px-3 py-1 text-xs font-mono inline-flex items-center gap-2 w-fit">
      <span className="h-2 w-2 rounded-full bg-(--neon) animate-pulse" />
      <span>agent: {data.status}</span>
    </div>
  )
}
