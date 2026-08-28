import { describe, it, expect } from "vitest"
import { CHART_KINDS } from "./toChartData"
import {
  CHART_TOKENS,
  donutRows,
  seriesKey,
  seriesToChartConfig,
  seriesToRows,
  type Series,
} from "./toChartData"
import { CHART_KIND_REGISTRY } from "./kinds"

const sample: Series[] = [
  {
    name: "Pre-Optimization",
    points: [
      { x: "Legacy", y: 4150 },
      { x: "Now", y: 2800 },
    ],
  },
  {
    name: "Post-Optimization",
    points: [
      { x: "Legacy", y: 100 },
      { x: "Now", y: 50 },
    ],
  },
]

describe("seriesKey", () => {
  it("slugifies and prefixes leading digits", () => {
    expect(seriesKey("Pre-Optimization", 0)).toBe("pre-optimization")
    expect(seriesKey("2024 Spend", 1)).toBe("s-2024-spend")
    expect(seriesKey("", 2)).toBe("s2")
  })
})

describe("seriesToRows", () => {
  it("builds cartesian rows keyed by slug", () => {
    const rows = seriesToRows(sample)
    expect(rows).toEqual([
      { label: "Legacy", "pre-optimization": 4150, "post-optimization": 100 },
      { label: "Now", "pre-optimization": 2800, "post-optimization": 50 },
    ])
  })

  it("empty series yields no rows", () => {
    expect(seriesToRows([])).toEqual([])
  })
})

describe("seriesToChartConfig", () => {
  it("cycles --chart-N tokens in series order", () => {
    const config = seriesToChartConfig(sample)
    expect(Object.keys(config)).toEqual(["pre-optimization", "post-optimization"])
    expect(config["pre-optimization"]?.color).toBe(CHART_TOKENS[0])
    expect(config["post-optimization"]?.color).toBe(CHART_TOKENS[1])
    for (const entry of Object.values(config)) {
      expect(entry.color).toMatch(/^var\(--chart-\d\)$/)
    }
  })
})

describe("donutRows", () => {
  it("uses the first series points as slices", () => {
    expect(donutRows(sample).map((r) => r.value)).toEqual([4150, 2800])
  })
})

describe("CHART_KIND_REGISTRY", () => {
  it("covers every declared kind", () => {
    for (const kind of CHART_KINDS) {
      expect(CHART_KIND_REGISTRY[kind]).toBeTypeOf("function")
    }
    expect(Object.keys(CHART_KIND_REGISTRY).sort()).toEqual([...CHART_KINDS].sort())
  })
})
