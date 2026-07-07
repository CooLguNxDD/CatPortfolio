import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

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
  private transport: StreamableHTTPClientTransport | null = null;
  private _initializeResult: any = null;

  constructor(url: string) {
    this.url = url;
  }

  async connect(): Promise<void> {
    if (this.client) return;

    this.transport = new StreamableHTTPClientTransport(new URL(this.url));
    this.client = new Client(
      {
        name: "cat-portfolio-client",
        version: "1.0.0",
      },
      {
        capabilities: {},
      }
    );

    await this.client.connect(this.transport);
    this._initializeResult = {
      serverCapabilities: this.client.getServerCapabilities(),
      serverVersion: this.client.getServerVersion(),
      instructions: this.client.getInstructions(),
    };
  }

  async close(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
      } catch {
        // ignore
      }
    }
    this.client = null;
    this.transport = null;
    this._initializeResult = null;
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
    opts?: { timeoutMs?: number }
  ): Promise<OctToolResult> {
    if (!this.client) {
      throw new Error("client_not_connected");
    }
    try {
      let callPromise = this.client.callTool({
        name,
        arguments: args,
      });

      if (opts?.timeoutMs) {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), opts.timeoutMs)
        );
        callPromise = Promise.race([callPromise, timeoutPromise]);
      }

      const res = await callPromise;
      const isError = !!res.isError;
      const content = (res.content as ContentBlock[]) || [];

      let data: unknown = null;
      const textBlock = content.find((c) => c.type === "text");
      if (textBlock && textBlock.text) {
        try {
          data = JSON.parse(textBlock.text);
        } catch {
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
