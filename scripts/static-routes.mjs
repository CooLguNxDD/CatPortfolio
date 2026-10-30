#!/usr/bin/env node
// GitHub Pages serves only real files: a client route without its own index.html falls
// through to 404.html with HTTP 404 (crawlers and link previews treat it as missing).
// Copy the built index.html into dist/<route>/index.html so those routes answer 200.
// Runs as `postbuild`; deploy.yml stays untouched.
import { copyFileSync, existsSync, mkdirSync } from "node:fs"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

// Keep in sync with the static paths in src/router.tsx ("/" is index.html itself).
export const STATIC_ROUTES = ["pipeline", "ask"]

export function writeStaticRoutes(distDir, routes = STATIC_ROUTES) {
  const index = join(distDir, "index.html")
  if (!existsSync(index)) throw new Error(`${index} missing: run vite build first`)
  for (const route of routes) {
    const dir = join(distDir, route)
    mkdirSync(dir, { recursive: true })
    copyFileSync(index, join(dir, "index.html"))
  }
  return routes.map((route) => `${route}/index.html`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const written = writeStaticRoutes(resolve(process.argv[2] ?? "dist"))
  console.log(`static routes: ${written.join(", ")}`)
}
