export interface RuntimeConfig {
  /**
   * OCT backend base URL.
   *
   * **Docker (localhost / ngrok)**: intentionally absent from config.json.
   * `resolveOctBaseUrl("")` returns `window.location.origin`, so the browser
   * uses same-origin `/api/` and `/mcp` paths that nginx proxies to the real
   * backend. The backend URL never reaches the browser.
   *
   * **GitHub Pages**: baked into the JS bundle at build time via `VITE_OCT_URL`
   * (injected from a GitHub Actions secret in deploy.yml).
   */
  octBaseUrl: string;
  /**
   * Bearer token for the /mcp endpoint.
   *
   * **Docker (localhost / ngrok)**: nginx injects `Authorization: Bearer <key>`
   * server-side via envsubst templating (see nginx.conf + docker-entrypoint.sh).
   * The key is never written to config.json or sent to the browser — this field
   * will be empty string in that deployment.
   *
   * **GitHub Pages**: no server-side injection is available, so the key is
   * baked into the JS bundle at build time via `VITE_OCT_API_KEY` (injected
   * from a GitHub Actions secret in deploy.yml). `loadRuntimeConfig` falls back
   * to `envFallback()` which reads `import.meta.env.VITE_OCT_API_KEY`.
   *
   * In both cases the key is deny-all-scoped (`scopes: []`), so it can only
   * invoke gateway-always-visible tools (run_graph, discover_tools,
   * authenticate, complete_authentication). Least-privilege scoping limits the
   * blast radius of any accidental exposure.
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
/** `new URL(v).origin`, or "" if `v` isn't a parseable absolute URL. */
function originOf(v: string | undefined | null): string {
  if (!v) return "";
  try {
    return new URL(v).origin;
  } catch {
    return "";
  }
}

/**
 * Origins config.json is allowed to point the browser at: same-origin
 * (Docker/nginx proxy path) and whatever origin was baked in at build time
 * via VITE_OCT_URL (GitHub Pages). Both are already trusted by this
 * deployment; nothing else is, since config.json is unhashed and patchable
 * post-deploy without a rebuild.
 */
function allowedOrigins(): Set<string> {
  const origins = new Set<string>();
  if (typeof window !== "undefined" && window.location?.origin) {
    origins.add(window.location.origin);
  }
  const buildTimeOrigin = originOf(import.meta.env.VITE_OCT_URL as string | undefined);
  if (buildTimeOrigin) origins.add(buildTimeOrigin);
  return origins;
}

function resolveOctBaseUrl(raw: string | undefined | null): string {
  const v = (raw ?? "").trim();
  if (!v || v === "same-origin" || v === ".") {
    if (typeof window !== "undefined" && window.location?.origin) {
      return window.location.origin;
    }
    return "";
  }
  const stripped = v.replace(/\/$/, "");
  // Reject anything that isn't a well-formed http(s) URL on an allowlisted
  // origin — config.json is a patchable, unhashed static file, so this value
  // isn't fully trusted the way a build-time env var is. It also becomes the
  // target of an Authorization: Bearer header (see octClient.ts), so a
  // compromised config.json must not be able to redirect that header to an
  // arbitrary host — only to same-origin or the origin baked in at build time.
  try {
    const parsed = new URL(stripped);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error(`unsupported scheme: ${parsed.protocol}`);
    }
    if (!allowedOrigins().has(parsed.origin)) {
      throw new Error(`origin not allowlisted: ${parsed.origin}`);
    }
  } catch (err) {
    console.warn("resolveOctBaseUrl: rejecting invalid octBaseUrl, falling back to same-origin", stripped, err);
    if (typeof window !== "undefined" && window.location?.origin) {
      return window.location.origin;
    }
    return "";
  }
  return stripped;
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
 * see public/config.json) to discover the OCT backend base URL + timeout at
 * runtime, since GitHub Pages static hosting has no build-time env injection.
 *
 * mcpApiKey is NOT present in config.json for Docker deployments (nginx
 * injects the Authorization header server-side). For GitHub Pages it falls
 * back to VITE_OCT_API_KEY baked into the bundle at CI build time.
 *
 * Falls back to VITE_OCT_URL/VITE_OCT_API_KEY/VITE_ASK_TIMEOUT_MS, then
 * defaults, on any fetch/parse failure.
 */
export function loadRuntimeConfig(): Promise<RuntimeConfig> {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}config.json`, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
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
    } catch (err) {
      console.warn("loadRuntimeConfig: falling back to env config", err);
      cached = envFallback();
      // Let a later call retry the fetch instead of pinning the whole
      // session to the env fallback after one transient failure (a slow
      // network, a momentary 5xx) — this promise still resolves with the
      // fallback for anyone already awaiting it.
      loadPromise = null;
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
