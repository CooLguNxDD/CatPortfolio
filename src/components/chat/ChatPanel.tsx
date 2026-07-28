import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSharedClient } from "@/api/octClient";
import {
  askOct,
  extractBakeMeta,
  extractCarryLayout,
  type CliMeta,
} from "@/api/harness";
import {
  composeLayoutLive,
  loadJobLayout,
  loadLayoutForQuery,
  type LayoutLoadResult,
} from "@/content/loadLayout";
import { ChatMessage, type Message } from "./ChatMessage";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/store/chatSlice";

/** Soft planner nudge — prefer fragments + bake for Ask-mode page re-render. */
const ENRICHMENT_DIRECTIVE =
  "\n\n[System: CatPortfolio Ask mode re-renders the page from layout carry. " +
  "Prefer: (1) compose_from_fragments with refresh=true for creative page assembly; " +
  "(2) bake_portfolio_for_job when the visitor describes a job/role/company (returns short_id + layout); " +
  "(3) emit_layout(refresh=true) only if fragments don't fit. " +
  "Always put a valid layout in the response so the page updates. " +
  "If portfolio content is thin, follow live-layout-enrichment: local RAG first, " +
  "then get_project_context(slug) for DB context_sources only (never invent refs from chat). " +
  "Creative vibe redesign → design_layout or compose_from_fragments.]";

/** Label for the one-shot CLI pill (mirrors OpenCat admin McpMode). */
function oneShotPillLabel(cli: CliMeta): string {
  const agent = (cli.agent || "").toLowerCase();
  if (agent === "agy" || cli.provider === "agy-cli") return "one-shot cli · agy";
  if (agent === "claude" || cli.provider === "claude-cli") return "one-shot cli · claude";
  return `one-shot cli · ${cli.agent}`;
}

