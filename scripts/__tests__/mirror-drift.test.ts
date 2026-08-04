// Guards the cross-repo schema mirror: every block type in schema.ts must be
// known to the Python mirror (design/mirror-manifest.json) or explicitly
// flagged as pending sync via design/pending-mirror/*-<type>.md.
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { LayoutSchema } from "../../src/content/schema";

const ROOT = resolve(import.meta.dirname, "../..");

function schemaBlockTypes(): string[] {
  const union = LayoutSchema.shape.blocks.element;
  return [...union.optionsMap.keys()].map(String);
}

describe("Python mirror drift", () => {
  it("every schema block type is in mirror-manifest or flagged in pending-mirror", () => {
    const manifest = JSON.parse(
      readFileSync(resolve(ROOT, "design/mirror-manifest.json"), "utf-8"),
    ) as { pythonMirrorBlockTypes: string[] };

    const pendingDir = resolve(ROOT, "design/pending-mirror");
    const pendingFiles = existsSync(pendingDir) ? readdirSync(pendingDir) : [];

    const uncovered = schemaBlockTypes().filter(
      (type) =>
        !manifest.pythonMirrorBlockTypes.includes(type) &&
        !pendingFiles.some((f) => f.endsWith(`-${type}.md`)),
    );

    expect(
      uncovered,
      `Block types missing from the Python mirror (OpenCat-Mcp-Full/utils/ui_layout_schema.py). ` +
        `Either sync the mirror + update design/mirror-manifest.json, or add ` +
        `design/pending-mirror/<yyyy-mm-dd>-<type>.md with the Pydantic patch: ${uncovered.join(", ")}`,
    ).toEqual([]);
  });

  it("manifest does not claim types the schema no longer has", () => {
    const manifest = JSON.parse(
      readFileSync(resolve(ROOT, "design/mirror-manifest.json"), "utf-8"),
    ) as { pythonMirrorBlockTypes: string[] };
    const types = schemaBlockTypes();
    const stale = manifest.pythonMirrorBlockTypes.filter(
      (t) => !types.includes(t),
    );
    expect(stale).toEqual([]);
  });
});
