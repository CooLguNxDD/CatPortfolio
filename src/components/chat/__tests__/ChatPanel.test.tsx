import { describe, expect, it } from "vitest"
import { patchDirective } from "../ChatPanel"

describe("patchDirective", () => {
  it("instructs patch_job_layout with base_short_id", () => {
    const d = patchDirective("job_bake_1")
    expect(d).toContain("patch_job_layout")
    expect(d).toContain("job_bake_1")
    expect(d).toContain("build_layout_block")
    expect(d).toContain("do NOT bake_portfolio_for_job")
  })

  it("includes derived_short_id when provided", () => {
    const d = patchDirective("job_bake_1", "derived_2")
    expect(d).toContain("derived_2")
    expect(d).toContain("derived_short_id")
  })
})
