import { describe, expect, it } from "vitest"
import { WakeTrailPool } from "../wakeTrails"

describe("WakeTrailPool", () => {
  it("initializes with inactive particles", () => {
    const pool = new WakeTrailPool(50)
    expect(pool.activeCount()).toBe(0)
  })

  it("emits wake particles and updates lifetime", () => {
    const pool = new WakeTrailPool(50)
    pool.emit(10, 5, 2, { r: 0.2, g: 0.8, b: 1.0 }, { maxLife: 1.0 })

    expect(pool.activeCount()).toBe(1)
    expect(pool.particles[0].x).toBeCloseTo(10, 0)
    expect(pool.particles[0].r).toBe(0.2)

    // Advance halfway through lifetime
    pool.update(0.5)
    expect(pool.activeCount()).toBe(1)
    expect(pool.particles[0].alpha).toBeGreaterThan(0)
    expect(pool.particles[0].alpha).toBeLessThan(1)

    // Advance past max lifetime
    pool.update(0.6)
    expect(pool.activeCount()).toBe(0)
  })

  it("handles circular buffer rollover safely", () => {
    const pool = new WakeTrailPool(5)
    for (let i = 0; i < 10; i++) {
      pool.emit(i, 0, 0, { r: 1, g: 1, b: 1 })
    }
    expect(pool.activeCount()).toBe(5)
  })
})
