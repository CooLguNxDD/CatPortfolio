import { describe, it, expect, vi, beforeEach } from "vitest";

// Fake MCP SDK Client — lets us drive connect()/callTool()/close() outcomes
// without a real transport, and to reuse the SAME mock instance returned by
// every `new Client(...)` call so tests can assert against it.
const mockClientInstance = {
  connect: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
  callTool: vi.fn(),
  getServerCapabilities: vi.fn().mockReturnValue({}),
  getServerVersion: vi.fn().mockReturnValue({ name: "test", version: "1" }),
  getInstructions: vi.fn().mockReturnValue(undefined),
};

vi.mock("@modelcontextprotocol/sdk/client/index.js", () => ({
  // A constructor function returning an object makes `new Client(...)` yield
  // that object instead of `this` — lets every call share one mock instance.
  Client: vi.fn().mockImplementation(function () {
    return mockClientInstance;
  }),
}));

vi.mock("@modelcontextprotocol/sdk/client/streamableHttp.js", () => ({
  // Arrow functions can't be `new`-ed — use a real (empty) constructor function.
  StreamableHTTPClientTransport: vi.fn().mockImplementation(function () {}),
}));

vi.mock("../../config/runtimeConfig", () => ({
  getOctBaseUrl: vi.fn().mockReturnValue("http://localhost:10000"),
  getMcpApiKey: vi.fn().mockReturnValue("test-key"),
}));

import { OctClient, getSharedClient, resetSharedClient } from "../octClient";

describe("OctClient", () => {
  beforeEach(() => {
    // Clear any leftover shared client from the previous test first, then
    // reset mock call counts — otherwise that cleanup close() call would be
    // attributed to the next test's assertions.
    resetSharedClient();
    vi.clearAllMocks();
    mockClientInstance.connect.mockResolvedValue(undefined);
    mockClientInstance.close.mockResolvedValue(undefined);
  });

  describe("callTool abort handling", () => {
    it("does not reset the shared client when the caller's own signal was aborted", async () => {
      const shared = await getSharedClient();
      const controller = new AbortController();
      controller.abort();
      mockClientInstance.callTool.mockRejectedValue(new DOMException("Aborted", "AbortError"));

      await expect(
        shared.callTool("run_graph", {}, { signal: controller.signal }),
      ).rejects.toThrow();

      // The shared singleton must survive — close() should not have been
      // called as a side effect of the caller's own abort.
      expect(mockClientInstance.close).not.toHaveBeenCalled();
      const stillShared = await getSharedClient();
      expect(stillShared).toBe(shared);
    });

    it("resets the shared client on a genuine (non-abort) failure", async () => {
      const shared = await getSharedClient();
      mockClientInstance.callTool.mockRejectedValue(new Error("connection reset"));

      await expect(shared.callTool("run_graph", {})).rejects.toThrow("connection reset");

      // No caller signal was aborted, so this is a real transport failure —
      // the shared client should have been torn down.
      expect(mockClientInstance.close).toHaveBeenCalledTimes(1);
    });
  });

  describe("getSharedClient", () => {
    it("reuses the same instance across calls while connected", async () => {
      const a = await getSharedClient();
      const b = await getSharedClient();
      expect(a).toBe(b);
      expect(mockClientInstance.connect).toHaveBeenCalledTimes(1);
    });

    it("creates a fresh client after resetSharedClient", async () => {
      const a = await getSharedClient();
      resetSharedClient();
      const b = await getSharedClient();
      expect(a).not.toBe(b);
    });
  });

  describe("connect()", () => {
    it("clears connectPromise after a failed connect so a later call can retry", async () => {
      mockClientInstance.connect.mockRejectedValueOnce(new Error("network down"));
      const client = new OctClient("http://localhost:10000/mcp");

      await expect(client.connect()).rejects.toThrow("network down");
      expect(client.isConnected()).toBe(false);

      // A retried connect should actually attempt again, not hang on a stale
      // in-flight promise from the failed attempt.
      mockClientInstance.connect.mockResolvedValueOnce(undefined);
      await client.connect();
      expect(client.isConnected()).toBe(true);
      expect(mockClientInstance.connect).toHaveBeenCalledTimes(2);
    });
  });
});
