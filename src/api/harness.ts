import { getSharedClient, resetSharedClient, type OctToolResult } from "./octClient.ts";
import { getAskTimeoutMs } from "../config/runtimeConfig.ts";
import { wrapMessage } from "./instructions.ts";
import { LayoutSchema, type Layout } from "../content/schema.ts";

export type AskResult =
  | { ok: true; markdown: string; raw?: unknown }
  | {
      ok: false;
      error: string;
      kind: "offline" | "rate_limited" | "tool_error" | "timeout";
      retryAfter?: number;
    };

/** True when an object looks like a tool-result payload, not chat prose. */
function looksLikeToolPayload(obj: Record<string, unknown>): boolean {
  return (
    "layout" in obj ||
    "steps_executed" in obj ||
    "step_results" in obj ||
    Array.isArray(obj.data)
  );
}

/**
 * Pull markdown from a run_graph envelope.
 * Never dumps raw tool-result JSON (layout / steps) into the chat bubble.
 */
export function extractMarkdown(result: OctToolResult): string {
  const data = result.data;
  if (!data) return "";

  let extracted: any = data;

  if (typeof data === "object" && data !== null) {
    const obj = data as Record<string, any>;
    // Prefer summary/message when present (stable chat text).
    if (typeof obj.summary === "string" && obj.summary.trim()) {
      return obj.summary;
    }
    if (typeof obj.message === "string" && obj.message.trim()) {
      return obj.message;
    }
    if (obj.response) {
      const resp = obj.response;
      if (typeof resp === "object" && resp !== null) {
        if (typeof resp.summary === "string" && resp.summary.trim()) {
          return resp.summary;
        }
        if (typeof resp.message === "string" && resp.message.trim()) {
          return resp.message;
        }
        if (resp.message) {
          const msg = resp.message;
          if (typeof msg === "object" && msg !== null && msg.data !== undefined) {
            extracted = msg.data;
          } else if (typeof msg === "string") {
            extracted = msg;
          }
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
    const obj = extracted as Record<string, unknown>;
    if (looksLikeToolPayload(obj)) {
      if (typeof obj.summary === "string" && (obj.summary as string).trim()) {
        return obj.summary as string;
      }
      if (typeof obj.message === "string" && (obj.message as string).trim()) {
        return obj.message as string;
      }
      return "Done.";
    }
    return `\`\`\`json\n${JSON.stringify(extracted, null, 2)}\n\`\`\``;
  }
  return String(extracted);
}

/** Pull a candidate layout object from common run_graph envelope shapes. */
function findLayoutCandidate(data: unknown): unknown | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, any>;

  const candidates: unknown[] = [
    obj?.response?.carry?.layout,
    obj?.carry?.layout,
    obj?.response?.layout,
    obj?.layout,
    obj?.response?.working_memory?.layout,
    obj?.working_memory?.layout,
  ];

  // Multi-step envelopes sometimes park tool results under data / step_results.
  const bags = [obj?.data, obj?.step_results, obj?.response?.step_results, obj?.response?.data];
  for (const bag of bags) {
    if (Array.isArray(bag)) {
      for (let i = bag.length - 1; i >= 0; i--) {
        const entry = bag[i];
        if (!entry || typeof entry !== "object") continue;
        const e = entry as Record<string, unknown>;
        candidates.push(e.layout, (e.response as any)?.layout, (e.data as any)?.layout);
        // Bare layout object parked as the step result itself.
        if ((e as any).version === 1 && Array.isArray((e as any).blocks)) {
          candidates.push(e);
        }
      }
    } else if (bag && typeof bag === "object") {
      const b = bag as Record<string, unknown>;
      candidates.push(b.layout);
    }
  }

  for (const c of candidates) {
    if (c && typeof c === "object" && !Array.isArray(c)) {
      return c;
    }
  }
  return null;
}

/**
 * Best-effort layout from run_graph carry (agentic emit_layout / design_layout path).
 * Validates with LayoutSchema before returning — malformed agent JSON is dropped.
 */
export function extractCarryLayout(data: unknown): Layout | null {
  const candidate = findLayoutCandidate(data);
  if (!candidate) return null;
  const parsed = LayoutSchema.safeParse(candidate);
  if (!parsed.success) {
    // Surface why the agentic layout was dropped (silent null is hard to debug).
    console.warn(
      "[extractCarryLayout] layout failed LayoutSchema validation:",
      parsed.error.issues.slice(0, 5)
    );
    return null;
  }
  return parsed.data;
}

/** Theme id from a validated carry layout, if present. */
export function extractCarryTheme(layout: Layout | null | undefined): string | null {
  const theme = layout?.meta?.theme;
  return typeof theme === "string" && theme.trim() ? theme.trim() : null;
}

async function performCall(userMessage: string, sessionId: string): Promise<OctToolResult> {
  const client = await getSharedClient();
  // Idle budget from runtime config (public/config.json askTimeoutMs).
  // Passed through to MCP SDK RequestOptions; server keepalives reset the window.
  return await client.callTool(
    "run_graph",
    {
      user_message: wrapMessage(userMessage),
      session_id: sessionId,
      force_execute: true,
    },
    { timeoutMs: getAskTimeoutMs() }
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

/** True when run_graph paused for confidence/write confirmation. */
function isConfirmationNeeded(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, any>;
  const status = d.status ?? d.response?.status;
  return status === "confirmation_needed";
}

export async function askOct(userMessage: string, sessionId: string): Promise<AskResult> {
  try {
    let result = await performCall(userMessage, sessionId);
    if (result.isError) {
      const textBlock = result.content.find((c) => c.type === "text");
      const errMsg = textBlock?.text || "Unknown tool error";
      return { ok: false, error: errMsg, kind: "tool_error" };
    }
    // Portfolio has no MCP elicitation UI — auto-continue headless once.
    if (isConfirmationNeeded(result.data)) {
      result = await performCall(
        "Yes, proceed with the plan and finish the visitor's request.",
        sessionId
      );
      if (result.isError) {
        const textBlock = result.content.find((c) => c.type === "text");
        const errMsg = textBlock?.text || "Unknown tool error";
        return { ok: false, error: errMsg, kind: "tool_error" };
      }
      // Still stuck on confirm → surface a friendly line, not the raw Proceed prompt.
      if (isConfirmationNeeded(result.data)) {
        return {
          ok: true,
          markdown: "Still working on that — try rephrasing your question.",
          raw: result.data,
        };
      }
    }
    return { ok: true, markdown: extractMarkdown(result), raw: result.data };
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
      return { ok: true, markdown: extractMarkdown(result), raw: result.data };
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
