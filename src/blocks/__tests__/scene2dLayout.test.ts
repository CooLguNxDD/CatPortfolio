import { describe, it, expect } from "vitest";
import {
  computeScene2dLayout,
  hashToUnit,
  pulseRadius,
  SCENE2D_HEIGHT,
  SCENE2D_WIDTH,
  type Scene2dMotion,
  type Scene2dNode,
} from "../scene2dLayout";

// Note: this repo has no jsdom/@testing-library/react render-test infra
// (Scene2dCanvas is a canvas/rAF component, untestable at the DOM level
// without adding that infra), so the layout math is split into this
// DOM-free pure module and tested directly here instead.

const NODES: Scene2dNode[] = [
  { id: "root", label: "Portfolio" },
  { id: "p0", label: "OpenCat Tunnel" },
  { id: "p1", label: "CatPortfolio" },
];

const MOTION: Scene2dMotion = { speed: 1, loop: true, intensity: 1 };

describe("hashToUnit", () => {
  it("is deterministic for the same id", () => {
    expect(hashToUnit("p0")).toBe(hashToUnit("p0"));
  });

  it("returns a value in [0, 1)", () => {
    for (const id of ["a", "root", "p0", "very-long-node-id-here"]) {
      const u = hashToUnit(id);
      expect(u).toBeGreaterThanOrEqual(0);
      expect(u).toBeLessThan(1);
    }
  });

  it("differs for different ids (not a constant)", () => {
    const values = new Set(["a", "b", "c", "root", "p0", "p1"].map(hashToUnit));
    expect(values.size).toBeGreaterThan(1);
  });
});

describe("computeScene2dLayout", () => {
  it("positions every node for each preset", () => {
    for (const preset of ["orbit", "pulse-grid", "particle-field"] as const) {
      const positions = computeScene2dLayout(preset, NODES, MOTION, 0);
      expect(positions.size).toBe(NODES.length);
      for (const node of NODES) {
        expect(positions.has(node.id)).toBe(true);
      }
    }
  });

  it("keeps positions within the canvas bounds (with drift headroom)", () => {
    for (const preset of ["orbit", "pulse-grid", "particle-field"] as const) {
      for (const t of [0, 1, 5, 20]) {
        const positions = computeScene2dLayout(preset, NODES, MOTION, t);
        for (const p of positions.values()) {
          expect(p.x).toBeGreaterThan(-20);
          expect(p.x).toBeLessThan(SCENE2D_WIDTH + 20);
          expect(p.y).toBeGreaterThan(-20);
          expect(p.y).toBeLessThan(SCENE2D_HEIGHT + 20);
        }
      }
    }
  });

  it("orbit rotates nodes over time (t changes positions)", () => {
    const a = computeScene2dLayout("orbit", NODES, MOTION, 0);
    const b = computeScene2dLayout("orbit", NODES, MOTION, 5);
    expect(a.get("p0")).not.toEqual(b.get("p0"));
  });

  it("pulse-grid layout is time-invariant (only the pulse radius animates, not position)", () => {
    const a = computeScene2dLayout("pulse-grid", NODES, MOTION, 0);
    const b = computeScene2dLayout("pulse-grid", NODES, MOTION, 5);
    expect(a).toEqual(b);
  });

  it("particle-field is deterministic given the same t (no Math.random)", () => {
    const a = computeScene2dLayout("particle-field", NODES, MOTION, 3);
    const b = computeScene2dLayout("particle-field", NODES, MOTION, 3);
    expect(a).toEqual(b);
  });

  it("handles zero nodes without throwing", () => {
    for (const preset of ["orbit", "pulse-grid", "particle-field"] as const) {
      const positions = computeScene2dLayout(preset, [], MOTION, 0);
      expect(positions.size).toBe(0);
    }
  });

  it("higher motion.speed changes orbit position faster (same t)", () => {
    const slow = computeScene2dLayout("orbit", NODES, { ...MOTION, speed: 0.2 }, 2);
    const fast = computeScene2dLayout("orbit", NODES, { ...MOTION, speed: 2 }, 2);
    expect(slow.get("p0")).not.toEqual(fast.get("p0"));
  });
});

describe("pulseRadius", () => {
  it("is flat (5) for non-pulse-grid presets regardless of motion", () => {
    expect(pulseRadius("orbit", "p0", MOTION, 3, false)).toBe(5);
    expect(pulseRadius("particle-field", "p0", MOTION, 3, false)).toBe(5);
  });

  it("is flat (5) for pulse-grid when reduced motion is requested", () => {
    expect(pulseRadius("pulse-grid", "p0", MOTION, 3, true)).toBe(5);
  });

  it("varies over time for pulse-grid when motion is not reduced", () => {
    const r1 = pulseRadius("pulse-grid", "p0", MOTION, 0, false);
    const r2 = pulseRadius("pulse-grid", "p0", MOTION, 1, false);
    expect(r1).not.toBe(r2);
  });

  it("never goes below the 2px floor", () => {
    for (let t = 0; t < 10; t += 0.3) {
      expect(pulseRadius("pulse-grid", "p0", { speed: 1, loop: true, intensity: 2 }, t, false)).toBeGreaterThanOrEqual(2);
    }
  });
});
