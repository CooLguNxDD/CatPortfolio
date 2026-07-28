import { Prose } from "@/blocks/Prose";

/** Markdown via existing Prose pipeline. */
export function MarkdownText({ markdown = "" }: { markdown?: string }) {
  return <Prose markdown={markdown} />;
}
