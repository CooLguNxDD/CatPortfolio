import type { PropsOf } from "@/render/registry";

/** Vertical project/career timeline. */
export function Timeline(props: PropsOf<"timeline">) {
  const items = props.items ?? [];
  return (
    <section className="rounded-[var(--radius-lg)] border border-(--hairline) bg-(--card) p-[var(--pad-card)]">
      {props.title ? (
        <h3 className="mb-4 text-sm font-medium text-(--fg)">{props.title}</h3>
      ) : null}
      <ol className="relative space-y-4 border-l border-(--border) pl-4">
        {items.map((item, i) => (
          <li key={`${item.date}-${i}`} className="relative">
            <span className="absolute -left-[1.3rem] top-1 h-2.5 w-2.5 rounded-full bg-(--amber) shadow-[var(--glow-amber)]" />
            <div className="flex flex-wrap items-baseline gap-2">
              <time className="font-mono text-xs text-(--amber)">{item.date}</time>
              {item.tag ? (
                <span className="rounded-full bg-(--amber-soft) px-2 py-0.5 text-[10px] text-(--amber)">
                  {item.tag}
                </span>
              ) : null}
            </div>
            <div className="mt-0.5 font-medium text-(--fg)">{item.title}</div>
            {item.body ? (
              <p className="mt-1 text-sm text-(--fg-muted)">{item.body}</p>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
