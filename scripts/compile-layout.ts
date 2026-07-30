// Compile design/layout.yaml → src/content/layout.json. The YAML file is the
// human/agent-editable source of truth; the committed JSON is what the runtime loads.
// CI never generates — it only verifies sync via `npm run check:layout`.
//
//   npm run compile:layout   # write src/content/layout.json
//   npm run check:layout     # exit 1 if layout.json is stale vs layout.yaml
//
// Fragment entries in blocks:
//   - fragment: hero.compact
//     overrides: { slug: oct }
// are expanded against design/fragments.json before LayoutSchema.parse.

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "yaml";
import { ZodError } from "zod";
import { LayoutSchema, type Layout } from "../src/content/schema.js";

export interface CompileOptions {
  /** Valid theme ids (from src/themes). When set, the yaml `theme:` key must be one of them. */
  themeIds?: string[];
  /** Value substituted for `generatedAt: auto`. Defaults to the current ISO time. */
  generatedAt?: string;
  /** Fragment catalog snapshot (design/fragments.json). */
  fragmentsCatalog?: FragmentsCatalog;
}

export interface FragmentsCatalog {
  fragments?: Array<{
    id: string;
    blocks?: unknown[];
    [key: string]: unknown;
  }>;
}

export interface CompileResult {
  layout: Layout;
  /** Compile-time-only theme selection stripped from the emitted layout. */
  theme?: string;
}

type RawBlock =
  | { type: string; id?: string; props?: unknown; layout?: unknown; fragment?: never }
  | { fragment: string; overrides?: Record<string, unknown>; type?: never };

/** Expand {fragment, overrides?} entries using the committed fragments snapshot. */
export function expandFragmentBlocks(
  blocks: unknown[],
  catalog: FragmentsCatalog | undefined,
): unknown[] {
  const byId = new Map<string, { blocks?: unknown[] }>();
  for (const f of catalog?.fragments ?? []) {
    if (f && typeof f.id === "string") byId.set(f.id, f);
  }
  const known = [...byId.keys()].sort();
  const out: unknown[] = [];

  for (const entry of blocks) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      out.push(entry);
      continue;
    }
    const e = entry as RawBlock & Record<string, unknown>;
    if (typeof e.fragment === "string") {
      const frag = byId.get(e.fragment);
      if (!frag) {
        throw new Error(
          `unknown fragment "${e.fragment}" — known: ${known.join(", ") || "(none — run npm run gen:fragments)"}`,
        );
      }
      const fragBlocks = Array.isArray(frag.blocks) ? frag.blocks : [];
      if (!fragBlocks.length) {
        // Metadata-only catalog entry (live backend shape): cannot expand offline.
        // Leave a stable no-op prose so compile does not invent content.
        out.push({
          type: "prose",
          id: `fragment-placeholder-${e.fragment.replace(/[^a-z0-9_-]/gi, "-")}`,
          props: {
            markdown: `<!-- fragment:${e.fragment} (no baked blocks in design/fragments.json; run against live backend or gen:fragments with blocks) -->`,
          },
        });
        continue;
      }
      for (const b of fragBlocks) {
        out.push(b);
      }
      continue;
    }
    out.push(entry);
  }
  return out;
}

/** Pure yaml → validated layout compiler. Throws ZodError / Error on invalid input. */
export function compileLayout(
  yamlText: string,
  opts: CompileOptions = {},
): CompileResult {
  const raw: unknown = parse(yamlText);
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error("layout.yaml must contain a mapping at the top level");
  }

  const { theme, ...layoutInput } = raw as Record<string, unknown> & {
    theme?: unknown;
  };

  if (theme !== undefined) {
    if (typeof theme !== "string") {
      throw new Error("`theme` must be a string theme id");
    }
    if (opts.themeIds && !opts.themeIds.includes(theme)) {
      throw new Error(
        `unknown theme "${theme}" — known themes: ${opts.themeIds.join(", ")}`,
      );
    }
  }

  const meta = (layoutInput as { meta?: { generatedAt?: unknown } }).meta;
  if (meta && meta.generatedAt === "auto") {
    meta.generatedAt = opts.generatedAt ?? new Date().toISOString();
  }

  let fragmentsCatalog = opts.fragmentsCatalog;
  if (!fragmentsCatalog) {
    try {
      const fragmentsPath = resolve(import.meta.dirname, "../design/fragments.json");
      fragmentsCatalog = JSON.parse(readFileSync(fragmentsPath, "utf-8")) as FragmentsCatalog;
    } catch {
      fragmentsCatalog = { fragments: [] };
    }
  }

  const blocks = (layoutInput as { blocks?: unknown }).blocks;
  if (Array.isArray(blocks)) {
    (layoutInput as { blocks: unknown[] }).blocks = expandFragmentBlocks(
      blocks,
      fragmentsCatalog,
    );
  }

  const layout = LayoutSchema.parse(layoutInput);
  return { layout, theme: typeof theme === "string" ? theme : undefined };
}

