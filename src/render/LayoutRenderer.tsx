import type { ComponentType } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { Layout } from "@/content/schema";
import { REGISTRY } from "./registry";
import type { Block, BlockType } from "./registry";

export function LayoutRenderer({ layout }: { layout: Layout }) {
  const reduced = useReducedMotion();

  return (
    <>
      {layout.blocks.map((block, i) => {
        const Block = REGISTRY[block.type as BlockType] as ComponentType<Block["props"]> | undefined;
        if (!Block) return null;

        return (
          <motion.section
            key={block.id}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
          >
            <Block {...block.props} />
          </motion.section>
        );
      })}
    </>
  );
}
