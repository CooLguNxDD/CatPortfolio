/**
 * Job id validation shared across the demo layout hook, the octClient status
 * poll, and agentStatus — mirrors the backend contract exactly:
 * plugins/portfolio_plugin/routes.py JOB_ID_RE. Anything else 400s
 * server-side, so callers should skip the fetch (and not hydrate a
 * store/query key with garbage) rather than firing it and eating the 400.
 */
export const JOB_ID_RE = /^[a-z0-9_]{1,80}$/

/** True when `id` matches the backend's job id contract. */
export function isValidJobId(id: string): boolean {
  return JOB_ID_RE.test(id)
}
