/**
 * Cloudflare Worker: CatPortfolio Public Gateway Proxy
 *
 * Sits at the edge to securely proxy /mcp and /api calls from GitHub Pages
 * (https://coolgunxdd.github.io) to the Whiskers Agent / OCT backend
 * (https://whiskers-agent.17655155.xyz).
 *
 * Injects `Authorization: Bearer <OCT_API_KEY>` server-side so the API key
 * is never bundled into the client JS bundle or visible in browser DevTools.
 */

export interface Env {
  OCT_API_KEY?: string;
  UPSTREAM_HOST?: string;
}

const DEFAULT_UPSTREAM = "whiskers-agent.17655155.xyz";

const ALLOWED_ORIGINS = new Set([
  "https://coolgunxdd.github.io",
  "http://localhost:11000",
  "http://127.0.0.1:11000",
]);

function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const origin = requestOrigin && ALLOWED_ORIGINS.has(requestOrigin)
    ? requestOrigin
    : "https://coolgunxdd.github.io";

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, mcp-session-id, mcp-protocol-version, x-requested-with",
    "Access-Control-Expose-Headers": "mcp-session-id, mcp-protocol-version",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin");

    // 1. Handle CORS Preflight (OPTIONS)
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(origin),
      });
    }

    const url = new URL(request.url);

    // 2. Allow only /mcp and /api endpoints
    if (!url.pathname.startsWith("/mcp") && !url.pathname.startsWith("/api")) {
      return new Response("Not Found", {
        status: 404,
        headers: getCorsHeaders(origin),
      });
    }

    const upstreamHost = env.UPSTREAM_HOST || DEFAULT_UPSTREAM;

    // 3. Build upstream destination URL
    const targetUrl = new URL(request.url);
    targetUrl.protocol = "https:";
    targetUrl.hostname = upstreamHost;
    targetUrl.port = "443";

    // 4. Clone headers and inject server-side credentials
    const forwardHeaders = new Headers(request.headers);
    forwardHeaders.set("Host", upstreamHost);

    // Strip any browser-supplied Authorization header and inject server-side secret
    forwardHeaders.delete("Authorization");
    if (env.OCT_API_KEY) {
      forwardHeaders.set("Authorization", `Bearer ${env.OCT_API_KEY}`);
    }

    try {
      // 5. Stream request to upstream backend (preserves SSE text/event-stream)
      const response = await fetch(targetUrl.toString(), {
        method: request.method,
        headers: forwardHeaders,
        body: request.body,
        redirect: "follow",
      });

      // 6. Merge upstream response headers with CORS headers
      const responseHeaders = new Headers(response.headers);
      const cors = getCorsHeaders(origin);
      for (const [key, value] of Object.entries(cors)) {
        responseHeaders.set(key, value);
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } catch (err) {
      return new Response(
        JSON.stringify({
          error: "Gateway connection failed",
          details: err instanceof Error ? err.message : String(err),
        }),
        {
          status: 502,
          headers: {
            "Content-Type": "application/json",
            ...getCorsHeaders(origin),
          },
        }
      );
    }
  },
};
