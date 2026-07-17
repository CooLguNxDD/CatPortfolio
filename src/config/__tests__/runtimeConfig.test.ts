import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  loadRuntimeConfig,
  getOctBaseUrl,
  getMcpApiKey,
  getAskTimeoutMs,
  resetRuntimeConfig,
  DEFAULT_ASK_TIMEOUT_MS,
} from "../runtimeConfig";

describe("runtimeConfig", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    resetRuntimeConfig();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it("resolves octBaseUrl from a successful /config.json fetch", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ octBaseUrl: "https://api.example.com" }),
    }) as unknown as typeof fetch;

    const config = await loadRuntimeConfig();
    expect(config.octBaseUrl).toBe("https://api.example.com");
    expect(getOctBaseUrl()).toBe("https://api.example.com");
  });

  it("falls back to VITE_OCT_URL when the fetch fails", async () => {
    vi.stubEnv("VITE_OCT_URL", "http://localhost:10000");
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("network error")) as unknown as typeof fetch;

    const config = await loadRuntimeConfig();
    expect(config.octBaseUrl).toBe("http://localhost:10000");
  });

  it("falls back to VITE_OCT_URL when the response is not ok", async () => {
    vi.stubEnv("VITE_OCT_URL", "http://localhost:10000");
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }) as unknown as typeof fetch;

    const config = await loadRuntimeConfig();
    expect(config.octBaseUrl).toBe("http://localhost:10000");
  });

  it("falls back to empty string when both config.json and env are absent", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ octBaseUrl: "" }),
    }) as unknown as typeof fetch;

    const config = await loadRuntimeConfig();
    expect(config.octBaseUrl).toBe("");
  });

  it("getOctBaseUrl throws before loadRuntimeConfig resolves", () => {
    expect(() => getOctBaseUrl()).toThrow("runtime_config_not_loaded");
  });

  it("resolves mcpApiKey from a successful /config.json fetch", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ octBaseUrl: "https://api.example.com", mcpApiKey: "octk_test123" }),
    }) as unknown as typeof fetch;

    await loadRuntimeConfig();
    expect(getMcpApiKey()).toBe("octk_test123");
  });

  it("falls back to VITE_OCT_API_KEY when config.json omits mcpApiKey", async () => {
    vi.stubEnv("VITE_OCT_API_KEY", "octk_env_fallback");
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ octBaseUrl: "https://api.example.com" }),
    }) as unknown as typeof fetch;

    await loadRuntimeConfig();
    expect(getMcpApiKey()).toBe("octk_env_fallback");
  });

  it("getMcpApiKey throws before loadRuntimeConfig resolves", () => {
    expect(() => getMcpApiKey()).toThrow("runtime_config_not_loaded");
  });

  it("resolves askTimeoutMs from a successful /config.json fetch", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ octBaseUrl: "https://api.example.com", askTimeoutMs: 300000 }),
    }) as unknown as typeof fetch;

    const config = await loadRuntimeConfig();
    expect(config.askTimeoutMs).toBe(300000);
    expect(getAskTimeoutMs()).toBe(300000);
  });

  it("falls back to DEFAULT_ASK_TIMEOUT_MS when config omits askTimeoutMs", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ octBaseUrl: "https://api.example.com" }),
    }) as unknown as typeof fetch;

    const config = await loadRuntimeConfig();
    expect(config.askTimeoutMs).toBe(DEFAULT_ASK_TIMEOUT_MS);
    expect(getAskTimeoutMs()).toBe(DEFAULT_ASK_TIMEOUT_MS);
  });

  it("falls back to VITE_ASK_TIMEOUT_MS when config omits askTimeoutMs", async () => {
    vi.stubEnv("VITE_ASK_TIMEOUT_MS", "180000");
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ octBaseUrl: "https://api.example.com" }),
    }) as unknown as typeof fetch;

    const config = await loadRuntimeConfig();
    expect(config.askTimeoutMs).toBe(180000);
  });

  it("ignores invalid askTimeoutMs and uses the fallback", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ octBaseUrl: "https://api.example.com", askTimeoutMs: -5 }),
    }) as unknown as typeof fetch;

    const config = await loadRuntimeConfig();
    expect(config.askTimeoutMs).toBe(DEFAULT_ASK_TIMEOUT_MS);
  });

  it("getAskTimeoutMs returns default before loadRuntimeConfig resolves", () => {
    expect(getAskTimeoutMs()).toBe(DEFAULT_ASK_TIMEOUT_MS);
  });

  it("caches the result across repeated loadRuntimeConfig calls", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ octBaseUrl: "https://api.example.com" }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await loadRuntimeConfig();
    await loadRuntimeConfig();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
