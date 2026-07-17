import { describe, it, expect, vi, beforeEach } from "vitest";
import { wrapMessage, CHAT_INSTRUCTIONS } from "../instructions";
import { extractMarkdown, askOct } from "../harness";
import { getSharedClient, resetSharedClient } from "../octClient";
import { getAskTimeoutMs } from "../../config/runtimeConfig";

vi.mock("../octClient", () => {
  const mockClient = {
    connect: vi.fn(),
    close: vi.fn(),
    isConnected: vi.fn().mockReturnValue(true),
    ping: vi.fn(),
    listTools: vi.fn(),
    callTool: vi.fn(),
  };
  return {
    getSharedClient: vi.fn().mockResolvedValue(mockClient),
    resetSharedClient: vi.fn(),
    octBaseUrl: vi.fn().mockReturnValue("http://localhost:10000"),
  };
});

vi.mock("../../config/runtimeConfig", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../config/runtimeConfig")>();
  return {
    ...actual,
    getAskTimeoutMs: vi.fn().mockReturnValue(120_000),
  };
});

describe("Harness tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("wrapMessage includes custom instructions and user message", () => {
    const wrapped = wrapMessage("hello");
    expect(wrapped).toContain(CHAT_INSTRUCTIONS);
    expect(wrapped).toContain("hello");
  });

  describe("extractMarkdown", () => {
    it("handles response.message.data envelope", () => {
      const result = {
        data: {
          response: {
            message: {
              data: "hello from agent",
            },
          },
        },
        content: [],
        isError: false,
      };
      expect(extractMarkdown(result)).toBe("hello from agent");
    });

    it("handles response string envelope", () => {
      const result = {
        data: {
          response: "hello string response",
        },
        content: [],
        isError: false,
      };
      expect(extractMarkdown(result)).toBe("hello string response");
    });

    it("handles raw string data", () => {
      const result = {
        data: "hello raw text",
        content: [],
        isError: false,
      };
      expect(extractMarkdown(result)).toBe("hello raw text");
    });

    it("handles object data with JSON fencing", () => {
      const result = {
        data: { foo: "bar" },
        content: [],
        isError: false,
      };
      const formatted = extractMarkdown(result);
      expect(formatted).toContain("```json");
      expect(formatted).toContain('"foo": "bar"');
      expect(formatted).toContain("```");
    });

    it("does not JSON-dump tool payloads with layout keys", () => {
      const result = {
        data: {
          layout: { blocks: [] },
          steps_executed: 2,
        },
        content: [],
        isError: false,
      };
      expect(extractMarkdown(result)).toBe("Done.");
    });

    it("prefers response.summary over nested tool blobs", () => {
      const result = {
        data: {
          response: {
            summary: "Here is Andrew's SRE work.",
            carry: { layout: { blocks: [{ type: "hero" }] } },
          },
        },
        content: [],
        isError: false,
      };
      expect(extractMarkdown(result)).toBe("Here is Andrew's SRE work.");
    });
  });

  describe("askOct", () => {
    it("auto-continues once on confirmation_needed", async () => {
      const mockClient = await getSharedClient();
      vi.mocked(mockClient.callTool)
        .mockResolvedValueOnce({
          data: {
            status: "confirmation_needed",
            message: "I'll run 1 step(s). Confidence: 69%. Proceed?",
          },
          content: [],
          isError: false,
        })
        .mockResolvedValueOnce({
          data: { response: { summary: "Here is the SRE work." } },
          content: [],
          isError: false,
        });

      const res = await askOct("show SRE", "session-123");
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.markdown).toBe("Here is the SRE work.");
      }
      expect(mockClient.callTool).toHaveBeenCalledTimes(2);
      expect(mockClient.callTool).toHaveBeenLastCalledWith(
        "run_graph",
        expect.objectContaining({
          force_execute: true,
          user_message: expect.stringContaining("proceed"),
        }),
        expect.anything()
      );
    });

    it("success path returns markdown", async () => {
      const mockClient = await getSharedClient();
      vi.mocked(mockClient.callTool).mockResolvedValue({
        data: "agent answer",
        content: [{ type: "text", text: "agent answer" }],
        isError: false,
      });

      const res = await askOct("question", "session-123");
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.markdown).toBe("agent answer");
      }
      expect(mockClient.callTool).toHaveBeenCalledWith(
        "run_graph",
        expect.objectContaining({
          user_message: expect.stringContaining("question"),
          session_id: "session-123",
          force_execute: true,
        }),
        { timeoutMs: getAskTimeoutMs() }
      );
    });

    it("passes configurable askTimeoutMs to callTool", async () => {
      vi.mocked(getAskTimeoutMs).mockReturnValue(300_000);
      const mockClient = await getSharedClient();
      vi.mocked(mockClient.callTool).mockResolvedValue({
        data: "ok",
        content: [],
        isError: false,
      });

      await askOct("question", "session-123");
      expect(mockClient.callTool).toHaveBeenCalledWith(
        "run_graph",
        expect.any(Object),
        { timeoutMs: 300_000 }
      );
    });

    it("tool error gets mapped correctly", async () => {
      const mockClient = await getSharedClient();
      vi.mocked(mockClient.callTool).mockResolvedValue({
        data: null,
        content: [{ type: "text", text: "database error" }],
        isError: true,
      });

      const res = await askOct("question", "session-123");
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.kind).toBe("tool_error");
        expect(res.error).toBe("database error");
      }
    });

    it("rate limit 429 error gets mapped with retry-after", async () => {
      const mockClient = await getSharedClient();
      vi.mocked(mockClient.callTool).mockRejectedValue({
        message: "Request failed with status code 429. Please try again after 15 seconds.",
        status: 429,
      });

      const res = await askOct("question", "session-123");
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.kind).toBe("rate_limited");
        expect(res.retryAfter).toBe(15);
      }
    });

    it("timeout error gets mapped correctly", async () => {
      const mockClient = await getSharedClient();
      vi.mocked(mockClient.callTool).mockRejectedValue(new Error("request timeout"));

      const res = await askOct("question", "session-123");
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.kind).toBe("timeout");
      }
    });

    it("connect error retries once before failing", async () => {
      const mockClient = await getSharedClient();
      vi.mocked(mockClient.callTool)
        .mockRejectedValueOnce(new Error("failed to connect"))
        .mockResolvedValueOnce({
          data: "agent answer after retry",
          content: [],
          isError: false,
        });

      const res = await askOct("question", "session-123");
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.markdown).toBe("agent answer after retry");
      }
      expect(resetSharedClient).toHaveBeenCalledTimes(1);
    });

    it("connect error fails completely after failed retry", async () => {
      const mockClient = await getSharedClient();
      vi.mocked(mockClient.callTool)
        .mockRejectedValueOnce(new Error("failed to connect"))
        .mockRejectedValueOnce(new Error("still failed to connect"));

      const res = await askOct("question", "session-123");
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.kind).toBe("offline");
      }
      expect(resetSharedClient).toHaveBeenCalledTimes(1);
    });
  });
});
