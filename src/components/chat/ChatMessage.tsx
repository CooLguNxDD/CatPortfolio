import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

export interface Message {
  role: "user" | "assistant";
  markdown: string;
  isError?: boolean;
}

const mdComponents = {
  h2(props: React.ComponentPropsWithoutRef<"h2">) {
    const rest = { ...props } as any;
    delete rest.node;
    return <h2 className="text-lg font-semibold text-(--fg) mt-4 mb-2" {...rest} />;
  },
  h3(props: React.ComponentPropsWithoutRef<"h3">) {
    const rest = { ...props } as any;
    delete rest.node;
    return <h3 className="text-base font-semibold text-(--fg) mt-3 mb-1.5" {...rest} />;
  },
  p(props: React.ComponentPropsWithoutRef<"p">) {
    const rest = { ...props } as any;
    delete rest.node;
    return <p className="text-sm text-(--fg-muted) leading-relaxed mb-3 last:mb-0" {...rest} />;
  },
  ul(props: React.ComponentPropsWithoutRef<"ul">) {
    const rest = { ...props } as any;
    delete rest.node;
    return <ul className="list-disc list-inside space-y-1 mb-3 text-xs text-(--fg-muted)" {...rest} />;
  },
  ol(props: React.ComponentPropsWithoutRef<"ol">) {
    const rest = { ...props } as any;
    delete rest.node;
    return <ol className="list-decimal list-inside space-y-1 mb-3 text-xs text-(--fg-muted)" {...rest} />;
  },
  li(props: React.ComponentPropsWithoutRef<"li">) {
    const rest = { ...props } as any;
    delete rest.node;
    return <li className="pl-0.5" {...rest} />;
  },
  a(props: React.ComponentPropsWithoutRef<"a">) {
    const rest = { ...props } as any;
    delete rest.node;
    return (
      <a
        target="_blank"
        rel="noreferrer"
        className="text-(--amber) underline underline-offset-4 hover:opacity-80 transition-opacity"
        {...rest}
      />
    );
  },
  table(props: React.ComponentPropsWithoutRef<"table">) {
    const rest = { ...props } as any;
    delete rest.node;
    return (
      <div className="overflow-x-auto my-4 w-full border border-(--hairline) rounded-lg">
        <table className="w-full border-collapse text-left text-xs" {...rest} />
      </div>
    );
  },
  thead(props: React.ComponentPropsWithoutRef<"thead">) {
    const rest = { ...props } as any;
    delete rest.node;
    return <thead className="bg-(--bg-sunken) border-b border-(--hairline)" {...rest} />;
  },
  th(props: React.ComponentPropsWithoutRef<"th">) {
    const rest = { ...props } as any;
    delete rest.node;
    return (
      <th
        className="border-r border-(--hairline) last:border-r-0 p-2 font-mono text-[10px] uppercase tracking-wider text-(--fg-subtle)"
        {...rest}
      />
    );
  },
  tr(props: React.ComponentPropsWithoutRef<"tr">) {
    const rest = { ...props } as any;
    delete rest.node;
    return <tr className="border-b border-(--hairline) last:border-b-0 hover:bg-(--bg-sunken)/30 transition-colors" {...rest} />;
  },
  td(props: React.ComponentPropsWithoutRef<"td">) {
    const rest = { ...props } as any;
    delete rest.node;
    return <td className="border-r border-(--hairline) last:border-r-0 p-2 text-xs text-(--fg-muted)" {...rest} />;
  },
  code(props: React.ComponentPropsWithoutRef<"code">) {
    const rest = { ...props } as any;
    delete rest.node;
    const isInline = !rest.className;
    if (isInline) {
      return (
        <code
          className="font-mono text-xs bg-(--bg-sunken) px-1 py-0.5 rounded text-(--fg) border border-(--hairline)"
          {...rest}
        />
      );
    }
    return (
      <pre className="overflow-x-auto bg-(--bg-sunken) p-3 rounded-lg border border-(--hairline) my-3 font-mono text-xs text-(--fg)">
        <code {...rest} />
      </pre>
    );
  },
};

export function ChatMessage({ role, markdown, isError }: Message) {
  const isUser = role === "user";

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
      </div>
    </div>
  );
}
