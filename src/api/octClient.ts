import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { getOctBaseUrl, getMcpApiKey } from "../config/runtimeConfig";

export interface ContentBlock {
  type: string;
  text?: string;
  [key: string]: any;
}

export interface OctToolResult {
  data: unknown;
  content: ContentBlock[];
  isError: boolean;
}

export class OctClient {
  private url: string;
  private client: Client | null = null;
  private _initializeResult: any = null;
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
      apiKey = getMcpApiKey();
    } catch {
      // runtime config not loaded yet — fall back to no auth header (dev convenience)
    }
    const transport = new StreamableHTTPClientTransport(
      new URL(this.url),
      apiKey ? { requestInit: { headers: { Authorization: `Bearer ${apiKey}` } } } : undefined
    );
    const client = new Client(
      {
        name: "cat-portfolio-client",
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
        await client.close();
      } catch {
        // ignore cleanup failures
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
    await this.client.ping();
  }

  async listTools(): Promise<{ name: string; description?: string; inputSchema: any }[]> {
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
  ): Promise<OctToolResult> {
    if (!this.client) {
      throw new Error("client_not_connected");
    }
    try {
      // MCP SDK default is 60s (DEFAULT_REQUEST_TIMEOUT_MSEC). Agent turns often
      // exceed that; pass an explicit idle timeout and reset it on server progress
      // keepalives (~15s). Providing onprogress is required so the client sends a
      // progressToken — without it the server skips keepalives and the 60s wall hits.
      // See OpenCat admin mcpClient + core_graph/node/helpers/mcp_ctx.py.
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
          console.warn("[octClient] tool text not JSON, using raw text");
          data = textBlock.text;
        }
      }

      return {
        data,
        content,
        isError,
      };
    } catch (err) {
      resetSharedClient();
      throw err;
    }
  }
}

export function octBaseUrl(): string | undefined {
  try {
    const runtime = getOctBaseUrl();
    if (runtime) return runtime;
  } catch {
    // runtime config not loaded yet (e.g. tests, or main.tsx hasn't awaited it) —
    // fall back to the build-time env var for dev convenience.
  }
  return import.meta.env.VITE_OCT_URL as string | undefined;
}

let sharedClient: OctClient | null = null;

export async function getSharedClient(): Promise<OctClient> {
  const base = octBaseUrl();
  if (!base) {
    throw new Error("oct_unconfigured");
  }
  const mcpUrl = base.endsWith("/mcp") ? base : `${base.replace(/\/$/, "")}/mcp`;
  if (!sharedClient) {
    sharedClient = new OctClient(mcpUrl);
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

export function resetSharedClient(): void {
  if (sharedClient) {
    sharedClient.close().catch(() => {});
    sharedClient = null;
  }
}
