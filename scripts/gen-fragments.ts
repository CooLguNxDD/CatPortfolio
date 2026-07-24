// Fetch backend fragment catalog → design/fragments.json (manual only — never CI).
//
//   npm run gen:fragments
//
// Uses OCT runtime config / VITE_OCT_URL / default localhost:8000.

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const OUT = resolve(ROOT, "design/fragments.json");

function baseUrl(): string {
  const fromEnv =
    process.env.OCT_URL ||
    process.env.VITE_OCT_URL ||
    process.env.npm_config_oct_url;
  if (fromEnv && typeof fromEnv === "string" && fromEnv.trim()) {
    return fromEnv.replace(/\/$/, "");
  }
  return "http://localhost:8000";
}

async function main() {
  const url = `${baseUrl()}/api/portfolio/public/fragments`;
  const res = await fetch(url);
  if (!res.ok) {
    process.stderr.write(
      `Failed to fetch fragments (${res.status}): ${url}\n` +
        `Start OpenCat or set OCT_URL. Catalog snapshot left unchanged.\n`,
    );
    process.exit(1);
  }
  const data = (await res.json()) as {
    fragments?: unknown[];
    quick_actions?: unknown[];
    themes?: string[];
    presets?: string[];
  };

  // FE compile path needs optional pre-baked blocks when available; backend
  // catalog is metadata-only — store as-is; compile expands via id lookup.
  const out = {
    generatedAt: new Date().toISOString(),
    source: url,
    fragments: data.fragments ?? [],
    quick_actions: data.quick_actions ?? [],
    themes: data.themes ?? ["cozy", "neon", "paper"],
    presets: data.presets ?? [],
  };

  writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n", "utf-8");
  console.log(`✓ Wrote ${OUT}`);
  console.log(`  fragments: ${(data.fragments ?? []).length}`);
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
