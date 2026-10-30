import { z } from "zod"

const text = z.string().trim().min(1).max(2000)
const stageNames = ["Ingest", "Signals", "Liveness", "Fit", "Bake", "Links", "Resume", "Resume PDF", "Cover", "Track"] as const
const stage = z.object({ name: z.enum(stageNames), description: text, llm: z.enum(["no", "partly", "yes"]) }).strict()

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
  serve: z.object({ introduction: text, hops: z.array(z.object({ role: text, description: text }).strict()).min(5).max(8), response: text, fallback: text }).strict(),
}).strict()

export type PipelineContent = z.infer<typeof PipelineSchema>
