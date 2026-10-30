#!/usr/bin/env node
// Public-source/build guard. Findings contain locations and rule names, NEVER matched values.
// Two tiers: authored text includes bare DNS names; minified dist JS uses scheme-anchored
// hosts plus whole-string hostname literals (member access is not DNS). IPs and secrets
// are checked in full in both tiers.
import { execFileSync } from "node:child_process"
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs"
import { resolve, relative, extname } from "node:path"
import { fileURLToPath } from "node:url"
import { isIP } from "node:net"

// Public project links, package documentation, standards namespaces and vendor attribution.
// Exact hosts only: allowing a parent must never implicitly trust arbitrary subdomains.
const HOSTS = new Set([
  "github.com", "github.io", "coolgundd.github.io", "coolgunxdd.github.io",
  "docs.github.com", "cli.github.com", "api.github.com", "raw.githubusercontent.com",
  "cloudflare.com", "developers.cloudflare.com", "www.npmjs.com", "registry.npmjs.org",
  "www.w3.org", "w3.org", "json-schema.org", "schema.org", "www.w3schools.com",
  "vite.dev", "react.dev", "ui.shadcn.com", "jules.google.com",
  "fonts.googleapis.com", "fonts.gstatic.com", "cdn.jsdelivr.net", "cdn.tailwindcss.com", "cdnjs.cloudflare.com",
  "pullfrog.com", "ghcr.io", // Existing review tooling/dashboard and container registry.
  "threejs.org", "www.khronos.org", "d3js.org", // Third-party renderer attribution/standards.
  "chevrotain.io", "langium.org", "en.wikipedia.org", // Mermaid parser documentation/attribution.
  "redux.js.org", "redux-toolkit.js.org", "bit.ly", // Recharts bundled dependency diagnostics.
  "docs.google.com", // Declared external context source in design/sources.yaml.
])
// Reserved documentation domains: allowed only in existing fixtures, never page content/dist.
const EXAMPLE_FILES = new Set([
  "src/config/__tests__/runtimeConfig.test.ts", "scripts/__tests__/sources.test.ts", "design/sources.yaml",
])
// Loopback bindings and localhost URLs are needed by dev servers/tests, not public page copy.
const DEV_FILES = new Set([
  "vite.config.ts", "playwright.config.ts", "Dockerfile", "docker-compose.yml",
  "scripts/gen-layout.ts", "scripts/gen-themes.ts", "scripts/gen-fragments.ts",
  "cloudflare-worker/src/index.ts", // S02 owns Worker hardening; existing origins include dev loopback only.
  "scripts/check-public-safety.mjs", // The scanner's explicit loopback policy constants, not deployment coordinates.
])
function devFile(path) {
  return DEV_FILES.has(path) || /^(?:src|scripts)\/.*\/__tests__\/[^/]+\.[cm]?[jt]sx?$/.test(path)
}
// Lockfiles/vendor assets are third-party inputs, not authored content. Scan all authored
// text (including config and dotfiles). dist JS is deliberately NOT excluded as vendored.
function excluded(path) {
  return /(?:^|\/)(?:node_modules|\.git)(?:\/|$)/.test(path)
    || /(?:^|\/)(?:package-lock\.json|yarn\.lock|pnpm-lock\.yaml)$/.test(path)
    || /^(?:public\/models\/|src\/fish\/generated\/)/.test(path)
    || path.startsWith("playwright-report/") // Generated third-party HTML reporter, never shipped by Vite.
}

