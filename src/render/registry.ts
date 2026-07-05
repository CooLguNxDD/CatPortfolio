import type { ComponentType } from "react";
import type { Layout } from "@/content/schema";
import { Hero, ProjectGrid, StatStrip, StarStory, ArchDiagram, CodeSnippet, Prose } from "@/blocks";

export type Block = Layout["blocks"][number];
export type BlockType = Block["type"];
export type PropsOf<T extends BlockType> = Extract<Block, { type: T }>["props"];

// `satisfies` proves every whitelisted type has a component with matching props.
export const REGISTRY = {
  hero: Hero, projectGrid: ProjectGrid, statStrip: StatStrip,
  starStory: StarStory, archDiagram: ArchDiagram, codeSnippet: CodeSnippet, prose: Prose,
} satisfies { [K in BlockType]: ComponentType<PropsOf<K>> };
