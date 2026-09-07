import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { McpError, ErrorCode, type Tool } from "@modelcontextprotocol/sdk/types.js";
import * as runtimeConfig from "../config/runtimeConfig";

/**
 * True when `err` is the MCP SDK's own request-timeout error (an idle window
 * that elapsed without a keepalive), as opposed to a caller-initiated abort or
 * a generic connection failure. Callers should classify by this instead of
 * substring-matching `error.message` for "timeout".
 */
export function isWhiskersTimeoutError(err: unknown): boolean {
  return err instanceof McpError && err.code === ErrorCode.RequestTimeout;
}

/** Backward-compatible alias for isWhiskersTimeoutError */
export const isOctTimeoutError = isWhiskersTimeoutError;

export interface ContentBlock {
  type: string;
  text?: string;
  [key: string]: unknown;
}

/** Shape of `Client.getServerCapabilities/getServerVersion/getInstructions`, cached post-connect. */
interface WhiskersInitializeResult {
  serverCapabilities: ReturnType<Client["getServerCapabilities"]>;
  serverVersion: ReturnType<Client["getServerVersion"]>;
  instructions: ReturnType<Client["getInstructions"]>;
}

export interface WhiskersToolResult {
  data: unknown;
  content: ContentBlock[];
  isError: boolean;
}

/** Backward-compatible alias for WhiskersToolResult */
export type OctToolResult = WhiskersToolResult;

/**
 * Thin wrapper around the MCP SDK's `Client` over `StreamableHTTPClientTransport`:
 * connect/close lifecycle (concurrency-safe via `connectPromise`), `listTools`,
 * and `callTool` (auto-parses a JSON text content block into `.data`).
 */
export class WhiskersClient {
  private url: string;
  private client: Client | null = null;
  private _initializeResult: WhiskersInitializeResult | null = null;
  /** Serializes concurrent connect() calls; only set while a connect is in flight. */
  private connectPromise: Promise<void> | null = null;

  constructor(url: string) {
    this.url = url;
  }

  async connect(): Promise<void> {
    if (this.client) return;
    if (this.connectPromise) return this.connectPromise;

    this.connectPromise = this.doConnect();
    try {
      await this.connectPromise;
    } finally {
      this.connectPromise = null;
    }
  }

  private async doConnect(): Promise<void> {
    let apiKey = "";
    try {
      const rc = runtimeConfig as Record<string, unknown>;
      if (typeof rc.getMcpApiKey === "function") {
        apiKey = (rc.getMcpApiKey as () => string)();
      }
    } catch {
      // runtime config not loaded yet — fall back to no auth header (dev convenience)
    }
    const transport = new StreamableHTTPClientTransport(
      new URL(this.url),
      apiKey ? { requestInit: { headers: { Authorization: `Bearer ${apiKey}` } } } : undefined
    );
    const client = new Client(
      {
        name: "whiskers-portfolio-client",
        version: "1.0.0",
      },
      {
        capabilities: {},
      }
    );

    try {
      await client.connect(transport);
      // Assign only after connect succeeds so isConnected() is never half-true.
      this.client = client;
      this._initializeResult = {
        serverCapabilities: client.getServerCapabilities(),
        serverVersion: client.getServerVersion(),
        instructions: client.getInstructions(),
      };
    } catch (err) {
      this.client = null;
      this._initializeResult = null;
      try {
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error("close timeout")), 3000);
          client.close().then(
            () => {
              clearTimeout(timer);
              resolve();
            },
            (closeErr) => {
              clearTimeout(timer);
              reject(closeErr);
            },
          );
        });
      } catch (closeErr) {
        console.warn("[whiskersClient] cleanup failed during connect abort", {
          error: closeErr instanceof Error ? closeErr.message : closeErr,
        });
      }
      throw err;
    }
  }

  async close(): Promise<void> {
    // Await in-flight connect so we don't leak a client that resolves after close.
    if (this.connectPromise) {
      try {
        await this.connectPromise;
      } catch {
        // ignore connect failure — still clear state below
      }
    }
    if (this.client) {
      try {
        await this.client.close();
      } catch {
        // ignore
      }
    }
    this.client = null;
    this._initializeResult = null;
    this.connectPromise = null;
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.close();
  }

  get initializeResult() {
    return this._initializeResult;
  }

  isConnected(): boolean {
    return this.client !== null;
  }

  async ping(): Promise<void> {
    if (!this.client) {
      throw new Error("client_not_connected");
    }
    // Explicit timeout (SDK default is 60s) — no in-repo caller today, but
    // this is public API surface and shouldn't hang a future caller for a
    // full minute on a half-dead connection.
    await this.client.ping({ timeout: 5000 });
  }

  async listTools(): Promise<Pick<Tool, "name" | "description" | "inputSchema">[]> {
    if (!this.client) {
      throw new Error("client_not_connected");
    }
    const res = await this.client.listTools();
    return res.tools || [];
  }

  async callTool(
    name: string,
    args?: Record<string, unknown>,
    opts?: { timeoutMs?: number; signal?: AbortSignal }
  ): Promise<WhiskersToolResult> {
    if (!this.client) {
      throw new Error("client_not_connected");
    }
    try {
      // MCP SDK default is 60s (DEFAULT_REQUEST_TIMEOUT_MSEC). Agent turns often
      // exceed that; pass an explicit idle timeout and reset it on server progress
      // keepalives (~15s). Providing onprogress is required so the client sends a
      // progressToken — without it the server skips keepalives and the 60s wall hits.
      // See Whiskers Agent admin mcpClient + core_graph/node/helpers/mcp_ctx.py.
      const timeoutMs = opts?.timeoutMs;
      const res = await this.client.callTool(
        { name, arguments: args },
        undefined,
        timeoutMs || opts?.signal
          ? {
              ...(timeoutMs ? { timeout: timeoutMs } : {}),
              ...(opts?.signal ? { signal: opts.signal } : {}),
              resetTimeoutOnProgress: true,
              // Registers progressToken even when we don't surface events in the UI.
              onprogress: () => {},
            }
          : {
              // Still register progress so keepalives can extend the SDK default.
              resetTimeoutOnProgress: true,
              onprogress: () => {},
            }
      );

      const isError = !!res.isError;
      const content = (res.content as ContentBlock[]) || [];

      let data: unknown = null;
      const textBlock = content.find((c) => c.type === "text");
      if (textBlock && textBlock.text) {
        try {
          data = JSON.parse(textBlock.text);
        } catch {
          console.warn("[whiskersClient] tool text not JSON, using raw text");
          data = textBlock.text;
        }
      }

      return {
        data,
        content,
        isError,
      };
    } catch (err) {
      // A caller-initiated abort (e.g. an unmounted component cancelling its
      // own poll) is not a transport failure — resetting here would tear
      // down the MCP client shared by every other in-flight caller.
      const callerAborted = !!opts?.signal?.aborted;
      if (!callerAborted) {
        resetSharedWhiskersClient();
      }
      throw err;
    }
  }
}

