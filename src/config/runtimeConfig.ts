export interface RuntimeConfig {
  octBaseUrl: string;
  /**
   * Bearer token for the /mcp endpoint. The server's FastMCP OAuth resource-server
   * gate requires SOME valid authenticated principal for any /mcp request (even
   * run_graph) — this is a deny-all-scoped (`scopes: []`) API key, so it can only
   * ever invoke gateway-always-visible tools (run_graph, discover_tools,
   * authenticate, complete_authentication). It is not a secret in the usual
   * sense: this is a public SPA, so the token is inherently visible to anyone
   * loading the site (network tab, bundled config.json). Its only job is to
   * satisfy the outer auth gate; least-privilege (deny-all) scoping is what
   * keeps that acceptable.
   */
  mcpApiKey: string;
  /**
   * Per-idle-window timeout (ms) for a single Andrew's AI (`run_graph`) call.
   * Passed to the MCP SDK as RequestOptions.timeout with resetTimeoutOnProgress.
   * Server keepalives (~15s) reset this window during long LLM/tool phases —
   * so this is not a hard wall-clock total, it is the max silence before abort.
   * Patchable via public/config.json without a rebuild.
   */
  askTimeoutMs: number;
}

const FETCH_TIMEOUT_MS = 2000;
/**
 * Default idle timeout for askOct / run_graph.
 * Matches OpenCat admin MCP_TOOL_TIMEOUT_MS (10 min); keepalives reset the clock.
 */
export const DEFAULT_ASK_TIMEOUT_MS = 600_000;

let cached: RuntimeConfig | null = null;
let loadPromise: Promise<RuntimeConfig> | null = null;

/** Parse a positive finite timeout from config/env; otherwise return fallback. */
function parseTimeoutMs(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  return fallback;
}

/**
 * Resolve OCT base URL for the browser.
 * - empty / "same-origin" / "." → window.location.origin (nginx proxies /api + /mcp)
 * - absolute URL → use as-is (e.g. GitHub Pages pointing at a public OCT host)
 */
function resolveOctBaseUrl(raw: string | undefined | null): string {
  const v = (raw ?? "").trim();
  if (!v || v === "same-origin" || v === ".") {
    if (typeof window !== "undefined" && window.location?.origin) {
      return window.location.origin;
    }
    return "";
  }
  return v.replace(/\/$/, "");
}

function envFallback(): RuntimeConfig {
  return {
    octBaseUrl: resolveOctBaseUrl(
      (import.meta.env.VITE_OCT_URL as string | undefined) ?? "",
    ),
    mcpApiKey: (import.meta.env.VITE_OCT_API_KEY as string | undefined) ?? "",
    askTimeoutMs: parseTimeoutMs(
      import.meta.env.VITE_ASK_TIMEOUT_MS as string | undefined,
      DEFAULT_ASK_TIMEOUT_MS
    ),
  };
}

/**
 * Fetches /config.json (unhashed, patchable post-deploy without a rebuild —
 * see public/config.json) to discover the OCT backend base URL + API key at
 * runtime, since GitHub Pages static hosting has no build-time env injection.
 * Falls back to VITE_OCT_URL/VITE_OCT_API_KEY/VITE_ASK_TIMEOUT_MS, then defaults,
 * on any fetch/parse failure.
 */
export function loadRuntimeConfig(): Promise<RuntimeConfig> {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const res = await fetch("/config.json", { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      const fallback = envFallback();
      const rawBase =
        typeof json?.octBaseUrl === "string" ? json.octBaseUrl : fallback.octBaseUrl;
      cached = {
        octBaseUrl: resolveOctBaseUrl(rawBase || fallback.octBaseUrl),
        mcpApiKey:
          typeof json?.mcpApiKey === "string" && json.mcpApiKey ? json.mcpApiKey : fallback.mcpApiKey,
        askTimeoutMs:
          json?.askTimeoutMs !== undefined
            ? parseTimeoutMs(json.askTimeoutMs, fallback.askTimeoutMs)
            : fallback.askTimeoutMs,
      };
    } catch {
      cached = envFallback();
    }
    return cached;
  })();
  return loadPromise;
}

/** Returns the resolved OCT base URL. Throws if loadRuntimeConfig() hasn't resolved yet. */
export function getOctBaseUrl(): string {
  if (!cached) {
    throw new Error("runtime_config_not_loaded");
  }
  return resolveOctBaseUrl(cached.octBaseUrl);
}

/** Returns the resolved /mcp bearer token (may be ""). Throws if not loaded yet. */
export function getMcpApiKey(): string {
  if (!cached) {
    throw new Error("runtime_config_not_loaded");
  }
  return cached.mcpApiKey;
}

/**
 * Returns the client timeout for Andrew's AI ask turns.
 * Safe before loadRuntimeConfig resolves — falls back to DEFAULT_ASK_TIMEOUT_MS
 * (and VITE_ASK_TIMEOUT_MS when set) so harness tests and early callers don't throw.
 */
export function getAskTimeoutMs(): number {
  if (cached) return cached.askTimeoutMs;
  return parseTimeoutMs(
    import.meta.env.VITE_ASK_TIMEOUT_MS as string | undefined,
    DEFAULT_ASK_TIMEOUT_MS
  );
}

/** Test-only: clears cached state so loadRuntimeConfig() re-fetches. */
export function resetRuntimeConfig(): void {
  cached = null;
  loadPromise = null;
}
