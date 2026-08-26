// Fetch backend theme_defs → src/themes/*.theme.json (manual / pre-release).
//
//   npm run gen:themes     # write theme JSON from live OCT
//   npm run check:themes   # exit 1 if on-disk files drifted (needs OCT_URL)
//
// Manual only — never CI. Same constraint as gen:fragments: check:layout
// reads the local directory; this fetch needs a reachable OpenCat server.
//
//   Uses OCT runtime config / VITE_OCT_URL / default localhost:8000.

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const THEMES_DIR = resolve(ROOT, "src/themes");

interface ThemeDefPayload {
  label?: string;
  description?: string;
  default?: boolean;
  extends?: string;
  vars?: Record<string, string>;
}

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

function toFileBody(id: string, def: ThemeDefPayload): string {
  const body: Record<string, unknown> = { id };
  if (typeof def.label === "string") body.label = def.label;
  if (typeof def.description === "string") body.description = def.description;
  if (typeof def.default === "boolean") body.default = def.default;
  if (typeof def.extends === "string") body.extends = def.extends;
  body.vars = def.vars ?? {};
  return JSON.stringify(body, null, 2) + "\n";
}

async function fetchDefs(): Promise<Record<string, ThemeDefPayload>> {
  const url = `${baseUrl()}/api/portfolio/public/design-context`;
  const res = await fetch(url);
  if (!res.ok) {
    process.stderr.write(
      `Failed to fetch theme_defs (${res.status}): ${url}\n` +
        `Start OpenCat or set OCT_URL.\n`,
    );
    process.exit(1);
  }
  const data = (await res.json()) as { theme_defs?: Record<string, ThemeDefPayload> };
  const defs = data.theme_defs;
  if (!defs || typeof defs !== "object" || Array.isArray(defs)) {
    process.stderr.write(
      `design-context at ${url} has no theme_defs object.\n`,
    );
    process.exit(1);
  }
  return defs;
}

function existingThemeFiles(): string[] {
  if (!existsSync(THEMES_DIR)) return [];
  return readdirSync(THEMES_DIR).filter((f) => f.endsWith(".theme.json"));
}

async function main() {
  const check = process.argv.includes("--check");
  const defs = await fetchDefs();
  const expectedFiles = new Set(Object.keys(defs).map((id) => `${id}.theme.json`));
  const onDisk = existingThemeFiles();

  let drifted = false;
  for (const file of onDisk) {
    if (!expectedFiles.has(file)) {
      process.stderr.write(`on disk but not in theme_defs: ${file}\n`);
      drifted = true;
    }
  }

  for (const [id, def] of Object.entries(defs)) {
    const filename = `${id}.theme.json`;
    const path = resolve(THEMES_DIR, filename);
    const body = toFileBody(id, def);
    if (check) {
      if (!existsSync(path)) {
        process.stderr.write(`missing theme file: src/themes/${filename}\n`);
        drifted = true;
        continue;
      }
      const current = readFileSync(path, "utf-8");
      if (current !== body) {
        process.stderr.write(`drift: src/themes/${filename}\n`);
        drifted = true;
      }
    } else {
      writeFileSync(path, body, "utf-8");
    }
  }

  if (check) {
    if (drifted) {
      process.stderr.write("Run: npm run gen:themes && git add src/themes/*.theme.json\n");
      process.exit(1);
    }
    console.log("✓ src/themes/*.theme.json is in sync with OCT theme_defs");
    return;
  }

  console.log(`✓ Wrote ${Object.keys(defs).length} theme files to ${THEMES_DIR}`);
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