/** Reads the `id` field of every src/themes/*.theme.json. */
export function readThemeIds(themesDir: string): string[] {
  return readdirSync(themesDir)
    .filter((f) => f.endsWith(".theme.json"))
    .map((f) => {
      const parsed = JSON.parse(readFileSync(resolve(themesDir, f), "utf-8"));
      return typeof parsed?.id === "string" ? parsed.id : "";
    })
    .filter(Boolean);
}

function printError(err: unknown) {
  if (err instanceof ZodError) {
    for (const issue of err.issues) {
      process.stderr.write(`[${issue.path.join(".")}] ${issue.message}\n`);
    }
  } else {
    process.stderr.write(`${String(err instanceof Error ? err.message : err)}\n`);
  }
}

/** Repo root — independent of process.cwd() so scripts work from any directory. */
const ROOT = resolve(import.meta.dirname, "..");

function main() {
  const check = process.argv.includes("--check");
  const yamlPath = resolve(ROOT, "design/layout.yaml");
  const jsonPath = resolve(ROOT, "src/content/layout.json");
  const themesDir = resolve(ROOT, "src/themes");

  const yamlText = readFileSync(yamlPath, "utf-8");

  let fragmentsCatalog: FragmentsCatalog | undefined;
  try {
    fragmentsCatalog = JSON.parse(
      readFileSync(resolve(ROOT, "design/fragments.json"), "utf-8"),
    ) as FragmentsCatalog;
  } catch {
    fragmentsCatalog = { fragments: [] };
  }

  // Under --check, `generatedAt: auto` must resolve to the committed value so
  // the comparison is deterministic (a fresh timestamp would always differ).
  let committedGeneratedAt: string | undefined;
  let committedJson: string | undefined;
  try {
    committedJson = readFileSync(jsonPath, "utf-8");
    committedGeneratedAt = JSON.parse(committedJson)?.meta?.generatedAt;
  } catch {
    committedJson = undefined;
  }

  let result: CompileResult;
  try {
    result = compileLayout(yamlText, {
      themeIds: readThemeIds(themesDir),
      generatedAt: check ? committedGeneratedAt : undefined,
      fragmentsCatalog,
    });
  } catch (err) {
    printError(err);
    process.exit(1);
  }

  const out = JSON.stringify(result.layout, null, 2) + "\n";

  if (check) {
    if (committedJson === undefined) {
      process.stderr.write(
        `src/content/layout.json missing — run: npm run compile:layout\n`,
      );
      process.exit(1);
    }
    if (out !== committedJson) {
      process.stderr.write(
        "src/content/layout.json is stale vs design/layout.yaml.\n" +
          "Run: npm run compile:layout && git add src/content/layout.json\n",
      );
      process.exit(1);
    }
    console.log("✓ layout.json is in sync with design/layout.yaml");
    return;
  }

  writeFileSync(jsonPath, out, "utf-8");
  console.log(`✓ Wrote ${jsonPath}`);
  console.log(
    `  audience: ${result.layout.meta.audience} | blocks: ${result.layout.blocks.length}` +
      (result.theme ? ` | theme: ${result.theme}` : ""),
  );
  console.log(
    `  Review the diff before committing: git diff src/content/layout.json`,
  );
}

// Only run the CLI when executed directly (not when imported by tests).
const isDirectRun = process.argv[1]?.replace(/\\/g, "/").endsWith("compile-layout.ts");
if (isDirectRun) main();
