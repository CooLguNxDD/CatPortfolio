import { memo } from "react";
import { useNavigate } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { fishBus } from "@/fish/fishBus";
import { useFishTankStore } from "@/store";
import { cn } from "@/lib/utils";

/** A follow-up the visitor can take on what this turn changed. */
export interface MessageAction {
  kind: "focus" | "view" | "ask" | "add";
  /** Fish slug for `focus`/`add`, block id for `view`, follow-up prompt for `ask`. */
  target: string;
  label: string;
  /** Tooltip (recommendation reason). */
  title?: string;
  /** Project slug for e2e `data-slug` when `target` is not the slug. */
  slug?: string;
}

export interface Message {
  role: "user" | "assistant";
  markdown: string;
  isError?: boolean;
  /** Chips rendered under an assistant bubble (focus / view / ask / add). */
  actions?: MessageAction[];
}

export interface ChatMessageProps extends Message {
  onAsk?: (prompt: string) => void;
  onAdd?: (slug: string) => void;
}

/** Dispatch a chip click. `focus`/`view` keep the existing tank/text jumps. */
export function runMessageAction(
  action: MessageAction,
  deps: {
    onAsk?: (prompt: string) => void;
    onAdd?: (slug: string) => void;
    focus?: (slug: string) => void;
    view?: (blockId: string) => void;
  },
): void {
  if (action.kind === "ask") {
    deps.onAsk?.(action.target);
    return;
  }
  if (action.kind === "add") {
    deps.onAdd?.(action.target);
    return;
  }
  if (action.kind === "focus") {
    deps.focus?.(action.target);
    return;
  }
  deps.view?.(action.target);
}

// Destructure `node` (react-markdown AST) so it is not spread onto DOM elements.
const mdComponents = {
  h2({ node: _node, ...props }: any) {
    return <h2 className="text-lg font-semibold text-(--fg) mt-4 mb-2" {...props} />;
  },
  h3({ node: _node, ...props }: any) {
    return <h3 className="text-base font-semibold text-(--fg) mt-3 mb-1.5" {...props} />;
  },
  p({ node: _node, ...props }: any) {
    return <p className="text-sm text-(--fg-muted) leading-relaxed mb-3 last:mb-0" {...props} />;
  },
  ul({ node: _node, ...props }: any) {
    return <ul className="list-disc list-inside space-y-1 mb-3 text-xs text-(--fg-muted)" {...props} />;
  },
  ol({ node: _node, ...props }: any) {
    return <ol className="list-decimal list-inside space-y-1 mb-3 text-xs text-(--fg-muted)" {...props} />;
  },
  li({ node: _node, ...props }: any) {
    return <li className="pl-0.5" {...props} />;
  },
  a({ node: _node, ...props }: any) {
    return (
      <a
        target="_blank"
        rel="noreferrer"
        className="text-(--amber) underline underline-offset-4 hover:opacity-80 transition-opacity"
        {...props}
      />
    );
  },
  table({ node: _node, ...props }: any) {
    return (
      <div className="overflow-x-auto my-4 w-full border border-(--hairline) rounded-lg">
        <table className="w-full border-collapse text-left text-xs" {...props} />
      </div>
    );
  },
  thead({ node: _node, ...props }: any) {
    return <thead className="bg-(--bg-sunken) border-b border-(--hairline)" {...props} />;
  },
  th({ node: _node, ...props }: any) {
    return (
      <th
        className="border-r border-(--hairline) last:border-r-0 p-2 font-mono text-[10px] uppercase tracking-wider text-(--fg-subtle)"
        {...props}
      />
    );
  },
  tr({ node: _node, ...props }: any) {
    return <tr className="border-b border-(--hairline) last:border-b-0 hover:bg-(--bg-sunken)/30 transition-colors" {...props} />;
  },
  td({ node: _node, ...props }: any) {
    return <td className="border-r border-(--hairline) last:border-r-0 p-2 text-xs text-(--fg-muted)" {...props} />;
  },
  code({ node: _node, ...props }: any) {
    const isInline = !props.className;
    if (isInline) {
      return (
        <code
          className="font-mono text-xs bg-(--bg-sunken) px-1 py-0.5 rounded text-(--fg) border border-(--hairline)"
          {...props}
        />
      );
    }
    return (
      <pre className="overflow-x-auto bg-(--bg-sunken) p-3 rounded-lg border border-(--hairline) my-3 font-mono text-xs text-(--fg)">
        <code {...props} />
      </pre>
    );
  },
};

/**
 * Renders a single chat message (user or assistant) with markdown formatting.
 * Optionally displays action chips for jumping to a focused fish or block.
 */
export const ChatMessage = memo(function ChatMessage({
  role,
  markdown,
  isError,
  actions,
  onAsk,
  onAdd,
}: ChatMessageProps) {
  const isUser = role === "user";
  const navigate = useNavigate();

  /** Focus a specimen, jump to a patched block, ask a follow-up, or add a fish. */
  const runAction = (action: MessageAction) => {
    runMessageAction(action, {
      onAsk,
      onAdd,
      focus: (slug) => {
        useFishTankStore.getState().setFocus(slug);
        void navigate({
          to: "/",
          search: (prev) => ({ ...(prev || {}), v: "tank", f: slug }),
          replace: true,
        });
        fishBus.emit("fish:pick", { slug });
      },
      view: (blockId) => {
        void navigate({
          to: "/",
          search: (prev) => ({ ...(prev || {}), v: "text", scrollTo: blockId }),
          replace: true,
        });
      },
    });
  };

  return (
    <div
      className={cn(
        "flex w-full gap-3 py-4 first:pt-0 border-b border-(--hairline) last:border-0",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-3 shadow-xs transition-all duration-300",
          isUser
            ? "bg-linear-to-br from-(--amber) to-orange-500 text-white rounded-tr-none font-medium selection:bg-orange-800"
            : isError
            ? "bg-red-500/10 border border-red-500/30 text-red-500 rounded-tl-none"
            : "bg-(--bg-sunken) border border-(--hairline) rounded-tl-none text-(--fg)"
        )}
      >
        <div className="text-xs font-mono opacity-60 mb-1">
          {isUser ? "You" : "Andrew's AI"}
        </div>
        {isUser ? (
          <div className="text-sm whitespace-pre-wrap select-text selection:text-white">{markdown}</div>
        ) : (
          <div className="select-text prose-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
              {markdown}
            </ReactMarkdown>
          </div>
        )}
        {!isUser && actions?.length ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {actions.map((action) => (
              <button
                key={`${action.kind}-${action.target}`}
                type="button"
                onClick={() => runAction(action)}
                data-slug={
                  action.slug ??
                  (action.kind === "focus" || action.kind === "add"
                    ? action.target
                    : undefined)
                }
                title={action.title}
                className="rounded-full border border-(--border) bg-(--bg-elevated) px-2.5 py-0.5 text-[11px] font-mono text-(--fg-muted) hover:border-(--amber) hover:text-(--amber) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--amber) transition-colors"
              >
                {action.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
});
