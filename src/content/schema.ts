import { z } from "zod";

const Link = z.object({ label: z.string(), href: z.string().url() });
const Stat = z.object({ label: z.string(), value: z.string() });

/** Optional layout hints for LayoutRenderer CSS grid. */
const BlockLayout = z
  .object({
    span: z.number().int().min(1).max(12).optional(),
    order: z.number().int().optional(),
  })
  .optional();

const ChartPoint = z.object({
  x: z.union([z.string(), z.number()]),
  y: z.number(),
});
const ChartSeries = z.object({
  name: z.string(),
  points: z.array(ChartPoint).default([]),
});

const Hero = z.object({
  type: z.literal("hero"),
  id: z.string(),
  layout: BlockLayout,
  props: z.object({
    name: z.string(),
    tagline: z.string(),
    pitch: z.string().optional(),
    links: z.array(Link).optional(),
  }),
});

const ProjectGrid = z.object({
  type: z.literal("projectGrid"),
  id: z.string(),
  layout: BlockLayout,
  props: z.object({
    projects: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        summary: z.string(),
        tags: z.array(z.string()).default([]),
        metrics: z.array(Stat).default([]),
        links: z.array(Link).default([]),
      }),
    ),
  }),
});

const StatStrip = z.object({
  type: z.literal("statStrip"),
  id: z.string(),
  layout: BlockLayout,
  props: z.object({ stats: z.array(Stat) }),
});

const StarStory = z.object({
  type: z.literal("starStory"),
  id: z.string(),
  layout: BlockLayout,
  props: z.object({
    situation: z.string(),
    task: z.string(),
    action: z.string(),
    result: z.string(),
    tags: z.array(z.string()).default([]),
  }),
});

const ArchDiagram = z.object({
  type: z.literal("archDiagram"),
  id: z.string(),
  layout: BlockLayout,
  props: z.object({
    title: z.string(),
    kind: z.enum(["mermaid", "svg"]),
    source: z.string(),
  }),
});

const CodeSnippet = z.object({
  type: z.literal("codeSnippet"),
  id: z.string(),
  layout: BlockLayout,
  props: z.object({
    lang: z.string(),
    code: z.string(),
    caption: z.string().optional(),
  }),
});

const Prose = z.object({
  type: z.literal("prose"),
  id: z.string(),
  layout: BlockLayout,
  props: z.object({ markdown: z.string() }),
});

const Chart = z.object({
  type: z.literal("chart"),
  id: z.string(),
  layout: BlockLayout,
  props: z.object({
    kind: z.enum(["bar", "line", "area", "donut", "radar"]),
    title: z.string().optional(),
    series: z.array(ChartSeries).default([]),
    caption: z.string().optional(),
    unit: z.string().optional(),
  }),
});

const Timeline = z.object({
  type: z.literal("timeline"),
  id: z.string(),
  layout: BlockLayout,
  props: z.object({
    title: z.string().optional(),
    items: z
      .array(
        z.object({
          date: z.string(),
          title: z.string(),
          body: z.string().optional(),
          tag: z.string().optional(),
        }),
      )
      .default([]),
  }),
});

const FlowAnim = z.object({
  type: z.literal("flowAnim"),
  id: z.string(),
  layout: BlockLayout,
  props: z.object({
    title: z.string().optional(),
    nodes: z
      .array(
        z.object({
          id: z.string(),
          label: z.string(),
          group: z.string().optional(),
        }),
      )
      .default([]),
    edges: z
      .array(
        z.object({
          from: z.string(),
          to: z.string(),
          label: z.string().optional(),
        }),
      )
      .default([]),
    animate: z.boolean().optional(),
  }),
});

const KpiGrid = z.object({
  type: z.literal("kpiGrid"),
  id: z.string(),
  layout: BlockLayout,
  props: z.object({
    items: z
      .array(
        z.object({
          label: z.string(),
          value: z.string(),
          delta: z.string().optional(),
          spark: z.array(z.number()).optional(),
        }),
      )
      .default([]),
  }),
});

const Comparison = z.object({
  type: z.literal("comparison"),
  id: z.string(),
  layout: BlockLayout,
  props: z.object({
    title: z.string().optional(),
    columns: z.array(z.object({ label: z.string() })).default([]),
    rows: z
      .array(
        z.object({
          label: z.string(),
          cells: z.array(z.string()).default([]),
        }),
      )
      .default([]),
  }),
});

const QuickActions = z.object({
  type: z.literal("quickActions"),
  id: z.string(),
  layout: BlockLayout,
  props: z.object({
    prompt: z.string().optional(),
    actions: z
      .array(
        z.object({
          label: z.string(),
          prompt: z.string(),
          icon: z.string().optional(),
        }),
      )
      .default([]),
  }),
});

