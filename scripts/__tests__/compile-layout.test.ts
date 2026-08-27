import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ZodError } from "zod";
import { compileLayout, readThemeIds } from "../compile-layout";

const ROOT = resolve(import.meta.dirname, "../..");

const VALID_YAML = `
version: 1
theme: cozy
meta:
  audience: peer
  generatedAt: "2026-07-07T00:00:00Z"
blocks:
  - type: prose
    id: p1
    props:
      markdown: hello
`;

describe("compileLayout", () => {
  it("compiles valid yaml and strips the theme key", () => {
    const { layout, theme } = compileLayout(VALID_YAML, { themeIds: ["cozy"] });
    expect(theme).toBe("cozy");
    expect(layout.version).toBe(1);
    expect(layout.meta.audience).toBe("peer");
    expect(layout.blocks).toHaveLength(1);
    expect("theme" in layout).toBe(false);
  });

  it("resolves generatedAt: auto to the provided value", () => {
    const yaml = VALID_YAML.replace('"2026-07-07T00:00:00Z"', "auto");
    const { layout } = compileLayout(yaml, {
      generatedAt: "2026-01-01T00:00:00Z",
    });
    expect(layout.meta.generatedAt).toBe("2026-01-01T00:00:00Z");
  });

  it("stamps a fresh ISO time for auto when no value provided", () => {
    const yaml = VALID_YAML.replace('"2026-07-07T00:00:00Z"', "auto");
    const { layout } = compileLayout(yaml);
    expect(() => new Date(layout.meta.generatedAt)).not.toThrow();
    expect(layout.meta.generatedAt).not.toBe("auto");
  });

  it("rejects schema-violating yaml with ZodError", () => {
    const yaml = `
version: 1
meta: { audience: default, generatedAt: "x" }
blocks:
  - type: iframe
    id: bad
    props: {}
`;
    expect(() => compileLayout(yaml)).toThrow(ZodError);
  });

  it("rejects an unknown theme id", () => {
    expect(() => compileLayout(VALID_YAML, { themeIds: ["neon"] })).toThrow(
      /unknown theme/,
    );
  });

  it("rejects non-mapping yaml", () => {
    expect(() => compileLayout("- just\n- a list\n")).toThrow(/mapping/);
  });

  it("committed design/layout.yaml compiles byte-identical to layout.json (check invariant)", () => {
    const yamlText = readFileSync(resolve(ROOT, "design/layout.yaml"), "utf-8");
    const committed = readFileSync(
      resolve(ROOT, "src/content/layout.json"),
      "utf-8",
    );
    const committedGeneratedAt = JSON.parse(committed).meta.generatedAt;
    const { layout } = compileLayout(yamlText, {
      themeIds: readThemeIds(resolve(ROOT, "src/themes")),
      generatedAt: committedGeneratedAt,
    });
    expect(JSON.stringify(layout, null, 2) + "\n").toBe(committed);
  });
});

describe("readThemeIds", () => {
  it("finds the registered theme ids", () => {
    const ids = readThemeIds(resolve(ROOT, "src/themes"));
    expect(ids).toContain("cozy");
    expect(ids).toContain("neon");
    expect(ids).toContain("paper");
    expect(ids).toContain("mocha");
    expect(ids).toContain("latte");
    expect(ids).toContain("frappe");
    expect(ids).toContain("macchiato");
  });
});
