// Seed a layout draft from OCT's deterministic composer — NEVER runs in CI.
// Fetches ${OCT_URL}/portfolio/layout, validates, writes design/layout.yaml
// (the source of truth), then compiles it to src/content/layout.json.
// The commit is still the gate: review the diff before committing.
// Run manually: npm run gen:layout [-- --audience=<recruiter|hiring-manager|peer|default>]

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { stringify } from "yaml";
import { ZodError } from "zod";
import { LayoutSchema } from "../src/content/schema.js";
import { compileLayout, readThemeIds } from "./compile-layout.js";

const base =
  process.env.OCT_URL ?? process.env.VITE_OCT_URL ?? "http://localhost:10000";

const audienceArg = process.argv
  .slice(2)
  .find((a) => a.startsWith("--audience="));
const audience = audienceArg ? audienceArg.split("=")[1] : "default";

async function main() {
  const url = `${base}/portfolio/layout?audience=${audience}`;

  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  } catch (err) {
    process.stderr.write(`fetch error: ${String(err)}\n`);
    process.exit(1);
  }

  if (!res.ok) {
    process.stderr.write(`OCT returned ${res.status}\n`);
    process.exit(1);
  }

  let parsed: ReturnType<typeof LayoutSchema.parse>;
  try {
    parsed = LayoutSchema.parse(await res.json());
  } catch (err) {
    if (err instanceof ZodError) {
      for (const issue of err.issues) {
        process.stderr.write(`[${issue.path.join(".")}] ${issue.message}\n`);
      }
    } else {
      process.stderr.write(`parse error: ${String(err)}\n`);
    }
    process.exit(1);
  }

  // Preserve the current theme selection from the existing yaml, if any.
  const yamlPath = resolve(process.cwd(), "design/layout.yaml");
  let theme = "cozy";
  try {
    const existing = readFileSync(yamlPath, "utf-8");
    const m = existing.match(/^theme:\s*(\S+)\s*$/m);
    if (m) theme = m[1];
  } catch {
    /* no existing yaml — use default */
  }

  const yamlText =
    "# Draft seeded from OCT's composer via npm run gen:layout.\n" +
    "# Review, edit, then: npm run compile:layout\n" +
    stringify({ version: parsed.version, theme, meta: parsed.meta, blocks: parsed.blocks });
  writeFileSync(yamlPath, yamlText, "utf-8");

  const { layout } = compileLayout(yamlText, {
    themeIds: readThemeIds(resolve(process.cwd(), "src/themes")),
  });
  const jsonPath = resolve(process.cwd(), "src/content/layout.json");
  writeFileSync(jsonPath, JSON.stringify(layout, null, 2) + "\n", "utf-8");

  console.log(`✓ Wrote ${yamlPath}`);
  console.log(`✓ Wrote ${jsonPath}`);
  console.log(`  audience: ${audience} | blocks: ${layout.blocks.length}`);
  console.log(`  Review the diff before committing: git diff design/ src/content/`);
}

main().catch((err) => {
  process.stderr.write(`unexpected error: ${String(err)}\n`);
  process.exit(1);
});
