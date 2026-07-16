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
}

const FETCH_TIMEOUT_MS = 2000;

let cached: RuntimeConfig | null = null;
let loadPromise: Promise<RuntimeConfig> | null = null;

function envFallback(): RuntimeConfig {
  return {
    octBaseUrl: (import.meta.env.VITE_OCT_URL as string | undefined) ?? "",
    mcpApiKey: (import.meta.env.VITE_OCT_API_KEY as string | undefined) ?? "",
  };
}

/**
 * Fetches /config.json (unhashed, patchable post-deploy without a rebuild —
 * see public/config.json) to discover the OCT backend base URL + API key at
 * runtime, since GitHub Pages static hosting has no build-time env injection.
 * Falls back to VITE_OCT_URL/VITE_OCT_API_KEY, then "", on any fetch/parse failure.
 */
export function loadRuntimeConfig(): Promise<RuntimeConfig> {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const res = await fetch("/config.json", { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      const fallback = envFallback();
      cached = {
        octBaseUrl:
          typeof json?.octBaseUrl === "string" && json.octBaseUrl ? json.octBaseUrl : fallback.octBaseUrl,
        mcpApiKey:
          typeof json?.mcpApiKey === "string" && json.mcpApiKey ? json.mcpApiKey : fallback.mcpApiKey,
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
  return cached.octBaseUrl;
}

/** Returns the resolved /mcp bearer token (may be ""). Throws if not loaded yet. */
export function getMcpApiKey(): string {
  if (!cached) {
    throw new Error("runtime_config_not_loaded");
  }
  return cached.mcpApiKey;
}

/** Test-only: clears cached state so loadRuntimeConfig() re-fetches. */
export function resetRuntimeConfig(): void {
  cached = null;
  loadPromise = null;
}