/** Domain tint (Open Design matrix) or global accent picker tint. */
const AccentId = z.enum(["amber", "pink", "neon", "cyan", "violet"]);
const DomainId = z.enum(["ai", "devops", "mobile", "platform"]);

/**
 * Generic card — first-class portfolio unit (project tiles, proof chips, STAR).
 * Prefer card + layout.span over inventing new block types for card walls.
 */
const Card = z.object({
  type: z.literal("card"),
  id: z.string(),
  layout: BlockLayout,
  props: z.object({
    title: z.string().optional(),
    eyebrow: z.string().optional(),
    body: z.string().optional(),
    media: z
      .object({
        kind: z.enum(["image", "svg", "icon"]).optional(),
        src: z.string(),
        alt: z.string().optional(),
      })
      .optional(),
    metrics: z
      .array(z.object({ label: z.string(), value: z.string() }))
      .optional(),
    tags: z.array(z.string()).optional(),
    links: z.array(Link).optional(),
    /** Open Design verified chips (e.g. "✓ 531+ commits verified"). */
    badges: z
      .array(
        z.object({
          label: z.string(),
          href: z.string().url().optional(),
          tone: z.enum(["neon", "amber"]).optional(),
        }),
      )
      .optional(),
    /** Space-separated tech tokens for matrix tech filter (e.g. "MCP pgvector"). */
    tech: z.string().optional(),
    /** Open Design domain chroma (ai / devops / mobile / platform). */
    domain: DomainId.optional(),
    /** Global accent picker tint when domain is not set. */
    accent: AccentId.optional(),
    variant: z.enum(["solid", "outline", "ghost"]).optional(),
  }),
});

/** Client-only mock MCP sandbox (OD matrix L3 interactive). */
const McpSandbox = z.object({
  type: z.literal("mcpSandbox"),
  id: z.string(),
  layout: BlockLayout,
  props: z.object({}).default({}),
});

/** Client-only AWS cost simulator (OD matrix L4 interactive). */
const CostSim = z.object({
  type: z.literal("costSim"),
  id: z.string(),
  layout: BlockLayout,
  props: z.object({}).default({}),
});

/**
 * Declarative canvas-2D visual (OD matrix L3, alongside archDiagram/flowAnim).
 * Preset + grounded data, NOT a general drawing DSL: no arbitrary paths,
 * colors, or expressions -- mirrors flowAnim's nodes/edges shape, server-
 * derived from real projects (see OpenCat-Mcp-Full block_builder.py's
 * "scene2d" branch). `renderer` is a Literal union deliberately left open
 * for "webgl" later (a schema widening, not a rewrite) -- three.js is not
 * added until that path ships.
 */
const Scene2d = z.object({
  type: z.literal("scene2d"),
  id: z.string(),
  layout: BlockLayout,
  props: z.object({
    renderer: z.literal("2d").default("2d"),
    preset: z.enum(["orbit", "pulse-grid", "particle-field"]),
    title: z.string().optional(),
    nodes: z
      .array(
        z.object({
          id: z.string(),
          label: z.string(),
          group: z.string().optional(),
        }),
      )
      .default([]),
    edges: z
      .array(
        z.object({
          from: z.string(),
          to: z.string(),
          label: z.string().optional(),
        }),
      )
      .default([]),
    palette: AccentId.optional(),
    motion: z
      .object({
        speed: z.number().min(0.1).max(3).default(1),
        loop: z.boolean().default(true),
        intensity: z.number().min(0).max(2).default(1),
      })
      .default({}),
    caption: z.string().optional(),
  }),
});

/**
 * WebGL aquarium scene — one flat list of fish specimens (bounded 0..1
 * numerics). Species reuses DomainId for accent tokens; no raw colours.
 * Append-only once emitted into a persisted bake.
 */
const FishSpecimen = z.object({
  slug: z.string(),
  title: z.string(),
  species: DomainId,
  size: z.number().min(0).max(1).default(0.5),
  depth: z.number().min(0).max(1).default(0.5),
  speed: z.number().min(0).max(1).default(0.5),
  glow: z.number().min(0).max(1).default(0.3),
  school: z.number().int().min(0).max(15).default(0),
  tags: z.array(z.string()).default([]),
  blurb: z.string().optional(),
  description: z.string().optional(),
  detailRef: z.string().optional(),
  link: Link.optional(),
  metrics: z.array(Stat).default([]),
  // Fractional-year project timeline (e.g. 2025.67). Omitted (never null)
  // when the project has no known date. endYear omitted means ongoing.
  startYear: z.number().optional(),
  endYear: z.number().optional(),
});

