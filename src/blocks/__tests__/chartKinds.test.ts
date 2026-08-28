import { describe, it, expect } from "vitest"
import { LayoutSchema } from "@/content/schema"
import { CHART_KINDS } from "../charts/toChartData"
import { CHART_KIND_REGISTRY } from "../charts/kinds"

function chartLayout(kind: string) {
  return {
    version: 1 as const,
    meta: { audience: "default" as const, generatedAt: "2026-01-01T00:00:00Z" },
    blocks: [
      {
        type: "chart" as const,
        id: "c1",
        props: { kind, series: [] },
      },
    ],
  }
}

describe("chart kind registry vs schema", () => {
  it("every CHART_KINDS member parses and has a renderer", () => {
    for (const kind of CHART_KINDS) {
      expect(LayoutSchema.safeParse(chartLayout(kind)).success).toBe(true)
      expect(CHART_KIND_REGISTRY[kind]).toBeTypeOf("function")
    }
    expect(Object.keys(CHART_KIND_REGISTRY).sort()).toEqual([...CHART_KINDS].sort())
  })

  it("rejects an unknown kind", () => {
    expect(LayoutSchema.safeParse(chartLayout("sankey")).success).toBe(false)
  })

  it("does not treat Object.prototype keys as registry members via CHART_KINDS", () => {
    expect((CHART_KINDS as readonly string[]).includes("toString")).toBe(false)
    // `in` walks the prototype — RechartsBody must use CHART_KINDS.includes instead.
    expect("toString" in CHART_KIND_REGISTRY).toBe(true)
  })
})