function applyLayoutToCache(
  queryClient: ReturnType<typeof useQueryClient>,
  result: LayoutLoadResult,
) {
  if (result.source === "snapshot") return;
  queryClient.setQueryData(["layout", "default"], result);
}

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [cliMeta, setCliMeta] = useState<CliMeta | null>(null);
  const [lastBakeId, setLastBakeId] = useState<string | null>(null);
  const [sessionId] = useState(() => crypto.randomUUID());
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();
  const pendingPrompt = useChatStore((s) => s.pendingPrompt);
  const setPendingPrompt = useChatStore((s) => s.setPendingPrompt);

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

  const sendText = useCallback(
    async (userMessageText: string) => {
      if (!userMessageText.trim() || pending || !isOnline) return;

      setInput("");
      setPending(true);

      setMessages((prev) => [...prev, { role: "user", markdown: userMessageText }]);

      // Parallel fast path: public fragment compose (no MCP) so the page can
      // re-render while run_graph is still planning/executing.
      const layoutPromise = loadLayoutForQuery(userMessageText, { timeoutMs: 10000 });
      // Also fire explicit compose (same intent) — first success wins below.
      const composePromise = composeLayoutLive(
        { query: userMessageText, refresh: true },
        { timeoutMs: 12000 },
      );

      try {
        const result = await askOct(userMessageText + ENRICHMENT_DIRECTIVE, sessionId);
        if (result.ok) {
          if (result.cli) setCliMeta(result.cli);
          setMessages((prev) => [...prev, { role: "assistant", markdown: result.markdown }]);

          // 1) Agentic layout carry (compose_from_fragments / emit / design / bake.layout)
          const carryLayout = extractCarryLayout(result.raw);
          if (carryLayout) {
            applyLayoutToCache(queryClient, {
              layout: carryLayout,
              source: "live",
            });
          }

          // 2) Bake short_id → load persisted job layout (or use carry layout)
          const bake = extractBakeMeta(result.raw);
          if (bake?.shortId) {
            setLastBakeId(bake.shortId);
            if (!carryLayout) {
              const baked = await loadJobLayout(bake.shortId);
              applyLayoutToCache(queryClient, baked);
            }
          }

          // 3) Fast REST fragment path if agent didn't return a layout
          if (!carryLayout && !bake?.shortId) {
            const [restResult, composeResult] = await Promise.all([
              layoutPromise,
              composePromise,
            ]);
            if (composeResult.source !== "snapshot") {
              applyLayoutToCache(queryClient, composeResult);
            } else if (restResult.source !== "snapshot") {
              applyLayoutToCache(queryClient, restResult);
            }
          }
        } else {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              markdown:
                result.error +
                (result.retryAfter ? ` (Retry after ${result.retryAfter}s)` : ""),
              isError: true,
            },
          ]);
          const [restResult, composeResult] = await Promise.all([
            layoutPromise,
            composePromise,
          ]);
          if (composeResult.source !== "snapshot") {
            applyLayoutToCache(queryClient, composeResult);
          } else if (restResult.source !== "snapshot") {
            applyLayoutToCache(queryClient, restResult);
          }
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
        try {
          const [restResult, composeResult] = await Promise.all([
            layoutPromise,
            composePromise,
          ]);
          if (composeResult.source !== "snapshot") {
            applyLayoutToCache(queryClient, composeResult);
          } else if (restResult.source !== "snapshot") {
            applyLayoutToCache(queryClient, restResult);
          }
        } catch {
          // ignore layout fallback failures
        }
      } finally {
        void layoutPromise.catch(() => undefined);
        void composePromise.catch(() => undefined);
        setPending(false);
      }
    },
    [pending, isOnline, sessionId, queryClient],
  );

  // QuickActions chips seed chat via pendingPrompt.
  useEffect(() => {
    if (!pendingPrompt || pending || !isOnline) return;
    const prompt = pendingPrompt;
    setPendingPrompt(null);
    void sendText(prompt);
  }, [pendingPrompt, pending, isOnline, setPendingPrompt, sendText]);

  const handleSend = async () => {
    await sendText(input.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full border border-(--hairline) rounded-2xl bg-linear-to-b from-background to-(--bg-sunken) p-6 space-y-6 shadow-lg relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-radial from-(--amber)/5 to-transparent pointer-events-none rounded-full blur-3xl -z-10" />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-(--hairline)">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-bold text-(--fg) tracking-tight">Ask Portfolio</h2>
          <div
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[10px] font-mono font-medium flex items-center gap-1.5 border uppercase tracking-wider",
              isOnline
                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                : "bg-(--amber)/10 text-(--amber) border-(--amber)/20",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full animate-pulse",
                isOnline ? "bg-emerald-500" : "bg-(--amber)",
              )}
            />
            {isOnline ? `oct online · ${tools.length} tools` : "oct offline — chat disabled"}
          </div>
          {cliMeta && (
            <div
              className="rounded-full px-2.5 py-0.5 text-[10px] font-mono font-medium flex items-center gap-1.5 border uppercase tracking-wider bg-(--neon)/10 text-(--neon) border-(--neon)/30"
              title="OpenCat core LLM is a headless CLI provider — this turn ran as a single CLI agent spawn."
            >
              <span className="h-1.5 w-1.5 rounded-full bg-(--neon) animate-pulse" />
              {oneShotPillLabel(cliMeta)}
            </div>
          )}
          {lastBakeId && (
            <a
              href={`${import.meta.env.BASE_URL}?j=${encodeURIComponent(lastBakeId)}`}
              className="rounded-full px-2.5 py-0.5 text-[10px] font-mono font-medium border border-(--border) text-(--fg-muted) hover:text-(--amber) hover:border-(--amber) transition-colors"
              title="Open the baked job layout on the home page"
            >
              baked · j={lastBakeId}
            </a>
          )}
        </div>

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
                    <div className="text-[11px] text-(--fg-muted) mt-0.5 leading-normal">
                      {t.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      <div
        className="min-h-48 max-h-[450px] overflow-y-auto pr-2 space-y-2 select-text"
        role="log"
        aria-live="polite"
        aria-atomic="false"
      >
        {messages.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-4 gap-3">
            <p className="text-sm text-(--fg-muted) max-w-sm">
              {isOnline
                ? "Ask about experience, projects, or a job fit — the page re-renders live from fragments while the agent answers."
                : "OpenCat Tunnel connection is currently unavailable. Chat will activate when the server comes online."}
            </p>
            {isOnline && (
              <div className="flex flex-wrap justify-center gap-2 max-w-md">
                {[
                  "Show me your infra / SRE work",
                  "What is the deepest system you built?",
                  "Bake a portfolio for an AI Developer role at DummyAI Labs",
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => void sendText(chip)}
                    className="rounded-full border border-(--border) bg-(--bg-elevated) px-3 py-1 text-xs text-(--fg-muted) hover:border-(--amber) hover:text-(--amber) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--amber) transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          messages.map((msg, idx) => (
            <ChatMessage key={idx} role={msg.role} markdown={msg.markdown} isError={msg.isError} />
          ))
        )}
        {pending && (
          <div className="flex w-full justify-start py-4">
            <div className="bg-(--bg-sunken) border border-(--hairline) rounded-2xl rounded-tl-none px-4 py-3 shadow-xs text-(--fg) flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-(--amber) animate-bounce [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-(--amber) animate-bounce [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-(--amber) animate-bounce" />
              <span className="ml-1 text-[11px] font-mono text-(--fg-muted)">
                composing fragments…
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Ask about Andrew's projects or experience"
          placeholder={
            isOnline
              ? "Ask about projects, or paste a job description to bake a layout…"
              : "Chat is disabled because OCT is offline..."
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
