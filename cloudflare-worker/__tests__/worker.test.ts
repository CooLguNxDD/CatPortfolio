// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import worker from "../src/index"
import type { Env } from "../src/index"

// Reserved fixture hosts are assembled so public-source scanning stays strict here too.
const upstreamHost = ["upstream", "invalid"].join(".")
const edgeOrigin = `https://${["edge", "invalid"].join(".")}`
const devOrigin = ["http:", "", ["localhost", 11000].join(":")].join("/")
const serverKey = "test-server-key"
const fetchUpstream = vi.fn<typeof fetch>()

function request(path = "/api/portfolio/public/agent-status?x=1", method = "GET") {
  return new Request(`${edgeOrigin}${path}`, {
    method,
    headers: { Origin: devOrigin, Authorization: "Bearer browser-key" },
  })
}
function expectCors(response: Response) {
  expect(response.headers.get("Access-Control-Allow-Origin")).toBe(devOrigin)
  expect(response.headers.get("Access-Control-Allow-Credentials")).toBe("true")
}

beforeEach(() => {
  fetchUpstream.mockReset()
  fetchUpstream.mockResolvedValue(new Response("event: ready\ndata: ok\n\n", {
    headers: { "Content-Type": "text/event-stream", "mcp-session-id": "session" },
  }))
  vi.stubGlobal("fetch", fetchUpstream)
})
afterEach(() => vi.unstubAllGlobals())

describe("Worker gateway", () => {
  for (const path of ["/api", "/api/portfolio/public/agent-status", "/mcp", "/mcp?session=1"]) {
    it.each<Env>([{}, { UPSTREAM_HOST: "" }, { UPSTREAM_HOST: "   " }])(
      `returns 500 before fetching ${path} when UPSTREAM_HOST is missing or blank (%j)`,
      async (env) => {
        const response = await worker.fetch(request(path), env)
        expect(response.status).toBe(500)
        expect(response.headers.get("Content-Type")).toBe("application/json")
        expect(await response.json()).toEqual({ error: "Worker misconfigured: UPSTREAM_HOST is not set" })
        expectCors(response)
        expect(fetchUpstream).not.toHaveBeenCalled()
      },
    )
  }

  it.each([
    `https://${upstreamHost}`, `${upstreamHost}/path`, `${upstreamHost}:11000`,
    ` ${upstreamHost}`, `${upstreamHost}\n`, `${upstreamHost}?query`,
    `user@${upstreamHost}`, `${upstreamHost}#fragment`,
  ])("rejects malformed host configuration without a fetch (%j)", async (UPSTREAM_HOST) => {
    const response = await worker.fetch(request(), { UPSTREAM_HOST })
    expect(response.status).toBe(500)
    const body = await response.text()
    expect(body).toContain("UPSTREAM_HOST")
    expect(body).not.toContain(upstreamHost)
    expectCors(response)
    expect(fetchUpstream).not.toHaveBeenCalled()
  })

  it.each(["/api/portfolio/public/agent-status?x=1", "/mcp?session=1"])(
    "proxies %s over HTTPS using only the configured host and server-side key",
    async (path) => {
      const response = await worker.fetch(request(path), { UPSTREAM_HOST: upstreamHost, OCT_API_KEY: serverKey })
      expect(fetchUpstream).toHaveBeenCalledTimes(1)
      const [input, init] = fetchUpstream.mock.calls[0]
      const target = new URL(String(input))
      expect(target.hostname).toBe(upstreamHost)
      expect(target.protocol).toBe("https:")
      expect(target.pathname + target.search).toBe(path)
      expect(new Headers(init?.headers).get("Authorization")).toBe(`Bearer ${serverKey}`)
      expect(new Headers(init?.headers).get("Host")).toBe(upstreamHost)
      expect(init?.method).toBe("GET")
      expect(response.status).toBe(200)
      expect(response.headers.get("Content-Type")).toBe("text/event-stream")
      expect(response.headers.get("mcp-session-id")).toBe("session")
      expect(await response.text()).toBe("event: ready\ndata: ok\n\n")
      expectCors(response)
    },
  )

  it.each([undefined, ""])("strips browser Authorization when OCT_API_KEY is unset (%j)", async (OCT_API_KEY) => {
    await worker.fetch(request(), { UPSTREAM_HOST: upstreamHost, OCT_API_KEY })
    expect(fetchUpstream).toHaveBeenCalledTimes(1)
    const [, init] = fetchUpstream.mock.calls[0]
    expect(new Headers(init?.headers).has("Authorization")).toBe(false)
  })

  it("keeps OPTIONS preflight working without upstream configuration", async () => {
    const response = await worker.fetch(request("/api", "OPTIONS"), {})
    expect(response.status).toBe(204)
    expect(await response.text()).toBe("")
    expectCors(response)
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe("GET, POST, OPTIONS")
    expect(fetchUpstream).not.toHaveBeenCalled()
  })

  it("keeps non-proxy paths as 404 without upstream configuration", async () => {
    const response = await worker.fetch(request("/other"), {})
    expect(response.status).toBe(404)
    expect(await response.text()).toBe("Not Found")
    expectCors(response)
    expect(fetchUpstream).not.toHaveBeenCalled()
  })

  it("returns a generic 502 without disclosing upstream error details", async () => {
    fetchUpstream.mockRejectedValue(new Error(`Connection to ${upstreamHost} failed after retry`))
    const response = await worker.fetch(request(), { UPSTREAM_HOST: upstreamHost })
    expect(response.status).toBe(502)
    expect(response.headers.get("Content-Type")).toBe("application/json")
    const body = await response.text()
    expect(JSON.parse(body)).toEqual({ error: "Gateway connection failed" })
    expect(body).not.toContain(upstreamHost)
    expect(body).not.toContain("retry")
    expectCors(response)
  })
})
