import { getSharedClient, resetSharedClient, type OctToolResult } from "./octClient.ts";
import { wrapMessage } from "./instructions.ts";

export type AskResult =
  | { ok: true; markdown: string }
  | {
      ok: false;
      error: string;
      kind: "offline" | "rate_limited" | "tool_error" | "timeout";
      retryAfter?: number;
    };

export function extractMarkdown(result: OctToolResult): string {
  const data = result.data;
  if (!data) return "";

  let extracted: any = data;

  if (typeof data === "object" && data !== null) {
    const obj = data as Record<string, any>;
    if (obj.response) {
      const resp = obj.response;
      if (typeof resp === "object" && resp !== null && resp.message) {
        const msg = resp.message;
        if (typeof msg === "object" && msg !== null && msg.data !== undefined) {
          extracted = msg.data;
        } else if (typeof msg === "string") {
          extracted = msg;
        }
      } else if (typeof resp === "string") {
        extracted = resp;
      }
    }
  }

  if (typeof extracted === "string") {
    return extracted;
  }
  if (typeof extracted === "object" && extracted !== null) {
    return `\`\`\`json\n${JSON.stringify(extracted, null, 2)}\n\`\`\``;
  }
  return String(extracted);
}

async function performCall(userMessage: string, sessionId: string): Promise<OctToolResult> {
  const client = await getSharedClient();
  return await client.callTool(
    "run_graph",
    {
      user_message: wrapMessage(userMessage),
      session_id: sessionId,
      force_execute: true,
    },
    { timeoutMs: 30000 }
  );
}

function parseRateLimit(err: any): { isRateLimit: boolean; retryAfter?: number } {
  const msg = String(err?.message || err).toLowerCase();
  const status = err?.status || err?.statusCode || err?.response?.status;

  if (status === 429 || msg.includes("429") || msg.includes("rate_limited") || msg.includes("rate limit")) {
    let retryAfter: number | undefined;
    const match = msg.match(/(?:retry-after|retry_after)[:\s]+(\d+)/) || msg.match(/after\s+(\d+)\s+seconds/);
    if (match) {
      retryAfter = parseInt(match[1], 10);
    }
    return { isRateLimit: true, retryAfter };
  }
  return { isRateLimit: false };
}

export async function askOct(userMessage: string, sessionId: string): Promise<AskResult> {
  try {
    const result = await performCall(userMessage, sessionId);
    if (result.isError) {
      const textBlock = result.content.find((c) => c.type === "text");
      const errMsg = textBlock?.text || "Unknown tool error";
      return { ok: false, error: errMsg, kind: "tool_error" };
    }
    return { ok: true, markdown: extractMarkdown(result) };
  } catch (err: any) {
    const msg = String(err?.message || err);

    if (msg.includes("oct_unconfigured")) {
      return { ok: false, error: "OCT server is unconfigured.", kind: "offline" };
    }

    const rateLimitCheck = parseRateLimit(err);
    if (rateLimitCheck.isRateLimit) {
      return {
        ok: false,
        error: "Rate limit exceeded. Please try again later.",
        kind: "rate_limited",
        retryAfter: rateLimitCheck.retryAfter,
      };
    }

    if (msg.includes("timeout")) {
      return { ok: false, error: "Request timed-out.", kind: "timeout" };
    }

    // Connect/network fail -> retry once
    try {
      resetSharedClient();
      const result = await performCall(userMessage, sessionId);
      if (result.isError) {
        const textBlock = result.content.find((c) => c.type === "text");
        const errMsg = textBlock?.text || "Unknown tool error";
        return { ok: false, error: errMsg, kind: "tool_error" };
      }
      return { ok: true, markdown: extractMarkdown(result) };
    } catch (retryErr: any) {
      const retryMsg = String(retryErr?.message || retryErr);

      const rateLimitCheckRetry = parseRateLimit(retryErr);
      if (rateLimitCheckRetry.isRateLimit) {
        return {
          ok: false,
          error: "Rate limit exceeded. Please try again later.",
          kind: "rate_limited",
          retryAfter: rateLimitCheckRetry.retryAfter,
        };
      }

      if (retryMsg.includes("timeout")) {
        return { ok: false, error: "Request timed-out.", kind: "timeout" };
      }

      return { ok: false, error: "OCT server is offline or connection failed.", kind: "offline" };
    }
  }
}