/** Backward-compatible alias for WhiskersClient */
export const OctClient = WhiskersClient;
export type OctClient = WhiskersClient;

/** Resolved Whiskers Agent base URL: runtime `config.json` first, then the build-time `VITE_WHISKERS_URL` / `VITE_OCT_URL` fallback. */
export function whiskersBaseUrl(): string | undefined {
  const rc = runtimeConfig as Record<string, unknown>;
  if (typeof rc.getWhiskersBaseUrl === "function") {
    try {
      const runtime = (rc.getWhiskersBaseUrl as () => string)();
      if (runtime) return runtime;
    } catch {
      // try fallback below
    }
  }
  if (typeof rc.getOctBaseUrl === "function") {
    try {
      const runtime = (rc.getOctBaseUrl as () => string)();
      if (runtime) return runtime;
    } catch {
      // try fallback below
    }
  }
  return (
    (import.meta.env.VITE_WHISKERS_URL as string | undefined) ||
    (import.meta.env.VITE_OCT_URL as string | undefined)
  );
}

/** Backward-compatible alias for whiskersBaseUrl */
export const octBaseUrl = whiskersBaseUrl;

let sharedClient: WhiskersClient | null = null;

/** Returns the module-level shared `WhiskersClient`, connecting (or reconnecting) it first if needed. Throws `oct_unconfigured` when no base URL is resolvable. */
export async function getSharedWhiskersClient(): Promise<WhiskersClient> {
  const base = whiskersBaseUrl();
  if (!base) {
    throw new Error("oct_unconfigured");
  }
  const mcpUrl = base.endsWith("/mcp") ? base : `${base.replace(/\/$/, "")}/mcp`;
  if (!sharedClient) {
    sharedClient = new WhiskersClient(mcpUrl);
  }
  if (!sharedClient.isConnected()) {
    try {
      await sharedClient.connect();
    } catch (err) {
      sharedClient = null;
      throw err;
    }
  }
  return sharedClient;
}

/** Backward-compatible alias for getSharedWhiskersClient */
export const getSharedClient = getSharedWhiskersClient;

/** Tears down the shared client (best-effort close) and clears it so the next `getSharedWhiskersClient()` call reconnects from scratch. */
export function resetSharedWhiskersClient(): void {
  if (sharedClient) {
    sharedClient.close().catch(() => {});
    sharedClient = null;
  }
}

/** Backward-compatible alias for resetSharedWhiskersClient */
export const resetSharedClient = resetSharedWhiskersClient;