const FishTank = z.object({
  type: z.literal("fishTank"),
  id: z.string(),
  layout: BlockLayout,
  props: z.object({
    renderer: z.literal("webgl").default("webgl"),
    title: z.string().optional(),
    fish: z.array(FishSpecimen).max(40).default([]),
    tankTheme: z.string().optional(),
    cameraFocus: z.string().optional(),
    highlightSlugs: z.array(z.string()).default([]),
    curationLabel: z.string().optional(),
    palette: AccentId.optional(),
    caption: z.string().optional(),
    // Fractional-year bounds across all dated fish, for band mapping.
    timeSpan: z.object({ min: z.number(), max: z.number() }).optional(),
  }),
});

/** Composite DSL — recursive containers + typed leaves (depth ≤ 3, ≤ 40 nodes). */
const CompositeLayoutSpec = z.object({
  kind: z.enum(["grid", "stack", "split", "cards"]),
  cols: z.number().int().min(1).max(4).optional(),
  gap: z.enum(["sm", "md", "lg"]).optional(),
  align: z.string().optional(),
});

type CompositeNode = {
  kind: string;
  children?: CompositeNode[];
  [key: string]: unknown;
};

// Exported (not just module-private) so scripts/__tests__/mirror-drift.test.ts
// can assert design/mirror-manifest.json's copy matches the actual source of
// truth, instead of drifting independently the way THEME_VAR_ALLOWLIST did.
export const LEAF_KINDS = new Set([
  "metric",
  "sparkline",
  "badgeCloud",
  "text",
  "quote",
  "progress",
  "image",
  "icon",
  "divider",
  "chart",
  "card",
  "media",
  "kv",
  "tagRow",
  "link",
  "stat",
]);
export const CONTAINER_KINDS = new Set(["grid", "stack", "split", "cards"]);
export const COMPOSITE_MAX_DEPTH = 3;
export const COMPOSITE_MAX_NODES = 40;

const CompositeNodeSchema: z.ZodType<CompositeNode> = z.lazy(() =>
  z
    .object({
      kind: z.string(),
      children: z.array(CompositeNodeSchema).optional(),
    })
    .passthrough()
    .superRefine((node, ctx) => {
      if (CONTAINER_KINDS.has(node.kind)) return;
      if (LEAF_KINDS.has(node.kind)) return;
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `unknown composite kind "${node.kind}"`,
      });
    }),
);

function countComposite(
  nodes: CompositeNode[] | undefined,
  depth: number,
): { count: number; maxDepth: number } {
  if (!nodes?.length) return { count: 0, maxDepth: depth };
  let count = 0;
  let maxDepth = depth;
  for (const n of nodes) {
    count += 1;
    if (CONTAINER_KINDS.has(n.kind) && n.children) {
      const inner = countComposite(n.children, depth + 1);
      count += inner.count;
      maxDepth = Math.max(maxDepth, inner.maxDepth);
    }
  }
  return { count, maxDepth };
}

const Composite = z.object({
  type: z.literal("composite"),
  id: z.string(),
  layout: BlockLayout,
  props: z
    .object({
      title: z.string().optional(),
      layout: CompositeLayoutSpec,
      children: z.array(CompositeNodeSchema).default([]),
    })
    .superRefine((props, ctx) => {
      const { count, maxDepth } = countComposite(props.children, 1);
      if (maxDepth > COMPOSITE_MAX_DEPTH) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `composite children exceed max depth ${COMPOSITE_MAX_DEPTH}`,
        });
      }
      if (count > COMPOSITE_MAX_NODES) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `composite children exceed max nodes ${COMPOSITE_MAX_NODES} (got ${count})`,
        });
      }
    }),
});

/** Cozy theme var keys — themeOverrides keys must be in this set. */
export const THEME_VAR_ALLOWLIST = new Set([
  "bg",
  "bg-sunken",
  "bg-elevated",
  "card",
  "card-soft",
  "fg",
  "fg-muted",
  "fg-subtle",
  "border",
  "border-strong",
  "hairline",
  "amber",
  "amber-soft",
  "amber-glow",
  "peach",
  "pink",
  "pink-soft",
  "neon",
  "neon-dim",
  "cyan",
  "accent-amber",
  "accent-pink",
  "accent-neon",
  "accent-cyan",
  "accent-violet",
  "accent-ai",
  "accent-devops",
  "accent-mobile",
  "accent-platform",
  "ok",
  "ok-soft",
  "warn",
  "warn-soft",
  "danger",
  "danger-soft",
  "term-bg",
  "term-fg",
  "term-dim",
  "term-amber",
  "term-green",
  "term-pink",
  "term-cyan",
  "radius-sm",
  "radius",
  "radius-lg",
  "shadow-card",
  "shadow-pop",
  "glow-amber",
  "glow-pink",
  "glow-neon",
  "font-sans",
  "font-mono",
  "pad-card",
  "pad-row",
  "nav-pad",
  "row-min",
  "tab-pad",
]);

