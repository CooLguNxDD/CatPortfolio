import { z } from "zod";

const Link = z.object({ label: z.string(), href: z.string().url() });
const Stat = z.object({ label: z.string(), value: z.string() });

const Hero = z.object({ type: z.literal("hero"), id: z.string(), props: z.object({
  name: z.string(), tagline: z.string(), pitch: z.string().optional(), links: z.array(Link).optional() }) });

const ProjectGrid = z.object({ type: z.literal("projectGrid"), id: z.string(), props: z.object({
  projects: z.array(z.object({
    id: z.string(), name: z.string(), summary: z.string(),
    tags: z.array(z.string()).default([]),
    metrics: z.array(Stat).default([]),
    links: z.array(Link).default([]) })) }) });

const StatStrip = z.object({ type: z.literal("statStrip"), id: z.string(),
  props: z.object({ stats: z.array(Stat) }) });

const StarStory = z.object({ type: z.literal("starStory"), id: z.string(), props: z.object({
  situation: z.string(), task: z.string(), action: z.string(), result: z.string(),
  tags: z.array(z.string()).default([]) }) });

const ArchDiagram = z.object({ type: z.literal("archDiagram"), id: z.string(), props: z.object({
  title: z.string(), kind: z.enum(["mermaid", "svg"]), source: z.string() }) });

const CodeSnippet = z.object({ type: z.literal("codeSnippet"), id: z.string(), props: z.object({
  lang: z.string(), code: z.string(), caption: z.string().optional() }) });

const Prose = z.object({ type: z.literal("prose"), id: z.string(),
  props: z.object({ markdown: z.string() }) });

export const LayoutSchema = z.object({
  version: z.literal(1),
  meta: z.object({
    audience: z.enum(["recruiter", "hiring-manager", "peer", "default"]).default("default"),
    generatedAt: z.string(),
    /** Optional vibe from design_layout; renderer applies only registered themes. */
    theme: z.string().optional() }),
  blocks: z.array(z.discriminatedUnion("type",
    [Hero, ProjectGrid, StatStrip, StarStory, ArchDiagram, CodeSnippet, Prose])),
});

export type Layout = z.infer<typeof LayoutSchema>;
