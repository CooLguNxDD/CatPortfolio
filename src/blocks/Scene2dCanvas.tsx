import { useEffect, useMemo, useRef } from "react";
import {
  computeScene2dLayout,
  pulseRadius,
  SCENE2D_HEIGHT as H,
  SCENE2D_WIDTH as W,
  type Scene2dMotion,
  type Scene2dNode,
  type Scene2dPreset,
} from "./scene2dLayout";
import { useThemeTokens } from "@/hooks/useThemeTokens";

interface Scene2dEdge {
  from: string;
  to: string;
  label?: string;
}

interface Scene2dCanvasProps {
  preset: Scene2dPreset;
  nodes: Scene2dNode[];
  edges: Scene2dEdge[];
  palette?: "amber" | "pink" | "neon" | "cyan" | "violet";
  motion: Scene2dMotion;
  reduced: boolean;
}

/**
 * Canvas 2D renderer for scene2d blocks. renderer="webgl" would swap this
 * component (schema widening, not a rewrite) -- see schema.ts's Scene2d
 * comment. Layout math lives in scene2dLayout.ts (DOM-free, unit-tested);
 * this component is the DOM/canvas glue + rAF loop. The rAF scheduling and
 * cleanup structure stays independent of whether a 2D context is actually
 * obtainable (jsdom in tests returns null from getContext) so the loop can
 * still be exercised and cancelled correctly without a real canvas.
 */
export default function Scene2dCanvas({
  preset,
  nodes,
  edges,
  palette,
  motion,
  reduced,
}: Scene2dCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const tokenNames = useMemo(
    () => [palette ?? "amber", "fg-muted", "hairline"] as const,
    [palette],
  );
  const tokens = useThemeTokens(tokenNames);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d") ?? null;

    if (canvas && ctx) {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.scale(dpr, dpr);
    }

    const accentKey = palette ?? "amber";
    const accent = tokens[accentKey] || "#e8a33d";
    const muted = tokens["fg-muted"] || "#8a8072";
    const lineColor = tokens["hairline"] || "rgba(255,255,255,0.15)";

    function draw(t: number) {
      if (!ctx) return;
      const positions = computeScene2dLayout(preset, nodes, motion, t);
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 1;
      edges.forEach((edge) => {
        const a = positions.get(edge.from);
        const b = positions.get(edge.to);
        if (!a || !b) return;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      });
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      nodes.forEach((node) => {
        const p = positions.get(node.id);
        if (!p) return;
        const radius = pulseRadius(preset, node.id, motion, t, reduced);
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = accent;
        ctx.fill();
        ctx.fillStyle = muted;
        ctx.fillText(node.label.slice(0, 14), p.x, p.y + 16);
      });
    }

    let rafId: number | null = null;
    let start: number | null = null;

    function frame(ts: number) {
      if (start === null) start = ts;
      draw((ts - start) / 1000);
      if (!reduced && motion.loop) {
        rafId = requestAnimationFrame(frame);
      }
    }

    if (reduced) {
      // Static first frame -- no rAF loop scheduled at all.
      draw(0);
    } else {
      rafId = requestAnimationFrame(frame);
    }

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [preset, nodes, edges, palette, motion, reduced, tokens]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: `${H}px` }}
      role="img"
      aria-label="Animated diagram"
      className="rounded-[var(--radius)] bg-(--bg-sunken)"
    />
  );
}
