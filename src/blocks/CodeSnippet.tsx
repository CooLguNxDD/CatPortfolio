import type { Layout } from "@/content/schema";

type CodeSnippetProps = Extract<Layout["blocks"][number], { type: "codeSnippet" }>["props"];

/** `codeSnippet` block: a terminal-styled card with a language/caption header bar over a plain `<pre><code>` body (no syntax highlighting). */
export function CodeSnippet({ lang, code, caption }: CodeSnippetProps) {
  return (
    <div className="w-full py-6">
      <div className="rounded-xl border border-(--hairline) overflow-hidden bg-card flex flex-col">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-(--bg-sunken) border-b border-(--hairline) min-h-[38px]">
          <div className="flex items-center gap-1.5">
            {/* Decorative window controls for cozy terminal look */}
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
            <span className="font-mono text-xs uppercase tracking-wider text-(--fg-subtle) ml-2">
              {lang}
            </span>
          </div>
          {caption && (
            <span className="text-xs text-(--fg-subtle) font-mono truncate max-w-[50%] md:max-w-[70%] text-right" title={caption}>
              {caption}
            </span>
          )}
        </div>
        {/* Body */}
        <pre className="overflow-x-auto p-4 font-mono text-sm text-(--fg-muted) bg-card select-text">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}
