import type { PropsOf } from "@/render/registry";
import { useChatStore } from "@/store/chatSlice";

/** Visitor CTA chips — seeds chat with a template prompt. */
export function QuickActions(props: PropsOf<"quickActions">) {
  const setPendingPrompt = useChatStore((s) => s.setPendingPrompt);
  const actions = props.actions ?? [];

  return (
    <section className="rounded-[var(--radius-lg)] border border-(--hairline) bg-(--card) p-[var(--pad-card)]">
      {props.prompt ? (
        <p className="mb-3 text-sm text-(--fg-muted)">{props.prompt}</p>
      ) : (
        <p className="mb-3 text-sm text-(--fg-muted)">Jump in with a prompt:</p>
      )}
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={() => setPendingPrompt(a.prompt)}
            className="rounded-full border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm text-(--fg) transition hover:border-(--amber) hover:text-(--amber) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--amber)"
          >
            {a.icon ? <span className="mr-1.5 opacity-80">{a.icon}</span> : null}
            {a.label}
          </button>
        ))}
      </div>
    </section>
  );
}
