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
  it("slugifies, folds the index, and prefixes leading digits", () => {
    expect(seriesKey("Pre-Optimization", 0)).toBe("pre-optimization-0")
    expect(seriesKey("2024 Spend", 1)).toBe("s-2024-spend-1")
    expect(seriesKey("", 2)).toBe("s-2")
  })

  it("keeps identically named series distinct", () => {
    expect(seriesKey("Latency", 0)).toBe("latency-0")
    expect(seriesKey("Latency", 1)).toBe("latency-1")
  })
})

describe("seriesToRows", () => {
  it("builds cartesian rows keyed by slug", () => {
    const rows = seriesToRows(sample)
    expect(rows).toEqual([
      { label: "Legacy", "pre-optimization-0": 4150, "post-optimization-1": 100 },
      { label: "Now", "pre-optimization-0": 2800, "post-optimization-1": 50 },
    ])
  })

  it("empty series yields no rows", () => {
    expect(seriesToRows([])).toEqual([])
  })

  it("takes labels from the longest series and uses null for gaps", () => {
    const series: Series[] = [
      { name: "A", points: [{ x: "x1", y: 1 }] },
      {
        name: "B",
        points: [
          { x: "x1", y: 2 },
          { x: "x2", y: 3 },
        ],
      },
    ]
    expect(seriesToRows(series)).toEqual([
      { label: "x1", "a-0": 1, "b-1": 2 },
      { label: "x2", "a-0": null, "b-1": 3 },
    ])
  })

  it("does not throw when points or name are missing", () => {
    const bad = [{ name: undefined, points: undefined }] as unknown as Series[]
    expect(() => seriesToRows(bad)).not.toThrow()
    expect(seriesToRows(bad)).toEqual([])
    expect(() => seriesToChartConfig(bad)).not.toThrow()
    expect(() => donutRows(bad)).not.toThrow()
    expect(donutRows(bad)).toEqual([])
  })

  it("preserves a real zero and does not coerce NaN to 0", () => {
    const series: Series[] = [
      {
        name: "A",
        points: [
          { x: "z", y: 0 },
          { x: "n", y: Number.NaN },
        ],
      },
    ]
    expect(seriesToRows(series)).toEqual([
      { label: "z", "a-0": 0 },
      { label: "n", "a-0": null },
    ])
  })
})

describe("seriesToChartConfig", () => {
  it("cycles --chart-N tokens in series order", () => {
    const config = seriesToChartConfig(sample)
    expect(Object.keys(config)).toEqual(["pre-optimization-0", "post-optimization-1"])
    expect(config["pre-optimization-0"]?.color).toBe(CHART_TOKENS[0])
    expect(config["post-optimization-1"]?.color).toBe(CHART_TOKENS[1])
    for (const entry of Object.values(config)) {
      expect(entry.color).toMatch(/^var\(--chart-\d\)$/)
    }
  })
})

describe("donutRows", () => {
  it("uses the first series points as slices", () => {
    expect(donutRows(sample).map((r) => r.value)).toEqual([4150, 2800])
  })

  it("keeps duplicate point names distinct", () => {
    const series: Series[] = [
      {
        name: "S",
        points: [
          { x: "Latency", y: 1 },
          { x: "Latency", y: 2 },
        ],
      },
    ]
    expect(donutRows(series).map((r) => r.key)).toEqual(["latency-0", "latency-1"])
  })
})

describe("CHART_KINDS", () => {
  it("does not treat Object.prototype keys as chart kinds", () => {
    expect((CHART_KINDS as readonly string[]).includes("toString")).toBe(false)
    expect((CHART_KINDS as readonly string[]).includes("constructor")).toBe(false)
  })
})
