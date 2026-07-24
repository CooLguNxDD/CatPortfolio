import type { ComponentType, CSSProperties } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { Layout } from "@/content/schema";
import { REGISTRY } from "./registry";
import type { Block, BlockType } from "./registry";
import { BlockErrorBoundary } from "./BlockErrorBoundary";
import { useLayoutTheme } from "@/hooks/useLayoutTheme";
import { cn } from "@/lib/utils";

export function LayoutRenderer({ layout }: { layout: Layout }) {
  const reduced = useReducedMotion();
  useLayoutTheme(layout);

  // If any block requests span/order, wrap in a CSS grid for the whole page.
  const usesGrid = layout.blocks.some(
    (b) => b.layout && (b.layout.span != null || b.layout.order != null),
  );

  return (
    <div
      className={cn(
        usesGrid && "grid grid-cols-12 gap-4 auto-rows-min",
      )}
    >
      {layout.blocks.map((block, i) => {
        const Comp = REGISTRY[block.type as BlockType] as
          | ComponentType<Block["props"]>
          | undefined;
        if (!Comp) return null;

        const span = block.layout?.span;
        const order = block.layout?.order;
        const style: CSSProperties = {};
        if (usesGrid) {
          style.gridColumn = span
            ? `span ${Math.min(12, Math.max(1, span))} / span ${Math.min(12, Math.max(1, span))}`
            : "span 12 / span 12";
          if (order != null) style.order = order;
        }

        return (
          <motion.section
            key={block.id}
            style={style}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
          >
            <BlockErrorBoundary blockId={block.id}>
              <Comp {...block.props} />
            </BlockErrorBoundary>
          </motion.section>
        );
      })}
    </div>
  );
}
