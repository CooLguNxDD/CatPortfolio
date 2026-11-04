import { useQuery } from "@tanstack/react-query"
import { fetchAgentStatus } from "@/api/agentStatus"

const POLL_INTERVAL_MS = 8000

/** Live job-search agent activity widget — polls, never blocks the page. */
export function AgentStatusPill() {
  const { data, isError } = useQuery({
    queryKey: ["agent-status"],
    queryFn: () => fetchAgentStatus(),
    refetchInterval: (query) => (query.state.error ? false : POLL_INTERVAL_MS),
    retry: 1,
  })

  if (data) {
    return (
      <div className="rounded-full border border-(--hairline) px-3 py-1 text-xs font-mono inline-flex items-center gap-2 w-fit">
        <span className="h-2 w-2 rounded-full bg-(--neon) animate-pulse" />
        <span>agent: {data.status}</span>
      </div>
    )
  }

  if (isError) {
    return (
      <div
        className="rounded-full border border-(--hairline) px-3 py-1 text-xs font-mono inline-flex items-center gap-2 w-fit text-(--fg-muted)"
        title="Job-agent activity could not be checked. The portfolio and chat are unaffected."
      >
        <span className="h-2 w-2 rounded-full bg-(--fg-subtle)" />
        <span>agent status unavailable</span>
      </div>
    )
  }

  return null
}
