/**
 * Zod schema for design/sources.yaml — the external context sources
 * declaration file for the portfolio generation pipeline.
 *
 * Validated at build/CI time by scripts/__tests__/sources.test.ts.
 */
import { z } from "zod";

// ── per-kind ref validators ───────────────────────────────────────────────────

const GithubSourceSchema = z.object({
  id: z.string().min(1, "id is required"),
  kind: z.literal("github"),
  /** "owner/repo" format */
  ref: z
    .string()
    .regex(/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/, 'github ref must be "owner/repo"'),
  use: z.array(z.string()).optional(),
  project: z.string().optional(),
});

const UrlSourceSchema = z.object({
  id: z.string().min(1, "id is required"),
  kind: z.literal("url"),
  ref: z.string().url("url ref must be a valid HTTPS URL"),
  use: z.array(z.string()).optional(),
  project: z.string().optional(),
});

const NotionSourceSchema = z.object({
  id: z.string().min(1, "id is required"),
  kind: z.literal("notion"),
  ref: z.string().min(1, "notion ref must be a non-empty page ID or URL"),
  use: z.array(z.string()).optional(),
  project: z.string().optional(),
});

const GdocSourceSchema = z.object({
  id: z.string().min(1, "id is required"),
  kind: z.literal("gdoc"),
  ref: z.string().min(1, "gdoc ref must be a non-empty doc ID or URL"),
  use: z.array(z.string()).optional(),
  project: z.string().optional(),
});

const SearchSourceSchema = z.object({
  id: z.string().min(1, "id is required"),
  kind: z.literal("search"),
  ref: z.string().min(1, "search ref must be a non-empty query string"),
  use: z.array(z.string()).optional(),
  project: z.string().optional(),
});

/** Discriminated union over all supported source kinds. */
const SourceEntrySchema = z.discriminatedUnion("kind", [
  GithubSourceSchema,
  UrlSourceSchema,
  NotionSourceSchema,
  GdocSourceSchema,
  SearchSourceSchema,
]);

export type SourceEntry = z.infer<typeof SourceEntrySchema>;

// ── top-level file schema ─────────────────────────────────────────────────────

export const SourcesSchema = z
  .object({
    version: z.literal(1),
    sources: z.array(SourceEntrySchema),
  })
  .superRefine((data, ctx) => {
    // Enforce uniqueness of `id` across all sources.
    const seen = new Set<string>();
    for (let i = 0; i < data.sources.length; i++) {
      const id = data.sources[i].id;
      if (seen.has(id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["sources", i, "id"],
          message: `Duplicate source id: "${id}"`,
        });
      }
      seen.add(id);
    }
  });

export type Sources = z.infer<typeof SourcesSchema>;
