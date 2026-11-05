import { memo } from "react";
import { useNavigate } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { fishBus } from "@/fish/fishBus";
import { useFishTankStore } from "@/store";
import { AlertTriangle, Cat } from "lucide-react";
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
    return <h2 className="text-[15px] font-semibold text-(--fg) mt-3 mb-1.5 first:mt-0" {...props} />;
  },
  h3({ node: _node, ...props }: any) {
    return <h3 className="text-sm font-semibold text-(--fg) mt-3 mb-1 first:mt-0" {...props} />;
  },
  p({ node: _node, ...props }: any) {
    return <p className="text-sm text-(--fg) leading-relaxed mb-2.5 last:mb-0" {...props} />;
  },
  ul({ node: _node, ...props }: any) {
    return <ul className="list-disc pl-4 space-y-1 mb-2.5 last:mb-0 text-sm text-(--fg-muted) marker:text-(--fg-subtle)" {...props} />;
  },
  ol({ node: _node, ...props }: any) {
    return <ol className="list-decimal pl-4 space-y-1 mb-2.5 last:mb-0 text-sm text-(--fg-muted) marker:text-(--fg-subtle)" {...props} />;
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
          className="font-mono text-[12px] bg-(--fg)/8 px-1 py-px rounded text-(--fg) [overflow-wrap:anywhere]"
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

  const chips = !isUser && actions?.length ? (
    <div className="mt-2.5 flex flex-wrap gap-1.5">
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
          title={action.title ? `${action.label} — ${action.title}` : action.label}
          className={cn(
            "max-w-full rounded-lg border border-(--hairline) bg-(--bg-elevated) px-2 py-1 text-[11px] font-mono text-(--fg-muted) hover:border-(--amber) hover:text-(--amber) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--amber) transition-colors inline-flex items-center gap-1.5 cursor-pointer",
            action.kind === "add" && "ft-chip-add",
            action.kind === "ask" && "ft-chip-ask",
            action.kind === "focus" && "ft-chip-focus",
          )}
        >
          {action.kind === "focus" ? (
            <span className="h-1.5 w-1.5 rounded-full bg-(--accent-devops,var(--neon)) shrink-0" />
          ) : null}
          <span className="truncate">{action.label}</span>
        </button>
      ))}
    </div>
  ) : null;

  if (isUser) {
    return (
      <div className="flex w-full justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-(--amber) px-3.5 py-2 text-(--bg) shadow-xs selection:bg-(--fg) selection:text-(--bg)">
          <span className="sr-only">You: </span>
          <div className="text-sm whitespace-pre-wrap break-words select-text">{markdown}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full items-start gap-2.5">
      <span
        aria-hidden="true"
        className={cn(
          "h-7 w-7 rounded-lg inline-flex items-center justify-center shrink-0",
          isError ? "bg-red-500/15 text-red-500" : "bg-(--amber)/15 text-(--amber)",
        )}
      >
        {isError ? <AlertTriangle className="h-4 w-4" /> : <Cat className="h-4 w-4" />}
      </span>
      <div
        className={cn(
          "min-w-0 max-w-[calc(100%-2.25rem)] rounded-2xl rounded-tl-md px-3.5 py-2.5",
          isError
            ? "bg-red-500/10 border border-red-500/30 text-red-500"
            : "bg-(--bg-sunken) border border-(--hairline) text-(--fg)",
        )}
      >
        <span className="sr-only">Andrew's AI: </span>
        <div className="select-text prose-sm break-words">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
            {markdown}
          </ReactMarkdown>
        </div>
        {chips}
      </div>
    </div>
  );
});
