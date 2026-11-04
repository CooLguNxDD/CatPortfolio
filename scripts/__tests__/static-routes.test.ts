import { describe, expect, it } from "vitest"
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { STATIC_ROUTES, writeStaticRoutes } from "../static-routes.mjs"

describe("static route pages", () => {
  it("copies index.html into each route folder", () => {
    const dist = mkdtempSync(join(tmpdir(), "static-routes-"))
    writeFileSync(join(dist, "index.html"), "<!doctype html><title>app</title>")
    expect(writeStaticRoutes(dist)).toEqual(STATIC_ROUTES.map((route) => `${route}/index.html`))
    for (const route of STATIC_ROUTES) {
      expect(readFileSync(join(dist, route, "index.html"), "utf8")).toBe("<!doctype html><title>app</title>")
    }
  })
  it("fails loudly without a build", () => {
    expect(() => writeStaticRoutes(mkdtempSync(join(tmpdir(), "static-routes-empty-")))).toThrow(/run vite build first/)
  })
  it("covers every static path in the router", () => {
    const paths = [...readFileSync("src/router.tsx", "utf8").matchAll(/path: "\/([^"]+)"/g)].map((m) => m[1])
    expect([...STATIC_ROUTES].sort()).toEqual(paths.sort())
  })
})
