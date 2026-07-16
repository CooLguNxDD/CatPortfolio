import baked from "./layout.json";
import { LayoutSchema, type Layout } from "./schema";
import { getOctBaseUrl } from "../config/runtimeConfig";

export function loadBaked(): Layout {
  return LayoutSchema.parse(baked);
}

export type LayoutSource = "live" | "snapshot";

export async function loadLiveWithStatus(audience: string):
    Promise<{ layout: Layout; source: LayoutSource }> {
  const base = import.meta.env.VITE_OCT_URL as string | undefined;
  if (!base) return { layout: loadBaked(), source: "snapshot" };
  try {
    const res = await fetch(`${base}/portfolio/layout?audience=${audience}`,
      { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error(String(res.status));
    return { layout: LayoutSchema.parse(await res.json()), source: "live" };
  } catch {
    return { layout: loadBaked(), source: "snapshot" };
  }
}

/**
 * Fast, public, no-MCP-handshake path for chat-driven layout re-render:
 * infers audience/star_query from free-text intent (deterministic, no LLM)
 * and composes a matching layout. Falls back to the baked snapshot on any
 * failure — a chat turn that can't produce a usable layout should never
 * break the page, just leave the current layout in place.
 */
export async function loadLayoutForQuery(
  query: string,
  opts?: { timeoutMs?: number }
): Promise<{ layout: Layout; source: LayoutSource }> {
  let base: string;
  try {
    base = getOctBaseUrl();
  } catch {
    return { layout: loadBaked(), source: "snapshot" };
  }
  if (!base) return { layout: loadBaked(), source: "snapshot" };
  try {
    const res = await fetch(
      `${base.replace(/\/$/, "")}/api/portfolio/public/layout-for-query?query=${encodeURIComponent(query)}`,
      { signal: AbortSignal.timeout(opts?.timeoutMs ?? 4000) }
    );
    if (!res.ok) throw new Error(String(res.status));
    return { layout: LayoutSchema.parse(await res.json()), source: "live" };
  } catch {
    return { layout: loadBaked(), source: "snapshot" };
  }
}

export async function loadLive(audience: string): Promise<Layout> {
  return (await loadLiveWithStatus(audience)).layout;
}

/**
 * Loads a previously baked, job-specific layout artifact by short id
 * ("bake & send" — see ?j=<jobId>). Read-only, no LLM call at fetch time;
 * falls back to the baked snapshot on any failure (network/timeout/404/
 * schema-parse) since this backs a public HR-facing link that must never
 * hard-fail.
 */
export async function loadJobLayout(
  jobId: string,
  opts?: { timeoutMs?: number }
): Promise<{ layout: Layout; source: LayoutSource }> {
  let base: string;
  try {
    base = getOctBaseUrl();
  } catch {
    return { layout: loadBaked(), source: "snapshot" };
  }
  if (!base) return { layout: loadBaked(), source: "snapshot" };
  try {
    const res = await fetch(
      `${base.replace(/\/$/, "")}/api/portfolio/public/layout/${encodeURIComponent(jobId)}`,
      { signal: AbortSignal.timeout(opts?.timeoutMs ?? 4000) }
    );
    if (!res.ok) throw new Error(String(res.status));
    return { layout: LayoutSchema.parse(await res.json()), source: "live" };
  } catch {
    return { layout: loadBaked(), source: "snapshot" };
  }
}
