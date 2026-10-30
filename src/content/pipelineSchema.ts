import { z } from "zod"

const text = z.string().trim().min(1).max(2000)
const stageNames = ["Ingest", "Signals", "Liveness", "Fit", "Bake", "Links", "Resume", "Resume PDF", "Cover", "Track"] as const
/** Stable stop id shared by the page markup (`data-stop-id`) and the motion timeline. */
const stopId = z.string().regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/).max(40)
const stage = z.object({ id: stopId, name: z.enum(stageNames), description: text, llm: z.enum(["no", "partly", "yes"]) }).strict()
const hop = z.object({ id: stopId, role: text, description: text }).strict()

/** Page content, not a layout block. Keep the generated snapshot behind this contract. */
export const PipelineSchema = z.object({
  version: z.literal(1),
  title: text,
  introduction: text,
  tailor: z.object({
    introduction: text,
    stages: z.array(stage).length(10).refine((stages) => stages.every((s, i) => s.name === stageNames[i]), "Stages must follow the pipeline order"),
    qualityGates: z.array(text).length(3),
    humanReview: text,
    recordedRun: z.object({
      role: text, company: text, fit: text, resume: text, cover: text,
      previewLabel: text, curationLabel: text, previewDescription: text,
      specimens: z.array(z.object({ slug: z.string().regex(/^weltel-(ai|devops|mobile|platform)$/), label: text, highlighted: z.boolean() }).strict()).length(4),
    }).strict(),
  }).strict(),
  serve: z.object({
    introduction: text,
    // The request starts and ends in the browser: the return path is this list reversed.
    hops: z.array(hop).min(5).max(8).refine((hops) => hops[0]?.id === "browser", "The first hop must be the browser"),
    response: text,
    fallback: text,
  }).strict(),
}).strict().refine((content) => {
  const ids = [...content.tailor.stages, ...content.serve.hops].map((stop) => stop.id)
  return new Set(ids).size === ids.length
}, "Stage and hop ids must be unique")

export type PipelineContent = z.infer<typeof PipelineSchema>
