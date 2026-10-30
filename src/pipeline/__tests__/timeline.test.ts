import { describe, expect, it } from "vitest"
import snapshot from "@/content/pipeline.json"
import { PipelineSchema } from "@/content/pipelineSchema"
import { buildStops, createTimeline } from "../timeline"

const content = PipelineSchema.parse(snapshot)
const stageIds = content.tailor.stages.map((stage) => stage.id)
const hopIds = content.serve.hops.map((hop) => hop.id)
const stops = buildStops(content)
const timeline = createTimeline(stops)
const last = stops.length - 1

describe("buildStops", () => {
  it("visits every Act 1 stage, every hop out and every hop back, ending at the browser", () => {
    const backIds = [...hopIds].reverse().slice(1)
    expect(stops.map((stop) => stop.id)).toEqual([...stageIds, ...hopIds, ...backIds])
    expect(stops).toHaveLength(stageIds.length + hopIds.length * 2 - 1)
    expect(stops[last].id).toBe("browser")
  })

  it("labels act and leg for every stop and keeps the content names", () => {
    expect(stops.slice(0, stageIds.length).every((stop) => stop.act === "tailor" && stop.leg === "stage")).toBe(true)
    expect(stops.slice(stageIds.length, stageIds.length + hopIds.length).every((stop) => stop.act === "serve" && stop.leg === "out")).toBe(true)
    expect(stops.slice(stageIds.length + hopIds.length).every((stop) => stop.act === "serve" && stop.leg === "back")).toBe(true)
    expect(stops[0].name).toBe("Ingest")
    expect(stops[stageIds.length].name).toBe("Browser")
    expect(stops.map((stop) => stop.index)).toEqual(stops.map((_, i) => i))
  })

  it("rejects content without stops", () => {
    expect(() => createTimeline([])).toThrow()
  })
})

describe("createTimeline", () => {
  it("exposes the act boundary as the first Act 2 stop", () => {
    expect(timeline.actBoundary).toBe(stageIds.length)
    expect(stops[timeline.actBoundary - 1].act).toBe("tailor")
    expect(stops[timeline.actBoundary].act).toBe("serve")
    expect(timeline.isActBoundary(timeline.actBoundary)).toBe(true)
    expect(timeline.isActBoundary(timeline.actBoundary - 1)).toBe(false)
    expect(timeline.isActBoundary(timeline.actBoundary + 1)).toBe(false)
  })

  it("maps the first stop to 0 and the last stop to 1", () => {
    expect(timeline.progressFor(0)).toBe(0)
    expect(timeline.progressFor(last)).toBe(1)
    expect(timeline.stopAt(0)).toBe(stops[0])
    expect(timeline.stopAt(1)).toBe(stops[last])
  })

  it("round-trips every stop through its exact progress", () => {
    for (const stop of stops) {
      expect(timeline.indexAt(timeline.progressFor(stop.index))).toBe(stop.index)
      expect(timeline.stopAt(timeline.progressFor(stop.index))).toBe(stop)
    }
  })

  it("clamps progress below 0, above 1 and NaN", () => {
    expect(timeline.indexAt(-0.5)).toBe(0)
    expect(timeline.indexAt(-Infinity)).toBe(0)
    expect(timeline.indexAt(1.5)).toBe(last)
    expect(timeline.indexAt(Infinity)).toBe(last)
    expect(timeline.indexAt(Number.NaN)).toBe(0)
    expect(timeline.progressFor(-3)).toBe(0)
    expect(timeline.progressFor(last + 3)).toBe(1)
    expect(timeline.progressFor(Number.NaN)).toBe(0)
  })

  it("maps progress monotonically", () => {
    let previous = -1
    for (let step = 0; step <= 1000; step++) {
      const index = timeline.indexAt(step / 1000)
      expect(index).toBeGreaterThanOrEqual(previous)
      previous = index
    }
    expect(previous).toBe(last)
  })

  it("switches stop at the midpoint between neighbours", () => {
    const gap = 1 / last
    expect(timeline.indexAt(gap * 2.49)).toBe(2)
    expect(timeline.indexAt(gap * 2.5)).toBe(3)
    expect(timeline.indexAt(gap * 2.51)).toBe(3)
  })

  it("steps next and prev and holds at both ends", () => {
    expect(timeline.nextStop(0)).toBe(1)
    expect(timeline.prevStop(0)).toBe(0)
    expect(timeline.nextStop(last)).toBe(last)
    expect(timeline.prevStop(last)).toBe(last - 1)
    expect(timeline.nextStop(timeline.actBoundary - 1)).toBe(timeline.actBoundary)
    expect(timeline.nextStop(-4)).toBe(1)
    expect(timeline.prevStop(last + 4)).toBe(last - 1)
    expect(timeline.nextStop(Number.NaN)).toBe(1)
  })

  it("walks the whole path with nextStop", () => {
    const visited = [0]
    while (visited[visited.length - 1] < last) visited.push(timeline.nextStop(visited[visited.length - 1]))
    expect(visited).toEqual(stops.map((stop) => stop.index))
  })

  it("finds the outbound stop for a page element id", () => {
    expect(timeline.indexOfId("ingest")).toBe(0)
    expect(timeline.indexOfId("browser")).toBe(timeline.actBoundary)
    expect(timeline.indexOfId("missing")).toBe(-1)
  })
})
