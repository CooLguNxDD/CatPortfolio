// design/pipeline.yaml is authored; src/content/pipeline.json is generated.
import { readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { parse } from "yaml"
import { PipelineSchema, type PipelineContent } from "../src/content/pipelineSchema.js"

export function compilePipeline(source: string): PipelineContent {
  return PipelineSchema.parse(parse(source))
}
export function serializePipeline(content: PipelineContent): string {
  return JSON.stringify(content, null, 2) + "\n"
}

function main() {
  const root = resolve(import.meta.dirname, "..")
  const target = resolve(root, "src/content/pipeline.json")
  const output = serializePipeline(compilePipeline(readFileSync(resolve(root, "design/pipeline.yaml"), "utf8")))
  if (process.argv.includes("--check")) {
    let committed = ""
    try { committed = readFileSync(target, "utf8").replace(/\r\n/g, "\n") } catch { /* missing is stale */ }
    if (committed !== output) {
      throw new Error("src/content/pipeline.json is missing or stale. Run npm run compile:pipeline.")
    }
    process.stdout.write("✓ pipeline.json is in sync with design/pipeline.yaml\n")
  } else {
    writeFileSync(target, output)
    process.stdout.write("✓ Wrote src/content/pipeline.json\n")
  }
}
if (process.argv[1]?.replace(/\\/g, "/").endsWith("compile-pipeline.ts")) {
  try { main() } catch (error) {
    console.error(error instanceof Error ? error.message : "Pipeline compilation failed")
    process.exitCode = 1
  }
}
