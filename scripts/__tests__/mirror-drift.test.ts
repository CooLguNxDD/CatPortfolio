// Guards the cross-repo schema mirror: every block type in schema.ts must be
// known to the Python mirror (design/mirror-manifest.json) or explicitly
// flagged as pending sync via design/pending-mirror/*.md. Also guards the
// theme-var allowlist and composite DSL kinds/caps against the same kind of
// drift that let THEME_VAR_ALLOWLIST silently diverge from the Python side
// (see OpenCat-Mcp-Full plugins/portfolio_plugin/design_system.py
// _TOKEN_ALIASES) before the manifest tracked anything but block types.
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  LayoutSchema,
  THEME_VAR_ALLOWLIST,
  LEAF_KINDS,
  CONTAINER_KINDS,
  COMPOSITE_MAX_DEPTH,
  COMPOSITE_MAX_NODES,
} from "../../src/content/schema";

const ROOT = resolve(import.meta.dirname, "../..");

type Manifest = {
  pythonMirrorBlockTypes: string[];
  themeVarAllowlist?: string[];
  compositeLeafKinds?: string[];
  compositeContainerKinds?: string[];
  compositeMaxDepth?: number;
  compositeMaxNodes?: number;
};

function readManifest(): Manifest {
  return JSON.parse(
    readFileSync(resolve(ROOT, "design/mirror-manifest.json"), "utf-8"),
  ) as Manifest;
}

function schemaBlockTypes(): string[] {
  const union = LayoutSchema.shape.blocks.element;
  return [...union.optionsMap.keys()].map(String);
}

describe("Python mirror drift", () => {
  it("every schema block type is in mirror-manifest or flagged in pending-mirror", () => {
    const manifest = readManifest();

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
    const manifest = readManifest();
    const types = schemaBlockTypes();
    const stale = manifest.pythonMirrorBlockTypes.filter(
      (t) => !types.includes(t),
    );
    expect(stale).toEqual([]);
  });

  it("themeVarAllowlist matches schema.ts's THEME_VAR_ALLOWLIST exactly", () => {
    const manifest = readManifest();
    const actual = [...THEME_VAR_ALLOWLIST].sort();
    const declared = [...(manifest.themeVarAllowlist ?? [])].sort();
    expect(
      declared,
      "design/mirror-manifest.json's themeVarAllowlist has drifted from " +
        "schema.ts's exported THEME_VAR_ALLOWLIST -- update the manifest " +
        "(and the Python utils/ui_layout_schema.py THEME_VAR_ALLOWLIST + " +
        "vendored test/fixtures/mirror-manifest.json in the same PR).",
    ).toEqual(actual);
  });

  it("compositeLeafKinds matches schema.ts's LEAF_KINDS exactly", () => {
    const manifest = readManifest();
    const actual = [...LEAF_KINDS].sort();
    const declared = [...(manifest.compositeLeafKinds ?? [])].sort();
    expect(declared).toEqual(actual);
  });

  it("compositeContainerKinds matches schema.ts's CONTAINER_KINDS exactly", () => {
    const manifest = readManifest();
    const actual = [...CONTAINER_KINDS].sort();
    const declared = [...(manifest.compositeContainerKinds ?? [])].sort();
    expect(declared).toEqual(actual);
  });

  it("compositeMaxDepth / compositeMaxNodes match schema.ts's caps", () => {
    const manifest = readManifest();
    expect(manifest.compositeMaxDepth).toBe(COMPOSITE_MAX_DEPTH);
    expect(manifest.compositeMaxNodes).toBe(COMPOSITE_MAX_NODES);
  });
});
