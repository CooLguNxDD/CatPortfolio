import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../config/runtimeConfig", () => ({
  getOctBaseUrl: vi.fn(),
}));

import { getOctBaseUrl } from "../../config/runtimeConfig";
import { fetchAgentStatus } from "../agentStatus";

describe("fetchAgentStatus", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.mocked(getOctBaseUrl).mockReturnValue("http://localhost:10000");
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it("returns null when the base URL is unresolved (throws)", async () => {
    vi.mocked(getOctBaseUrl).mockImplementation(() => {
      throw new Error("runtime_config_not_loaded");
    });

    expect(await fetchAgentStatus()).toBeNull();
  });

  it("returns null when the base URL is empty", async () => {
    vi.mocked(getOctBaseUrl).mockReturnValue("");
    expect(await fetchAgentStatus()).toBeNull();
  });

  it("returns the activity payload on a successful fetch", async () => {
    const activity = { job_id: "job_789", status: "submitted", updated_at: "2026-07-16T09:00:00+00:00" };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ok", activity }),
    }) as unknown as typeof fetch;

    const result = await fetchAgentStatus();
    expect(result).toEqual(activity);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:10000/api/portfolio/public/agent-status",
      expect.any(Object)
    );
  });

  it("includes job_id in the query string when given", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ok", activity: null }),
    }) as unknown as typeof fetch;

    await fetchAgentStatus({ jobId: "job_789" });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:10000/api/portfolio/public/agent-status?job_id=job_789",
      expect.any(Object)
    );
  });

  it("returns null when activity is null", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ok", activity: null }),
    }) as unknown as typeof fetch;

    expect(await fetchAgentStatus()).toBeNull();
  });

  it("throws on a non-ok response so the pill can stop polling", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 503 }) as unknown as typeof fetch;
    await expect(fetchAgentStatus()).rejects.toThrow("agent-status 503");
  });

  it("returns null on a network error", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("network error")) as unknown as typeof fetch;
    expect(await fetchAgentStatus()).toBeNull();
  });
});