const THEME_VALUE_RE =
  /^(?:oklch\([^)]+\)|#[0-9a-fA-F]{3,8}|\d+(?:\.\d+)?(?:px|rem|em|%)|"[^"]{1,80}"|'[^']{1,80}'|var\(--[a-z0-9-]+\)|rgba?\([^)]+\)|[a-zA-Z0-9 ,\-_/]{1,120})$/;

/** Strip unsafe / unknown themeOverrides (security: values → style.setProperty). */
export function sanitizeThemeOverrides(
  raw: unknown,
): Record<string, string> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!THEME_VAR_ALLOWLIST.has(k)) continue;
    if (typeof v !== "string") continue;
    const val = v.trim();
    if (!val || !THEME_VALUE_RE.test(val)) continue;
    out[k] = val;
  }
  return Object.keys(out).length ? out : undefined;
}

/** Citation for an agentically-composed block (build_layout_block grounding). */
const LayoutSource = z.object({
  ref: z.string(),
  label: z.string().optional(),
  url: z.string().optional(),
  kind: z.string().optional(),
});

/** Open Design level-row story DAG — one horizontal band = one topological level. */
const DagLevel = z.object({
  level: z.number().int().min(0),
  label: z.string(),
  /** Scroll playback threshold 0–1 (optional; home minimap). */
  at: z.number().min(0).max(1).optional(),
  /** Block ids belonging to this level (order preserved within the band). */
  nodes: z.array(z.string()).default([]),
  /**
   * Peer columns inside this band (1–4). Omit = min(4, node count).
   * Use 1 for deep-dive / long-form levels so each block gets a full row.
   */
  cols: z.number().int().min(1).max(4).optional(),
});

const DagMeta = z.object({
  levels: z.array(DagLevel).default([]),
});

export const LayoutSchema = z.object({
  version: z.literal(1),
  meta: z.object({
    audience: z
      .enum(["recruiter", "hiring-manager", "peer", "default"])
      .default("default"),
    generatedAt: z.string(),
    /** Optional vibe from design_layout; renderer applies only registered themes. */
    theme: z.string().optional(),
    /** Global accent axis (re-points --amber). Amber is default — omit attribute. */
    accent: AccentId.optional(),
    /** Validated CSS-var overrides (allowlisted keys + strict value regex). */
    themeOverrides: z
      .record(z.string())
      .optional()
      .transform((v) => sanitizeThemeOverrides(v)),
    /** Aggregated citations from agentically-composed blocks (build_layout_block). */
    sources: z.array(LayoutSource).optional(),
    /** GenUI / scoped compose signals (optional; omit on plain snapshots). */
    mode: z.string().optional(),
    curationLabel: z.string().optional(),
    scopedProjectCount: z.number().int().optional(),
    /**
     * Level-row matrix DAG (Open Design). When present, LayoutRenderer groups
     * blocks into horizontal bands; missing → simple stagger fallback.
     */
    dag: DagMeta.optional(),
    /** Job-bake framing (OCT job_tailor) — optional. */
    jobCompany: z.string().optional(),
    jobRole: z.string().optional(),
    jobBriefHash: z.string().optional(),
    tailored: z.boolean().optional(),
    contentFingerprint: z.string().optional(),
    composePath: z.string().optional(),
    structureMode: z.string().optional(),
    recipeId: z.string().optional(),
    juryComposite: z.number().optional(),
    evidencePackHash: z.string().optional(),
    planSource: z.string().optional(),
    enrichment: z.string().optional(),
    patchedBlockIds: z.array(z.string()).optional(),
  }),
  blocks: z.array(
    z.discriminatedUnion("type", [
      Hero,
      ProjectGrid,
      StatStrip,
      StarStory,
      ArchDiagram,
      CodeSnippet,
      Prose,
      Chart,
      Timeline,
      FlowAnim,
      KpiGrid,
      Comparison,
      QuickActions,
      Card,
      McpSandbox,
      CostSim,
      Composite,
      Scene2d,
      FishTank,
    ]),
  ),
});

export type Layout = z.infer<typeof LayoutSchema>;
export type CompositeNodeType = CompositeNode;
export type AccentIdType = z.infer<typeof AccentId>;
export type DomainIdType = z.infer<typeof DomainId>;
