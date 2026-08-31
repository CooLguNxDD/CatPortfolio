import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../../config/runtimeConfig", () => ({
  getOctBaseUrl: vi.fn(),
}))

import { getOctBaseUrl } from "../../config/runtimeConfig"
import {
  LIVE_LAYOUT_TIMEOUT_MS,
  loadBaked,
  loadLiveWithStatus,
} from "../loadLayout"

describe("loadLiveWithStatus URL", () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.mocked(getOctBaseUrl).mockReturnValue("http://localhost:11000")
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.clearAllMocks()
  })

  it("hits /api/portfolio/public/layout with tank=1", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => loadBaked(),
    }) as unknown as typeof fetch

    const result = await loadLiveWithStatus("default")
    expect(result.source).toBe("live")
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:11000/api/portfolio/public/layout?audience=default&tank=1",
      expect.any(Object),
    )
    expect(LIVE_LAYOUT_TIMEOUT_MS).toBeGreaterThanOrEqual(15_000)
  })
})