const IPV4 = /(?<![\w.])(?:\d{1,3}\.){3}\d{1,3}(?![\w.])/g
const ENDPOINT = /(?<![\w.-])([a-z][a-z\d.-]*|(?:\d{1,3}\.){3}\d{1,3}):(\d{1,5})\b(?![.%\w])/gi
const URL_HOST = /(?:\b(?:https?|wss?|ftp):\/\/|(?<=["'(])\/\/)([a-z\d][^\s/<>"'`()\\]*)/gi
// Bare network names (URLs also catch single-label hosts and any suffix). Source member
// access/file extensions are not DNS. Recognise public DNS suffixes plus private-network suffixes.
const BARE_HOST = /(?<![^\s"'`@/<>(])(?:[a-z\d](?:[a-z\d-]*[a-z\d])?\.)+(?:com|net|org|io|dev|app|ai|co|me|edu|gov|uk|ca|de|fr|jp|au|us|eu|info|biz|xyz|tech|cloud|online|site|in|ly|sh|gg|internal|local|lan|home|test|invalid|example)\b(?![\w.-]|\s*\(|=[^=]|:[a-z])/gi
const SECRETS = [
  /\bsk-(?:ant-)?[a-z\d_-]{16,}/i,
  /\b(?:ghp_|github_pat_)[a-z\d_]{16,}/i,
  /\bAKIA[A-Z\d]{16}\b/,
  /\bxox[bp]-[a-z\d-]{10,}/i,
  /-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----/,
  /\bBearer\s+[a-z\d._~+/-]{24,}={0,2}/i,
  /\bapi[_-]?key["']?\s*[:=]\s*["'][^"'\r\n]{16,}["']/i,
]

function allowedHost(host, path) {
  host = host.toLowerCase().replace(/\.$/, "")
  if (HOSTS.has(host)) return true
  if (EXAMPLE_FILES.has(path) && /(?:^|\.)example\.com$/.test(host)) return true
  if (devFile(path) && host === "localhost") return true
  if (devFile(path) && ["0.0.0.0", "127.0.0.1"].includes(host)) return true
  return false
}
// These are grammar, not network exceptions: CSS declarations, Docker image tags,
// source file:line locations and vector swizzles cannot be endpoint literals.
const CSS_PROPERTIES = new Set(["width", "height", "opacity", "z-index", "order", "flex", "font-weight", "font-size", "line-height", "top", "left", "right", "bottom", "padding", "margin", "scale", "max-width", "min-width", "stroke-width", "stroke", "fill", "offset", "stroke-dashoffset", "stop-opacity", "fill-opacity", "stroke-opacity", "zoom", "grid-column", "border"])
function isSyntaxEndpoint(match, line, path) {
  const host = match[1]
  if (/\.(?:[cm]?[jt]sx?|json|css|md|ya?ml|sh|txt)$/.test(host)) return true
  if (CSS_PROPERTIES.has(host) && /\.(?:css|svg|html|[jt]sx?)$/.test(path)) return true
  if (/\.css$/.test(path) && /(?:^|[;{])\s*$/.test(line.slice(0, match.index))) return true
  if (path === "design/fish/tank3d-extract.js" && host === "school" && /(?:^|[,{}])\s*$/.test(line.slice(0, match.index))) return true
  if (path === "src/render/LayoutRenderer.tsx" && host === "cols" && line.includes("// Explicit level.cols")) return true
  if ((path === "Dockerfile" || path === "docker-compose.yml") && /(?:FROM|image:)\s+[^\s]*$/.test(line.slice(0, match.index))) return true
  // In minified JS only a literal authority (or URL authority) is an endpoint;
  // `a: 99` object properties and ternaries are not endpoints.
  if (/^dist\/.*\.js$/.test(path) && !/(?:["'`]|\/\/)$/.test(line.slice(0, match.index))) return true
  return false
}
export function scanText(text, path) {
  const findings = []
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    const rules = new Set()
    for (const match of line.matchAll(IPV4)) {
      if (isIP(match[0]) === 4 && !(devFile(path) && ["0.0.0.0", "127.0.0.1"].includes(match[0]))) rules.add("IPv4")
    }
    for (const match of line.matchAll(ENDPOINT)) {
      if (!isSyntaxEndpoint(match, line, path) && !(devFile(path) && ["localhost", "127.0.0.1", "0.0.0.0"].includes(match[1].toLowerCase()))) rules.add("host:port")
    }
    for (const match of line.matchAll(URL_HOST)) {
      // Parse the authority (including userinfo) rather than trusting a prefix before @.
      if (/[${}<]/.test(match[1]) || line[match.index + match[0].length] === "<") continue // template placeholder, not a concrete hostname
      try {
        const host = new URL(`https://${match[1]}`).hostname
        // TanStack's URL-normalisation sentinel is not a deployed backend. Exact
        // library/chunk + surrounding expression only; localhost elsewhere still fails.
        const routerSentinel = /^dist\/assets\/tanstack-[\w-]+\.js$/.test(path)
          && host === "localhost"
          && line.slice(Math.max(0, match.index - 13), match.index) === "this.origin=`"
          && line.slice(match.index + match[0].length).startsWith("`),this.history")
        if (!routerSentinel && !allowedHost(host, path)) rules.add("hostname")
      } catch { rules.add("hostname") }
    }
    const minified = /^dist\/.*\.js$/.test(path)
    for (const match of line.matchAll(BARE_HOST)) {
      // Minified JS: member access is not DNS, but a string literal that is exactly a
      // hostname is a leaked config value (e.g. a baked backend name), so check those.
      if (minified && !(/["'`]$/.test(line.slice(0, match.index)) && line[match.index + match[0].length] === line[match.index - 1])) continue
      // File names/import paths with recognised source extensions are not DNS names.
      if (match[0] === "docker-entrypoint.sh" || match[0] === "env.example") continue
      if (/\.(?:xyz|xy|rgba)$/.test(match[0]) && /\.(?:[jt]s|glsl)$/.test(path) && /^\s*[;,)]/.test(line.slice(match.index + match[0].length))) continue
      if (match[0] === "import.meta.env.DEV") continue
      // Reviewed property references in source/design documentation, not DNS names.
      const properties = {
        "src/blocks/FishTankCanvas.tsx": ["orbit" + ".ly"],
        "design/fish/tank3d-extract.js": ["orbit" + ".ly"],
        "src/render/LayoutRenderer.tsx": ["p" + ".tech"],
        "design/design.md": ["card" + ".tech"],
      }
      if (properties[path]?.includes(match[0])) continue
      if (!allowedHost(match[0], path)) rules.add("hostname")
    }
    if (SECRETS.some((rule) => rule.test(line))) rules.add("secret")
    for (const rule of rules) findings.push(`${path}:${index + 1}: ${rule}`)
  }
  return findings
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(dir, entry.name)
    return entry.isDirectory() ? walk(path) : entry.isFile() ? [path] : []
  })
}
function main() {
  const root = resolve(fileURLToPath(new URL("..", import.meta.url)))
  const args = process.argv.slice(2)
  const explicit = args[0] === "--files"
  if ((args.length && !explicit) || (explicit && args.length < 2)) throw new Error("Usage: node scripts/check-public-safety.mjs [--files <path>...]")
  const files = explicit ? args.slice(1).map((path) => resolve(path)) : [
    ...execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean).map((path) => resolve(root, path)),
    ...(existsSync(resolve(root, "dist")) ? walk(resolve(root, "dist")) : []),
  ]
  let count = 0
  const findings = []
  for (const file of new Set(files)) {
    const path = relative(root, file).replace(/\\/g, "/")
    if (!explicit && excluded(path)) continue
    if (!statSync(file).isFile()) throw new Error(`Not a file: ${path}`)
    const bytes = readFileSync(file)
    // Binary assets: explicit files are still scanned if textual, regardless of extension.
    if (bytes.includes(0) || /\.(?:glb|fbx|png|jpe?g|gif|webp|ico|woff2?|ttf|pdf|mp3|wav|mp4|zip)$/i.test(extname(file))) continue
    count++
    findings.push(...scanText(bytes.toString("utf8"), path))
  }
  if (findings.length) {
    process.stdout.write(findings.sort((a, b) => a.localeCompare(b, "en", { numeric: true })).join("\n") + "\n")
    process.exitCode = 1
  } else process.stdout.write(`Public safety: clean (${count} text files scanned)\n`)
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main() } catch (error) {
    console.error(`Public safety: ${error instanceof Error ? error.message : "scan failed"}`)
    process.exitCode = 1
  }
}
