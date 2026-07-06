// Layout generation script — NEVER runs in CI. The commit is the gate.
// Run manually: npm run gen:layout [-- --audience=<recruiter|hiring-manager|peer|default>]
// Requires a local OCT backend at OCT_URL (default: http://localhost:10000).

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ZodError } from "zod";
import { LayoutSchema } from "../src/content/schema.js";

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

  const outPath = resolve(process.cwd(), "src/content/layout.json");
  writeFileSync(outPath, JSON.stringify(parsed, null, 2) + "\n", "utf-8");

  const blockCount = parsed.blocks.length;
  console.log(`✓ Wrote ${outPath}`);
  console.log(`  audience: ${audience} | blocks: ${blockCount}`);
  console.log(
    `  Review the diff before committing: git diff src/content/layout.json`,
  );
}

main().catch((err) => {
  process.stderr.write(`unexpected error: ${String(err)}\n`);
  process.exit(1);
});
