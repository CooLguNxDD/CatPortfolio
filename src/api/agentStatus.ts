import { getOctBaseUrl } from "@/config/runtimeConfig";

export interface AgentActivity {
  job_id: string;
  status: string;
  updated_at: string | null;
}

/**
 * Polls the public, privacy-safe job-search agent activity snapshot
 * (GET /api/portfolio/public/agent-status). Returns null on any failure or
 * when there's no activity yet — this backs an optional status widget, never
 * a critical path, so it degrades silently.
 */
export async function fetchAgentStatus(opts?: {
  jobId?: string;
  timeoutMs?: number;
}): Promise<AgentActivity | null> {
  let base: string;
  try {
    base = getOctBaseUrl();
  } catch {
    return null;
  }
  if (!base) return null;
  try {
    const params = opts?.jobId ? `?job_id=${encodeURIComponent(opts.jobId)}` : "";
    const res = await fetch(
      `${base.replace(/\/$/, "")}/api/portfolio/public/agent-status${params}`,
      { signal: AbortSignal.timeout(opts?.timeoutMs ?? 4000) }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return (json?.activity as AgentActivity | null) ?? null;
  } catch {
    return null;
  }
}
