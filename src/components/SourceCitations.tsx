/**
 * Inline grounding citation chips from layout.meta.sources.
 */
import type { Layout } from "@/content/schema";

type Source = NonNullable<Layout["meta"]["sources"]>[number];

function chipLabel(s: Source): string {
  if (s.label) return s.label;
  const ref = s.ref || "";
  const short = ref.includes(":") ? ref.split(":").slice(-1)[0] : ref;
  return short.length > 40 ? `${short.slice(0, 37)}…` : short || "source";
}

/** Renders a list of source citations provided by the agent. */
export function SourceCitations({
  sources,
  className,
}: {
  sources?: Layout["meta"]["sources"];
  className?: string;
}) {
  if (!sources?.length) return null;

  return (
    <div className={className ?? "mt-8 flex flex-wrap gap-2"}>
      <span className="w-full text-[10px] font-mono uppercase tracking-wider text-(--fg-subtle)">
        Grounded sources
      </span>
      {sources.map((s) => {
        const label = chipLabel(s);
        const href = s.url;
        const base =
          "inline-flex items-center rounded-full border border-(--hairline) bg-(--bg-sunken) px-2.5 py-1 text-[11px] font-mono text-(--fg-muted) transition-colors hover:border-(--amber) hover:text-(--amber)";
        if (href) {
          return (
            <a
              key={s.ref}
              href={href}
              target="_blank"
              rel="noreferrer"
              className={base}
              title={s.ref}
            >
              [Source: {label}]
            </a>
          );
        }
        return (
          <span key={s.ref} className={base} title={s.ref}>
            [Source: {label}]
          </span>
        );
      })}
    </div>
  );
}
