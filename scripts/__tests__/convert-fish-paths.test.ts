import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"

const scriptPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../convert-fish-assets.mjs",
)

describe("convert-fish-assets paths", () => {
  it("resolves source and output from import.meta.url, not a machine-local drive", () => {
    const src = readFileSync(scriptPath, "utf8")
    expect(src).toContain("fileURLToPath(import.meta.url)")
    expect(src).not.toMatch(/E:\\code_project/i)
    expect(src).not.toMatch(/E:\/code_project/i)
  })
})
