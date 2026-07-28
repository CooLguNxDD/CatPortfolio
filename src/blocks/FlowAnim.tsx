import { motion, useReducedMotion } from "motion/react";
import type { PropsOf } from "@/render/registry";

/** Animated flow graph; static fallback when reduced motion is preferred. */
export function FlowAnim(props: PropsOf<"flowAnim">) {
  const reduced = useReducedMotion();
  const animate = props.animate !== false && !reduced;
  const nodes = props.nodes ?? [];
  const edges = props.edges ?? [];

  // Simple circular layout
  const R = 90;
  const cx = 160;
  const cy = 100;
  const n = Math.max(nodes.length, 1);
  const pos = Object.fromEntries(
    nodes.map((node, i) => {
      const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
      return [node.id, { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) }];
    }),
  );

  return (
    <section className="rounded-[var(--radius-lg)] border border-(--hairline) bg-(--card) p-[var(--pad-card)]">
      {props.title ? (
        <h3 className="mb-2 text-sm font-medium text-(--fg)">{props.title}</h3>
      ) : null}
      <svg viewBox="0 0 320 200" className="h-auto w-full max-w-lg">
        {edges.map((e, i) => {
          const a = pos[e.from];
          const b = pos[e.to];
          if (!a || !b) return null;
          return (
            <g key={i}>
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="var(--border-strong)"
                strokeWidth={1.5}
              />
              {animate ? (
                <motion.circle
                  r={3}
                  fill="var(--neon)"
                  initial={{ cx: a.x, cy: a.y }}
                  animate={{ cx: [a.x, b.x], cy: [a.y, b.y] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "linear", delay: i * 0.2 }}
                />
              ) : null}
              {e.label ? (
                <text
                  x={(a.x + b.x) / 2}
                  y={(a.y + b.y) / 2 - 4}
                  textAnchor="middle"
                  fontSize={9}
                  className="fill-(--fg-subtle)"
                >
                  {e.label}
                </text>
              ) : null}
            </g>
          );
        })}
        {nodes.map((node) => {
          const p = pos[node.id];
          if (!p) return null;
          return (
            <g key={node.id}>
              <circle cx={p.x} cy={p.y} r={18} fill="var(--bg-elevated)" stroke="var(--amber)" />
              <text
                x={p.x}
                y={p.y + 3}
                textAnchor="middle"
                fontSize={9}
                className="fill-(--fg)"
              >
                {node.label.slice(0, 10)}
              </text>
            </g>
          );
        })}
      </svg>
    </section>
  );
}
