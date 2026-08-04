/**
 * Pure layout math for Scene2dCanvas, split out so it's testable without a
 * DOM/canvas context (this repo has no jsdom/@testing-library/react render-test
 * infra -- see src/blocks/__tests__/scene2dLayout.test.ts).
 */

export interface Scene2dNode {
  id: string;
  label: string;
  group?: string;
}

export type Scene2dPreset = "orbit" | "pulse-grid" | "particle-field";

export interface Scene2dMotion {
  speed: number;
  loop: boolean;
  intensity: number;
}

export interface Point {
  x: number;
  y: number;
}

export const SCENE2D_WIDTH = 480;
export const SCENE2D_HEIGHT = 220;

/** Deterministic pseudo-random unit value from a string id (no Math.random --
 * keeps particle-field layout stable across renders/re-runs/tests). */
export function hashToUnit(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return (h % 1000) / 1000;
}

/** Compute node positions for time `t` (seconds since first frame) under a preset. */
export function computeScene2dLayout(
  preset: Scene2dPreset,
  nodes: Scene2dNode[],
  motion: Scene2dMotion,
  t: number,
  width: number = SCENE2D_WIDTH,
  height: number = SCENE2D_HEIGHT,
): Map<string, Point> {
  const positions = new Map<string, Point>();
  const n = Math.max(1, nodes.length);
  const cx = width / 2;
  const cy = height / 2;

  if (preset === "orbit") {
    const r = Math.min(width, height) / 2 - 40;
    nodes.forEach((node, i) => {
      const a = (i / n) * Math.PI * 2 + t * 0.15 * motion.speed;
      positions.set(node.id, { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) * 0.6 });
    });
  } else if (preset === "pulse-grid") {
    const cols = Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);
    const cellW = width / (cols + 1);
    const cellH = height / (rows + 1);
    nodes.forEach((node, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      positions.set(node.id, { x: cellW * (col + 1), y: cellH * (row + 1) });
    });
  } else {
    nodes.forEach((node) => {
      const u = hashToUnit(node.id);
      const v = hashToUnit(`${node.id}:y`);
      const driftX = Math.sin(t * 0.3 * motion.speed + u * 10) * 8 * motion.intensity;
      const driftY = Math.cos(t * 0.25 * motion.speed + v * 10) * 8 * motion.intensity;
      positions.set(node.id, {
        x: 40 + u * (width - 80) + driftX,
        y: 40 + v * (height - 80) + driftY,
      });
    });
  }
  return positions;
}

/** Pulsing radius for a pulse-grid node at time t (5px flat for other presets / reduced motion). */
export function pulseRadius(
  preset: Scene2dPreset,
  nodeId: string,
  motion: Scene2dMotion,
  t: number,
  reduced: boolean,
): number {
  if (preset !== "pulse-grid" || reduced) return 5;
  return Math.max(2, 4 + Math.sin(t * 2 * motion.speed + hashToUnit(nodeId) * 10) * 2 * motion.intensity);
}
