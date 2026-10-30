import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { parse, stringify } from "yaml"
import { compilePipeline, serializePipeline } from "../compile-pipeline"

const source = readFileSync("design/pipeline.yaml", "utf8")
describe("pipeline content contract", () => {
  it("compiles the authored source byte-identically to the committed snapshot", () => {
    const content = compilePipeline(source)
    expect(serializePipeline(content)).toBe(readFileSync("src/content/pipeline.json", "utf8").replace(/\r\n/g, "\n"))
    expect(content.tailor.stages.map((stage) => stage.name)).toEqual([
      "Ingest", "Signals", "Liveness", "Fit", "Bake", "Links", "Resume", "Resume PDF", "Cover", "Track",
    ])
    expect(content.tailor.recordedRun.fit).toBe("3.7 / 5")
  })
  it.each(["missing stage", "invalid LLM value", "unknown field", "empty copy", "missing stop id", "duplicate stop id", "non-kebab stop id", "first hop not the browser"])("rejects %s", (kind) => {
    const raw = parse(source)
    if (kind === "missing stop id") delete raw.serve.hops[2].id
    if (kind === "duplicate stop id") raw.serve.hops[1].id = raw.tailor.stages[0].id
    if (kind === "non-kebab stop id") raw.tailor.stages[3].id = "Fit Stage"
    if (kind === "first hop not the browser") raw.serve.hops.reverse()
    if (kind === "missing stage") raw.tailor.stages.pop()
    if (kind === "invalid LLM value") raw.tailor.stages[0].llm = "maybe"
    if (kind === "unknown field") raw.unreviewed = "extra"
    if (kind === "empty copy") raw.title = ""
    expect(() => compilePipeline(stringify(raw))).toThrow()
  })
})
