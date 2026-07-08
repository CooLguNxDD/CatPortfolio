import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSharedClient } from "@/api/octClient";
import { askOct } from "@/api/harness";
import { ChatMessage, type Message } from "./ChatMessage";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const { data: tools, isSuccess } = useQuery({
    queryKey: ["oct", "tools"],
    queryFn: async () => {
      const client = await getSharedClient();
      return await client.listTools();
    },
    retry: false,
    staleTime: 300_000,
  });

  const isOnline = isSuccess && !!tools;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pending]);

  const handleSend = async () => {
    if (!input.trim() || pending || !isOnline) return;

    const userMessageText = input.trim();
    setInput("");
    setPending(true);

    setMessages((prev) => [...prev, { role: "user", markdown: userMessageText }]);

    try {
      const result = await askOct(userMessageText, sessionId);
      if (result.ok) {
        setMessages((prev) => [...prev, { role: "assistant", markdown: result.markdown }]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            markdown: result.error + (result.retryAfter ? ` (Retry after ${result.retryAfter}s)` : ""),
            isError: true,
          },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          markdown: err?.message || "An unexpected connection error occurred.",
          isError: true,
        },
      ]);
    } finally {
      setPending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full border border-(--hairline) rounded-2xl bg-linear-to-b from-background to-(--bg-sunken) p-6 space-y-6 shadow-lg relative overflow-hidden">
      {/* Background glow for premium aesthetic */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-radial from-(--amber)/5 to-transparent pointer-events-none rounded-full blur-3xl -z-10" />

      {/* Header / Connection Status */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-(--hairline)">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-(--fg) tracking-tight">Ask Portfolio</h2>
          <div
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[10px] font-mono font-medium flex items-center gap-1.5 border uppercase tracking-wider",
              isOnline
                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                : "bg-(--amber)/10 text-(--amber) border-(--amber)/20"
            )}
          >
            <span
              className={cn("h-1.5 w-1.5 rounded-full animate-pulse", isOnline ? "bg-emerald-500" : "bg-(--amber)")}
            />
            {isOnline ? `oct online · ${tools.length} tools` : "oct offline — chat disabled"}
          </div>
        </div>

        {/* Collapsible Tool List */}
        {isOnline && tools && (
          <details className="group/details text-xs max-w-md w-full md:w-auto">
            <summary className="cursor-pointer text-(--fg-subtle) hover:text-(--fg) transition-colors font-mono select-none flex items-center gap-1 list-none justify-end">
              <span>[</span>
              <span className="underline underline-offset-2">preview capabilities</span>
              <span>]</span>
            </summary>
            <div className="mt-2 bg-background border border-(--hairline) rounded-xl p-3 max-h-48 overflow-y-auto space-y-2 text-left shadow-inner">
              {tools.map((t) => (
                <div key={t.name} className="border-b border-(--hairline) last:border-0 pb-1.5 last:pb-0">
                  <div className="font-mono text-xs font-semibold text-(--fg)">{t.name}</div>
                  {t.description && (
                    <div className="text-[11px] text-(--fg-muted) mt-0.5 leading-normal">{t.description}</div>
                  )}
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      {/* Chat Messages Log */}
      <div className="min-h-48 max-h-[450px] overflow-y-auto pr-2 space-y-2 select-text">
        {messages.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-4">
            <p className="text-sm text-(--fg-muted) max-w-sm">
              {isOnline
                ? "Ask Andrew's AI agent a question about his experience, projects, or skill set."
                : "OpenCat Tunnel connection is currently unavailable. Chat will activate when the server comes online."}
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <ChatMessage key={idx} role={msg.role} markdown={msg.markdown} isError={msg.isError} />
          ))
        )}
        {pending && (
          <div className="flex w-full justify-start py-4">
            <div className="bg-(--bg-sunken) border border-(--hairline) rounded-2xl rounded-tl-none px-4 py-3 shadow-xs text-(--fg) flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-(--amber) animate-bounce [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-(--amber) animate-bounce [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-(--amber) animate-bounce" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isOnline ? "Ask about Andrew's projects or experience..." : "Chat is disabled because OCT is offline..."
          }
          disabled={pending || !isOnline}
          className="flex-1 min-h-10 max-h-24 p-2 text-sm bg-background border border-(--hairline) rounded-xl resize-none outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:opacity-50 text-(--fg) placeholder:text-(--fg-subtle) transition-all"
          rows={1}
        />
        <Button
          onClick={handleSend}
          disabled={pending || !input.trim() || !isOnline}
          className="bg-linear-to-r from-(--amber) to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white rounded-xl font-medium px-4 h-10 transition-all select-none"
        >
          Send
        </Button>
      </div>
    </div>
  );
}
