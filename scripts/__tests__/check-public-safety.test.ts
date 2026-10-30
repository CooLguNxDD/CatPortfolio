import { afterEach, describe, expect, it } from "vitest"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { spawnSync } from "node:child_process"
import { scanText } from "../check-public-safety.mjs"

const dirs: string[] = []
afterEach(() => dirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })))
function scan(text: string) {
  const dir = mkdtempSync(join(tmpdir(), "public-safety-"))
  dirs.push(dir)
  const file = join(dir, "sample.txt")
  writeFileSync(file, text)
  return spawnSync(process.execPath, [resolve("scripts/check-public-safety.mjs"), "--files", file], { encoding: "utf8" })
}

describe("public safety CLI", () => {
  it.each([
    ["IPv4", ["10", "21", "3", "4"].join(".")],
    ["IPv4", ["127", "0", "0", "1"].join(".")],
    ["host:port", "private-backend" + ":8443"],
    ["host:port", "localhost" + ":4321"],
    ["hostname", "backend-example" + ".net"],
    ["hostname", "backend-example" + ".sh"],
    ["hostname", ["https:", "", "backend-example" + ".unusual/path"].join("/")],
    ["hostname", "github.com" + ".untrusted.net"],
    ["hostname", ["https:", "", "github.com@" + "untrusted" + ".net"].join("/")],
    ["secret", "sk-" + "a".repeat(32)],
    ["secret", "sk-ant-" + "a".repeat(32)],
    ["secret", "ghp_" + "A".repeat(36)],
    ["secret", "github_pat_" + "A".repeat(40)],
    ["secret", "AKIA" + "A".repeat(16)],
    ["secret", "xoxb-" + "1234567890-abcdefghijk"],
    ["secret", "xoxp-" + "1234567890-abcdefghijk"],
    ["secret", "-----BEGIN " + "RSA PRIVATE KEY-----"],
    ["secret", "Bearer " + "a".repeat(40)],
    ["secret", 'api_key = "' + "a".repeat(20) + '"'],
    ["secret", '"api-key": "' + "b".repeat(20) + '"'],
  ])("flags %s without echoing the sensitive value", (rule, sample) => {
    const result = scan("safe first line\n" + sample)
    expect(result.status).toBe(1)
    expect(result.stdout + result.stderr).toContain(`sample.txt:2: ${rule}`)
    expect(result.stdout + result.stderr).not.toContain(sample)
  })

  it("accepts clean prose, module paths, property access, standards and approved links", () => {
    const result = scan("A human always reviews and submits.\nhttps://github.com/example/project\nhttp://www.w3.org/2000/svg\nsrc/content/pipeline.json\nobject.position.x = 3.7;\n")
    expect(result.status).toBe(0)
    expect(result.stdout).toContain("clean")
  })

  it("keeps source and build rules strict without treating language syntax as endpoints", () => {
    const ip = ["10", "21", "3", "4"].join(".")
    const endpoint = "private-host" + ":9"
    const url = ["https:", "", "private-host" + ".net"].join("/")
    for (const path of ["src/routes/sample.ts", "dist/assets/sample.js"]) {
      expect(scanText(`const upstream = "${endpoint}"`, path).join()).toContain("host:port")
      expect(scanText(`const upstream = "${url}"`, path).join()).toContain("hostname")
      expect(scanText(`const upstream = "${ip}"`, path).join()).toContain("IPv4")
      expect(scanText('const secret = "' + "ghp_" + "A".repeat(36) + '"', path).join()).toContain("secret")
    }
    const bareHost = "private-host" + ".net"
    expect(scanText(`const upstream="${bareHost}"`, "dist/assets/sample.js").join()).toContain("hostname")
    expect(scanText(`const upstream='${bareHost}'`, "dist/assets/sample.js").join()).toContain("hostname")
    expect(scanText('const ratio = value > 0 ? length/value' + ':1; const point = position.x;', "dist/assets/sample.js")).toEqual([])
    expect(scanText("const id = config.private" + ".net + 1", "dist/assets/sample.js")).toEqual([])
    expect(scanText('.card { padding:0; z-index:20; opacity:1; }', "dist/assets/sample.css")).toEqual([])
  })

  it("loopback exceptions are exact-file scoped and never allow private addresses", () => {
    const loopback = ["127", "0", "0", "1"].join(".")
    const privateIp = ["10", "21", "3", "4"].join(".")
    expect(scanText(loopback, "vite.config.ts")).toEqual([])
    expect(scanText(privateIp, "vite.config.ts").join()).toContain("IPv4")
    expect(scanText(loopback, "src/routes/page.ts").join()).toContain("IPv4")
    expect(scanText("localhost" + ":4321", "src/routes/page.ts").join()).toContain("host:port")
  })

  it("scans Worker source, config, docs and tests without whole-file network exemptions", () => {
    const host = ["upstream", "invalid"].join(".")
    const loopback = ["127", "0", "0", "1"].join(".")
    const privateIp = ["10", "21", "3", "4"].join(".")
    for (const path of ["cloudflare-worker/src/index.ts", "cloudflare-worker/wrangler.jsonc", "cloudflare-worker/README.md", "cloudflare-worker/__tests__/worker.test.ts"]) {
      expect(scanText(`const upstream = "${host}"`, path).join()).toContain("hostname")
      expect(scanText(privateIp, path).join()).toContain("IPv4")
      expect(scanText(loopback, path).join()).toContain("IPv4")
      expect(scanText("Use https://<backend-host> as the upstream.", path)).toEqual([])
    }
  })

  it("allows only the exact Worker local development origin, not arbitrary loopbacks or endpoints", () => {
    const path = "cloudflare-worker/src/index.ts"
    const origin = ["http:", "", ["localhost", 11000].join(":")].join("/")
    expect(scanText(`  "${origin}",`, path)).toEqual([])
    expect(scanText("localhost" + ":4321", path).join()).toContain("host:port")
    expect(scanText(origin + ".untrusted", path).join()).toContain("hostname")
    expect(scanText(origin, "cloudflare-worker/README.md").join()).toContain("host:port")
    expect(scanText(["http:", "", "localhost"].join("/"), path).join()).toContain("hostname")
    expect(scanText(`"${origin}", "${"localhost" + ":4321"}"`, path).join()).toContain("host:port")
  })

  it("reports every affected line", () => {
    const result = scan(["10", "21", "3", "4"].join(".") + "\n" + "ghp_" + "A".repeat(36))
    expect(result.status).toBe(1)
    expect(result.stdout).toContain("sample.txt:1: IPv4")
    expect(result.stdout).toContain("sample.txt:2: secret")
  })

  it("fails closed on missing files and missing --files arguments", () => {
    for (const args of [["--files"], ["--files", "missing-safety-sample.txt"]]) {
      const result = spawnSync(process.execPath, [resolve("scripts/check-public-safety.mjs"), ...args], { encoding: "utf8" })
      expect(result.status).not.toBe(0)
    }
  })
})
