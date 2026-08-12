import baked from "./layout.json";
import { LayoutSchema, type Layout } from "./schema";
import { getOctBaseUrl } from "../config/runtimeConfig";

/** Parsed once — never re-create on every HomePage render (breaks scroll/DAG hooks). */
const BAKED_LAYOUT: Layout = LayoutSchema.parse(baked);

/** Loads the statically baked layout.json file (stable reference). */
export function loadBaked(): Layout {
  return BAKED_LAYOUT;
}

export type LayoutSource = "live" | "snapshot" | "fragments" | "bake";

export type LayoutLoadResult = {
  layout: Layout;
  source: LayoutSource;
  /** fragment ids used when mode is fragments */
  fragments?: string[];
  audience?: string;
  shortId?: string;
};

function parseLayoutPayload(json: unknown): LayoutLoadResult | null {
  if (!json || typeof json !== "object") return null;
  const obj = json as Record<string, unknown>;

  // New envelope: { layout, mode, fragments, audience }
  if (obj.layout && typeof obj.layout === "object") {
    const parsed = LayoutSchema.safeParse(obj.layout);
    if (!parsed.success) return null;
    const mode = typeof obj.mode === "string" ? obj.mode : "";
    // Prefer mode stamped on layout.meta (scoped GenUI); envelope mode is fallback.
    const metaMode =
      parsed.data.meta && typeof parsed.data.meta.mode === "string"
        ? parsed.data.meta.mode
        : mode;
    const source: LayoutSource =
      metaMode === "fragments" || mode === "fragments" ? "fragments" : "live";
    return {
      layout: parsed.data,
      source,
      fragments: Array.isArray(obj.fragments)
        ? (obj.fragments as unknown[]).filter((x): x is string => typeof x === "string")
        : undefined,
      audience: typeof obj.audience === "string" ? obj.audience : undefined,
    };
  }

  // Legacy bare layout
  const bare = LayoutSchema.safeParse(json);
  if (!bare.success) return null;
  return { layout: bare.data, source: "live" };
}

/** Loads a live layout from the backend with detailed load status. */
export async function loadLiveWithStatus(audience: string): Promise<LayoutLoadResult> {
  const base = import.meta.env.VITE_OCT_URL as string | undefined;
  if (!base) return { layout: loadBaked(), source: "snapshot" };
  try {
    const res = await fetch(
      `${base}/portfolio/layout?audience=${encodeURIComponent(audience)}`,
      { signal: AbortSignal.timeout(4000) },
    );
    if (!res.ok) throw new Error(String(res.status));
    const json = await res.json();
    const parsed = LayoutSchema.safeParse(json);
    if (!parsed.success) throw new Error("schema");
    return { layout: parsed.data, source: "live" };
  } catch (err) {
    console.warn("[loadLayout] live layout failed, using snapshot:", err);
    return { layout: loadBaked(), source: "snapshot" };
  }
}

/**
 * Fast, public path for Ask-mode chat-driven layout re-render.
 * Backend scoped GenUI compose (compose_scoped_layout); returns envelope or bare layout.
 */
export async function loadLayoutForQuery(
  query: string,
  opts?: { timeoutMs?: number },
): Promise<LayoutLoadResult> {
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
      { signal: AbortSignal.timeout(opts?.timeoutMs ?? 8000) },
    );
    if (!res.ok) throw new Error(String(res.status));
    const json = await res.json();
    return parseLayoutPayload(json) ?? { layout: loadBaked(), source: "snapshot" };
  } catch (err) {
    console.warn("[loadLayout] layout-for-query failed, using snapshot:", err);
    return { layout: loadBaked(), source: "snapshot" };
  }
}

/**
 * POST public fragment compose — explicit page and/or free-text intent.
 * Real-time fragment "bake" without MCP auth for Ask mode.
 */
export async function composeLayoutLive(
  body: {
    query?: string;
    page?: Array<{ fragment: string; overrides?: Record<string, unknown> }>;
    theme?: string;
    refresh?: boolean;
  },
  opts?: { timeoutMs?: number },
): Promise<LayoutLoadResult> {
  let base: string;
  try {
    base = getOctBaseUrl();
  } catch {
    return { layout: loadBaked(), source: "snapshot" };
  }
  if (!base) return { layout: loadBaked(), source: "snapshot" };
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/api/portfolio/public/compose`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(opts?.timeoutMs ?? 12000),
    });
    if (!res.ok) throw new Error(String(res.status));
    const json = await res.json();
    return parseLayoutPayload(json) ?? { layout: loadBaked(), source: "snapshot" };
  } catch (err) {
    console.warn("[loadLayout] compose failed, using snapshot:", err);
    return { layout: loadBaked(), source: "snapshot" };
  }
}

export async function loadLive(audience: string): Promise<Layout> {
  return (await loadLiveWithStatus(audience)).layout;
}

/**
 * Loads a previously baked, job-specific layout artifact by short id.
 */
export async function loadJobLayout(
  jobId: string,
  opts?: { timeoutMs?: number },
): Promise<LayoutLoadResult> {
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
      { signal: AbortSignal.timeout(opts?.timeoutMs ?? 4000) },
    );
    if (!res.ok) throw new Error(String(res.status));
    const json = await res.json();
    // Bare layout or envelope { layout, audience, ... }
    const candidate =
      json &&
      typeof json === "object" &&
      "layout" in json &&
      (json as { layout: unknown }).layout &&
      typeof (json as { layout: unknown }).layout === "object"
        ? (json as { layout: unknown }).layout
        : json;
    const parsed = LayoutSchema.safeParse(candidate);
    if (!parsed.success) {
      console.warn("[loadJobLayout] schema:", parsed.error.flatten());
      throw new Error("schema");
    }
    const audience =
      json &&
      typeof json === "object" &&
      typeof (json as { audience?: unknown }).audience === "string"
        ? (json as { audience: string }).audience
        : parsed.data.meta.audience;
    return {
      layout: parsed.data,
      source: "bake",
      shortId: jobId,
      audience,
    };
  } catch (err) {
    console.warn("[loadJobLayout] fallback snapshot for", jobId, err);
    return { layout: loadBaked(), source: "snapshot", shortId: jobId };
  }
}
