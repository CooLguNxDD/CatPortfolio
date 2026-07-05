import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Layout } from "@/content/schema";

type ProseProps = Extract<Layout["blocks"][number], { type: "prose" }>["props"];

interface MarkdownProp {
  node?: unknown;
}

const components = {
  h2(props: React.ComponentPropsWithoutRef<"h2">) {
    const rest = { ...props } as MarkdownProp & React.ComponentPropsWithoutRef<"h2">;
    delete rest.node;
    return <h2 className="text-2xl font-semibold text-(--fg) mt-6 mb-3" {...rest} />;
  },
  h3(props: React.ComponentPropsWithoutRef<"h3">) {
    const rest = { ...props } as MarkdownProp & React.ComponentPropsWithoutRef<"h3">;
    delete rest.node;
    return <h3 className="text-xl font-semibold text-(--fg) mt-4 mb-2" {...rest} />;
  },
  p(props: React.ComponentPropsWithoutRef<"p">) {
    const rest = { ...props } as MarkdownProp & React.ComponentPropsWithoutRef<"p">;
    delete rest.node;
    return <p className="text-base text-(--fg-muted) leading-relaxed mb-4" {...rest} />;
  },
  ul(props: React.ComponentPropsWithoutRef<"ul">) {
    const rest = { ...props } as MarkdownProp & React.ComponentPropsWithoutRef<"ul">;
    delete rest.node;
    return <ul className="list-disc list-inside space-y-1 mb-4 text-sm text-(--fg-muted)" {...rest} />;
  },
  ol(props: React.ComponentPropsWithoutRef<"ol">) {
    const rest = { ...props } as MarkdownProp & React.ComponentPropsWithoutRef<"ol">;
    delete rest.node;
    return <ol className="list-decimal list-inside space-y-1 mb-4 text-sm text-(--fg-muted)" {...rest} />;
  },
  li(props: React.ComponentPropsWithoutRef<"li">) {
    const rest = { ...props } as MarkdownProp & React.ComponentPropsWithoutRef<"li">;
    delete rest.node;
    return <li className="pl-1" {...rest} />;
  },
  a(props: React.ComponentPropsWithoutRef<"a">) {
    const rest = { ...props } as MarkdownProp & React.ComponentPropsWithoutRef<"a">;
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
    const rest = { ...props } as MarkdownProp & React.ComponentPropsWithoutRef<"table">;
    delete rest.node;
    return (
      <div className="overflow-x-auto my-6 w-full border border-(--hairline) rounded-xl">
        <table className="w-full border-collapse text-left text-sm" {...rest} />
      </div>
    );
  },
  thead(props: React.ComponentPropsWithoutRef<"thead">) {
    const rest = { ...props } as MarkdownProp & React.ComponentPropsWithoutRef<"thead">;
    delete rest.node;
    return <thead className="bg-(--bg-sunken) border-b border-(--hairline)" {...rest} />;
  },
  th(props: React.ComponentPropsWithoutRef<"th">) {
    const rest = { ...props } as MarkdownProp & React.ComponentPropsWithoutRef<"th">;
    delete rest.node;
    return (
      <th
        className="border-r border-(--hairline) last:border-r-0 p-3 font-mono text-xs uppercase tracking-wider text-(--fg-subtle)"
        {...rest}
      />
    );
  },
  tr(props: React.ComponentPropsWithoutRef<"tr">) {
    const rest = { ...props } as MarkdownProp & React.ComponentPropsWithoutRef<"tr">;
    delete rest.node;
    return <tr className="border-b border-(--hairline) last:border-b-0 hover:bg-(--bg-sunken)/30 transition-colors" {...rest} />;
  },
  td(props: React.ComponentPropsWithoutRef<"td">) {
    const rest = { ...props } as MarkdownProp & React.ComponentPropsWithoutRef<"td">;
    delete rest.node;
    return <td className="border-r border-(--hairline) last:border-r-0 p-3 text-sm text-(--fg-muted)" {...rest} />;
  },
  code(props: React.ComponentPropsWithoutRef<"code">) {
    const rest = { ...props } as MarkdownProp & React.ComponentPropsWithoutRef<"code">;
    delete rest.node;
    // Check if inline code or block code
    const isInline = !rest.className;
    if (isInline) {
      return (
        <code
          className="font-mono text-sm bg-(--bg-sunken) px-1.5 py-0.5 rounded text-(--fg) border border-(--hairline)"
          {...rest}
        />
      );
    }
    return <code className="font-mono text-sm block" {...rest} />;
  },
};

export function Prose({ markdown }: ProseProps) {
  return (
    <div className="w-full py-6 text-(--fg) space-y-4">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
