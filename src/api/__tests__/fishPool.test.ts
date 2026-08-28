import { describe, expect, it } from "vitest"
import { extractFishPool } from "../harness"

const SPECIMEN_A = {
  slug: "koi-1",
  name: "Kohaku Koi",
  blurb: "A classic red and white koi pattern",
  tags: ["freshwater", "pond"],
  reason: "Matches cold-water pond requirement",
  in_tank: false,
}

const SPECIMEN_B = {
  slug: "tetra-1",
  name: "Neon Tetra",
  blurb: "Vibrant schooling fish",
  tags: ["tropical", "schooling"],
  reason: "Great community fish",
  in_tank: false,
}

const SPECIMEN_REC = {
  slug: "guppy-1",
  name: "Fancy Guppy",
  blurb: "Colorful livebearer",
  tags: ["community"],
  reason: "Already flourishing in current layout",
  in_tank: true,
}

const BAD_ITEM_NO_SLUG = {
  name: "Unknown Fish",
  blurb: "Missing slug field",
}

const BAD_ITEM_BAD_NAME = {
  slug: "bad-fish",
  name: 12345,
}

describe("extractFishPool", () => {
  it("returns null when input is null, undefined, or not an object", () => {
    expect(extractFishPool(null)).toBeNull()
    expect(extractFishPool(undefined)).toBeNull()
    expect(extractFishPool("string")).toBeNull()
    expect(extractFishPool(123)).toBeNull()
    expect(extractFishPool(true)).toBeNull()
  })

  it("returns null when no pool data exists anywhere in the envelope", () => {
    expect(extractFishPool({})).toBeNull()
    expect(extractFishPool({ summary: "no pool here" })).toBeNull()
    expect(extractFishPool({ carry: { focus_slug: "weltel-ai" } })).toBeNull()
    expect(extractFishPool({ step_results: [{ status: "ok" }] })).toBeNull()
  })

  it("reads fish pool from carry", () => {
    const res = extractFishPool({
      carry: {
        pool_id: "pool-abc-123",
        fish_pool: [SPECIMEN_A],
        recommendations: [SPECIMEN_REC],
      },
    })
    expect(res).not.toBeNull()
    expect(res?.poolId).toBe("pool-abc-123")
    expect(res?.pool).toEqual([SPECIMEN_A])
    expect(res?.recommendations).toEqual([SPECIMEN_REC])
  })

  it("reads fish pool from response.carry", () => {
    const res = extractFishPool({
      response: {
        carry: {
          pool_id: "pool-response-carry",
          fish_pool: [SPECIMEN_A, SPECIMEN_B],
        },
      },
    })
    expect(res).not.toBeNull()
    expect(res?.poolId).toBe("pool-response-carry")
    expect(res?.pool).toHaveLength(2)
    expect(res?.recommendations).toEqual([])
  })

  it("reads fish pool on a bare top-level envelope object", () => {
    const res = extractFishPool({
      pool_id: "pool-top-level",
      fish_pool: [SPECIMEN_A],
    })
    expect(res).not.toBeNull()
    expect(res?.poolId).toBe("pool-top-level")
    expect(res?.pool).toEqual([SPECIMEN_A])
    expect(res?.recommendations).toEqual([])
  })

  it("reads from a step_results array entry, newest-first winning when multiple carry a pool", () => {
    const older = {
      pool_id: "pool-stage-1",
      fish_pool: [SPECIMEN_A],
    }
    const newer = {
      pool_id: "pool-stage-2",
      fish_pool: [SPECIMEN_B],
    }
    const res = extractFishPool({
      step_results: [older, newer],
    })
    expect(res).not.toBeNull()
    expect(res?.poolId).toBe("pool-stage-2")
    expect(res?.pool).toEqual([SPECIMEN_B])
  })

  it("drops invalid items while keeping valid siblings", () => {
    const res = extractFishPool({
      carry: {
        pool_id: "pool-mixed",
        fish_pool: [SPECIMEN_A, BAD_ITEM_NO_SLUG, BAD_ITEM_BAD_NAME, SPECIMEN_B],
      },
    })
    expect(res).not.toBeNull()
    expect(res?.pool).toEqual([SPECIMEN_A, SPECIMEN_B])
  })

  it("parses camelCase fishPool and poolId identically to snake_case", () => {
    const res = extractFishPool({
      carry: {
        poolId: "pool-camel-case",
        fishPool: [SPECIMEN_A],
      },
    })
    expect(res).not.toBeNull()
    expect(res?.poolId).toBe("pool-camel-case")
    expect(res?.pool).toEqual([SPECIMEN_A])
  })

  it("parses recommendations into .recommendations without merging into .pool", () => {
    const res = extractFishPool({
      carry: {
        pool_id: "pool-with-recs",
        fish_pool: [SPECIMEN_A],
        recommendations: [SPECIMEN_REC],
      },
    })
    expect(res).not.toBeNull()
    expect(res?.pool).toEqual([SPECIMEN_A])
    expect(res?.recommendations).toEqual([SPECIMEN_REC])
  })

  it("returns { poolId, pool: [], recommendations: [] } when envelope has only pool_id and no arrays", () => {
    const res = extractFishPool({
      carry: {
        pool_id: "pool-empty-arrays",
      },
    })
    expect(res).toEqual({
      poolId: "pool-empty-arrays",
      pool: [],
      recommendations: [],
    })
  })

  it("handles blank pool_id appropriately", () => {
    const res = extractFishPool({
      carry: {
        pool_id: "   ",
        fish_pool: [SPECIMEN_A],
      },
    })
    expect(res).not.toBeNull()
    expect(res?.poolId).toBeNull()
    expect(res?.pool).toEqual([SPECIMEN_A])

    expect(extractFishPool({ carry: { pool_id: "   " } })).toBeNull()
  })
})
