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
  // Tests below assert on mcpApiKey/askTimeoutMs resolution, not the origin
  // allowlist itself — stub VITE_OCT_URL to the same origin config.json's
  // octBaseUrl uses so those assertions aren't tangled up with the allowlist
  // added to guard against a compromised config.json (see the dedicated
  // "origin allowlist" tests below for that behavior).
  beforeEach(() => {
    resetRuntimeConfig();
    vi.stubEnv("VITE_OCT_URL", "https://api.example.com");
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
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${import.meta.env.BASE_URL}config.json`,
      expect.anything(),
    );
    expect(config.octBaseUrl).toBe("https://api.example.com");
    expect(getOctBaseUrl()).toBe("https://api.example.com");
  });

  describe("origin allowlist", () => {
    it("accepts an octBaseUrl whose origin matches the build-time VITE_OCT_URL origin", async () => {
      vi.stubEnv("VITE_OCT_URL", "https://trusted.example.com");
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        // Same origin as VITE_OCT_URL, different path — origin match is what matters.
        json: async () => ({ octBaseUrl: "https://trusted.example.com/oct" }),
      }) as unknown as typeof fetch;

      const config = await loadRuntimeConfig();
      expect(config.octBaseUrl).toBe("https://trusted.example.com/oct");
    });

    it("rejects an octBaseUrl on a foreign origin and falls back instead of trusting it", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.stubEnv("VITE_OCT_URL", "https://trusted.example.com");
      vi.stubEnv("VITE_OCT_API_KEY", "");
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          octBaseUrl: "https://evil.example.com",
          mcpApiKey: "octk_should_not_leak_here",
        }),
      }) as unknown as typeof fetch;

      const config = await loadRuntimeConfig();
      expect(config.octBaseUrl).not.toBe("https://evil.example.com");
      expect(getMcpApiKey()).not.toBe("octk_should_not_leak_here");
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });

    it("still rejects a non-http(s) scheme even on an otherwise-allowlisted host", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.stubEnv("VITE_OCT_URL", "https://trusted.example.com");
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ octBaseUrl: "javascript:alert(1)" }),
      }) as unknown as typeof fetch;

      const config = await loadRuntimeConfig();
      expect(config.octBaseUrl).not.toBe("javascript:alert(1)");
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });
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
    vi.stubEnv("VITE_OCT_URL", "");
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

  it("ignores mcpApiKey in config.json and uses the build-time env key instead", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("VITE_OCT_API_KEY", "octk_env_fallback");
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ octBaseUrl: "https://api.example.com", mcpApiKey: "octk_test123" }),
    }) as unknown as typeof fetch;

    await loadRuntimeConfig();
    expect(getMcpApiKey()).toBe("octk_env_fallback");
    expect(getMcpApiKey()).not.toBe("octk_test123");
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("leaves mcpApiKey empty when config.json plants a key and env is unset", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("VITE_OCT_API_KEY", "");
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ octBaseUrl: "https://api.example.com", mcpApiKey: "octk_should_not_leak_here" }),
    }) as unknown as typeof fetch;

    await loadRuntimeConfig();
    expect(getMcpApiKey()).toBe("");
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("uses VITE_OCT_API_KEY when config.json omits mcpApiKey", async () => {
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
