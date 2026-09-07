import { describe, it, expect, vi, beforeEach } from "vitest";

const mockClientInstance = {
  connect: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
  callTool: vi.fn(),
  getServerCapabilities: vi.fn().mockReturnValue({}),
  getServerVersion: vi.fn().mockReturnValue({ name: "test", version: "1" }),
  getInstructions: vi.fn().mockReturnValue(undefined),
};

vi.mock("@modelcontextprotocol/sdk/client/index.js", () => ({
  Client: vi.fn().mockImplementation(function () {
    return mockClientInstance;
  }),
}));

vi.mock("@modelcontextprotocol/sdk/client/streamableHttp.js", () => ({
  StreamableHTTPClientTransport: vi.fn().mockImplementation(function () {}),
}));

vi.mock("../../config/runtimeConfig", () => ({
  getWhiskersBaseUrl: vi.fn().mockReturnValue("http://localhost:10000"),
  getOctBaseUrl: vi.fn().mockReturnValue("http://localhost:10000"),
  getMcpApiKey: vi.fn().mockReturnValue("test-key"),
}));

import { getSharedWhiskersClient, resetSharedWhiskersClient } from "../whiskersClient";

describe("WhiskersClient", () => {
  beforeEach(() => {
    resetSharedWhiskersClient();
    vi.clearAllMocks();
    mockClientInstance.connect.mockResolvedValue(undefined);
    mockClientInstance.close.mockResolvedValue(undefined);
  });

  describe("callTool abort handling", () => {
    it("does not reset the shared client when the caller's own signal was aborted", async () => {
      const shared = await getSharedWhiskersClient();
      const controller = new AbortController();
      controller.abort();
      mockClientInstance.callTool.mockRejectedValue(new DOMException("Aborted", "AbortError"));

      await expect(
        shared.callTool("run_graph", {}, { signal: controller.signal }),
      ).rejects.toThrow();

      expect(mockClientInstance.close).not.toHaveBeenCalled();
      const stillShared = await getSharedWhiskersClient();
      expect(stillShared).toBe(shared);
    });

    it("resets the shared client on a genuine (non-abort) failure", async () => {
      const shared = await getSharedWhiskersClient();
      mockClientInstance.callTool.mockRejectedValue(new Error("transport dead"));

      await expect(shared.callTool("run_graph")).rejects.toThrow("transport dead");

      expect(mockClientInstance.close).toHaveBeenCalledTimes(1);
    });
  });

  describe("getSharedWhiskersClient", () => {
    it("reuses the same instance across calls while connected", async () => {
      const a = await getSharedWhiskersClient();
      const b = await getSharedWhiskersClient();
      expect(a).toBe(b);
      expect(mockClientInstance.connect).toHaveBeenCalledTimes(1);
    });

    it("creates a fresh client after resetSharedWhiskersClient", async () => {
      const a = await getSharedWhiskersClient();
      resetSharedWhiskersClient();
      const b = await getSharedWhiskersClient();
      expect(a).not.toBe(b);
      expect(mockClientInstance.connect).toHaveBeenCalledTimes(2);
    });

    it("clears connectPromise after a failed connect so a later call can retry", async () => {
      mockClientInstance.connect.mockRejectedValueOnce(new Error("dial tcp: refused"));

      await expect(getSharedWhiskersClient()).rejects.toThrow("dial tcp: refused");

      mockClientInstance.connect.mockResolvedValue(undefined);
      const second = await getSharedWhiskersClient();
      expect(second.isConnected()).toBe(true);
      expect(mockClientInstance.connect).toHaveBeenCalledTimes(2);
    });
  });
});
