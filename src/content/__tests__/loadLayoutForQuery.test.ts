import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { loadBaked } from "../loadLayout";

vi.mock("../../config/runtimeConfig", () => ({
  getOctBaseUrl: vi.fn(),
}));

import { getOctBaseUrl } from "../../config/runtimeConfig";
import { loadLayoutForQuery } from "../loadLayout";

describe("loadLayoutForQuery", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.mocked(getOctBaseUrl).mockReturnValue("http://localhost:10000");
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it("falls back to baked snapshot when the base URL is unresolved (throws)", async () => {
    vi.mocked(getOctBaseUrl).mockImplementation(() => {
      throw new Error("runtime_config_not_loaded");
    });

    const result = await loadLayoutForQuery("show me your SRE work");
    expect(result.source).toBe("snapshot");
    expect(result.layout).toStrictEqual(loadBaked());
  });

  it("falls back to baked snapshot when the base URL is empty", async () => {
    vi.mocked(getOctBaseUrl).mockReturnValue("");

    const result = await loadLayoutForQuery("show me your SRE work");
    expect(result.source).toBe("snapshot");
    expect(result.layout).toStrictEqual(loadBaked());
  });

  it("returns the live layout on a successful fetch", async () => {
    const liveLayout = {
      version: 1,
      meta: { audience: "recruiter", generatedAt: "2026-07-16T00:00:00Z" },
      blocks: [],
    };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => liveLayout,
    }) as unknown as typeof fetch;

    const result = await loadLayoutForQuery("show me your SRE work");
    expect(result.source).toBe("live");
    expect(result.layout).toStrictEqual(liveLayout);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:10000/api/portfolio/public/layout-for-query?query=show%20me%20your%20SRE%20work",
      expect.any(Object)
    );
  });

  it("falls back to baked snapshot on a 400 (missing/invalid query)", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 400 }) as unknown as typeof fetch;

    const result = await loadLayoutForQuery("");
    expect(result.source).toBe("snapshot");
    expect(result.layout).toStrictEqual(loadBaked());
  });

  it("falls back to baked snapshot on a timeout/network error", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("network error")) as unknown as typeof fetch;

    const result = await loadLayoutForQuery("show me your SRE work");
    expect(result.source).toBe("snapshot");
    expect(result.layout).toStrictEqual(loadBaked());
  });

  it("falls back to baked snapshot when the response fails schema validation", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ not: "a valid layout" }),
    }) as unknown as typeof fetch;

    const result = await loadLayoutForQuery("show me your SRE work");
    expect(result.source).toBe("snapshot");
    expect(result.layout).toStrictEqual(loadBaked());
  });
});
