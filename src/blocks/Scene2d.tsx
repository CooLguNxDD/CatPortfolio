import { lazy, Suspense } from "react";
import { useReducedMotion } from "motion/react";
import type { PropsOf } from "@/render/registry";

// Lazy chunk, deliberately NOT exported from src/blocks/index.ts -- mirrors
// the ArchDiagram -> MermaidDiagram split so the canvas renderer only loads
// when a scene2d block is actually present on the page.
const Scene2dCanvas = lazy(() => import("./Scene2dCanvas"));

/** Declarative canvas-2D visual — thin shell (reduced-motion + lazy load); see Scene2dCanvas for the renderer. */
export function Scene2d(props: PropsOf<"scene2d">) {
  const reduced = useReducedMotion();
  return (
    <section className="rounded-[var(--radius-lg)] border border-(--hairline) bg-(--card) p-[var(--pad-card)]">
      {props.title ? (
        <h3 className="mb-2 text-sm font-medium text-(--fg)">{props.title}</h3>
      ) : null}
      <Suspense
        fallback={
          <div
            className="h-[220px] w-full rounded-[var(--radius)] bg-(--bg-sunken)"
            aria-hidden="true"
          />
        }
      >
        <Scene2dCanvas
          preset={props.preset}
          nodes={props.nodes}
          edges={props.edges}
          palette={props.palette}
          motion={props.motion}
          reduced={!!reduced}
        />
      </Suspense>
      {props.caption ? (
        <p className="mt-2 text-xs text-(--fg-muted)">{props.caption}</p>
      ) : null}
    </section>
  );
}
