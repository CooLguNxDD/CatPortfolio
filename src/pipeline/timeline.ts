// Pure timeline math for the /pipeline request token. No DOM, no UI framework.
import type { PipelineContent } from "@/content/pipelineSchema"

export type PipelineAct = "tailor" | "serve"
/** `stage` = Act 1, `out` = Act 2 towards the model, `back` = the response returning to the browser. */
export type PipelineLeg = "stage" | "out" | "back"

export interface PipelineStop {
  /** Content id; matches the page element's `data-stop-id`. Return stops reuse their hop's id. */
  id: string
  name: string
  act: PipelineAct
  leg: PipelineLeg
  index: number
}

export interface PipelineTimeline {
  stops: readonly PipelineStop[]
  /** Index of the first Act 2 stop: where the token crosses from Tailor into Serve. */
  actBoundary: number
  isActBoundary(index: number): boolean
  /** Progress in [0, 1] (clamped, NaN = 0) to the nearest stop index. Monotonic. */
  indexAt(progress: number): number
  stopAt(progress: number): PipelineStop
  /** Stop index (clamped) to its progress: first stop 0, last stop 1. */
  progressFor(index: number): number
  nextStop(index: number): number
  prevStop(index: number): number
  /** First (outbound) stop for a page element id, or -1. */
  indexOfId(id: string): number
}

/** Act 1 stages in order, Act 2 hops outbound, then the hops reversed back to the browser. */
export function buildStops(content: PipelineContent): PipelineStop[] {
  const { stages } = content.tailor
  const { hops } = content.serve
  const entries: Omit<PipelineStop, "index">[] = [
    ...stages.map((stage) => ({ id: stage.id, name: stage.name, act: "tailor" as const, leg: "stage" as const })),
    ...hops.map((hop) => ({ id: hop.id, name: hop.role, act: "serve" as const, leg: "out" as const })),
    // The last hop is the turnaround; the response starts from the hop before it.
    ...hops.slice(0, -1).reverse().map((hop) => ({ id: hop.id, name: hop.role, act: "serve" as const, leg: "back" as const })),
  ]
  return entries.map((entry, index) => ({ ...entry, index }))
}

const clamp01 = (value: number) => (Number.isNaN(value) ? 0 : Math.min(1, Math.max(0, value)))

export function createTimeline(stops: readonly PipelineStop[]): PipelineTimeline {
  if (stops.length === 0) throw new Error("A pipeline timeline needs at least one stop")
  const last = stops.length - 1
  const clampIndex = (index: number) => (Number.isNaN(index) ? 0 : Math.min(last, Math.max(0, Math.round(index))))
  const found = stops.findIndex((stop) => stop.act === "serve")
  const actBoundary = found === -1 ? stops.length : found
  // The epsilon keeps exact midpoints (k + 0.5) / last from rounding down through float error.
  const indexAt = (progress: number) => (last === 0 ? 0 : Math.min(last, Math.floor(clamp01(progress) * last + 0.5 + 1e-9)))
  return {
    stops,
    actBoundary,
    isActBoundary: (index) => index === actBoundary,
    indexAt,
    stopAt: (progress) => stops[indexAt(progress)],
    progressFor: (index) => (last === 0 ? 0 : clampIndex(index) / last),
    nextStop: (index) => Math.min(last, clampIndex(index) + 1),
    prevStop: (index) => Math.max(0, clampIndex(index) - 1),
    indexOfId: (id) => stops.findIndex((stop) => stop.id === id),
  }
}
