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
  it.each(["missing stage", "invalid LLM value", "unknown field", "empty copy"])("rejects %s", (kind) => {
    const raw = parse(source)
    if (kind === "missing stage") raw.tailor.stages.pop()
    if (kind === "invalid LLM value") raw.tailor.stages[0].llm = "maybe"
    if (kind === "unknown field") raw.unreviewed = "extra"
    if (kind === "empty copy") raw.title = ""
    expect(() => compilePipeline(stringify(raw))).toThrow()
  })
})
