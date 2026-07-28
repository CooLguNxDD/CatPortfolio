/** Blockquote primitive. */
export function Quote({ text, cite }: { text?: string; cite?: string }) {
  return (
    <blockquote className="border-l-2 border-(--amber) pl-3 text-(--fg-muted) italic">
      <p>{text}</p>
      {cite ? <footer className="mt-1 text-xs not-italic text-(--fg-subtle)">— {cite}</footer> : null}
    </blockquote>
  );
}
