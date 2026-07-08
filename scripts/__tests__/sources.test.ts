import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "yaml";
import { SourcesSchema } from "../sources-schema";

const ROOT = resolve(import.meta.dirname, "../..");

describe("SourcesSchema validation", () => {
  it("successfully parses the committed design/sources.yaml", () => {
    const yamlPath = resolve(ROOT, "design/sources.yaml");
    const yamlContent = readFileSync(yamlPath, "utf-8");
    const parsed = parse(yamlContent);
    const result = SourcesSchema.safeParse(parsed);
    
    if (!result.success) {
      console.error(JSON.stringify(result.error.format(), null, 2));
    }
    expect(result.success).toBe(true);
  });

  it("rejects invalid kinds", () => {
    const invalidYaml = {
      version: 1,
      sources: [
        {
          id: "bad-source",
          kind: "ftp",
          ref: "ftp://example.com"
        }
      ]
    };
    const result = SourcesSchema.safeParse(invalidYaml);
    expect(result.success).toBe(false);
  });

  it("rejects invalid github ref format", () => {
    const invalidYaml = {
      version: 1,
      sources: [
        {
          id: "bad-gh",
          kind: "github",
          ref: "invalid_ref_format"
        }
      ]
    };
    const result = SourcesSchema.safeParse(invalidYaml);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('github ref must be "owner/repo"');
    }
  });

  it("rejects github refs with leading/trailing . or - in a segment", () => {
    for (const ref of ["-owner/repo", "owner/-repo", ".owner/repo", "owner/repo.", "owner-/repo"]) {
      const result = SourcesSchema.safeParse({
        version: 1,
        sources: [{ id: "bad-gh", kind: "github", ref }],
      });
      expect(result.success).toBe(false);
    }
  });

  it("accepts valid github owner/repo refs", () => {
    for (const ref of ["a/b", "CooLguNxDD/CatPortfolio", "org-name/repo_name", "o.r/r-e_p.o"]) {
      const result = SourcesSchema.safeParse({
        version: 1,
        sources: [{ id: "ok-gh", kind: "github", ref }],
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid url format", () => {
    const invalidYaml = {
      version: 1,
      sources: [
        {
          id: "bad-url",
          kind: "url",
          ref: "not_a_url"
        }
      ]
    };
    const result = SourcesSchema.safeParse(invalidYaml);
    expect(result.success).toBe(false);
  });

  it("rejects duplicate source IDs", () => {
    const duplicateYaml = {
      version: 1,
      sources: [
        {
          id: "dup-id",
          kind: "github",
          ref: "owner/repo"
        },
        {
          id: "dup-id",
          kind: "url",
          ref: "https://example.com"
        }
      ]
    };
    const result = SourcesSchema.safeParse(duplicateYaml);
    expect(result.success).toBe(false);
    if (!result.success) {
      const errorMsg = result.error.errors[0].message;
      expect(errorMsg).toContain('Duplicate source id: "dup-id"');
    }
  });
});
