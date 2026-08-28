import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSharedClient } from "@/api/octClient";
import {
  askOct,
  extractBakeMeta,
  extractBlockPatch,
  extractCarryLayout,
  extractFocusSlug,
  extractHighlightSlugs,
  extractPendingJob,
  sanitizeAskMarkdown,
  type BlockPatchResult,
  type CliMeta,
  type FishPoolItem,
  type PendingJob,
} from "@/api/harness";
import { loadJobLayout } from "@/content/loadLayout";
import { ChatMessage, type Message, type MessageAction } from "./ChatMessage";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/store/chatSlice";
import { useFishTankStore, useLayoutStore } from "@/store";
import { applyBlockPatch, applyLayoutToCache } from "@/store/applyLayout";
import { fishBus } from "@/fish/fishBus";
import { bestFishForQuestion } from "@/fish/matchFish";
import { sceneFromLayout } from "@/fish/sceneFromLayout";
import type { Layout } from "@/content/schema";

/** The client skeleton an ask turn needs: block identity, not block content. */
export interface AskContext {
  view: "tank" | "text";
  blockIndex: { id: string; type: string; slug?: string }[];
  tankSlugs: string[];
  dag: Layout["meta"]["dag"] | null;
  timeSpan: { min: number; max: number } | null;
}

/** Project slug carried by a block, when it has one. */
function slugOfBlock(block: Layout["blocks"][number]): string | undefined {
  const props = block.props as Record<string, unknown> | undefined;
  const explicit = props?.slug;
  if (typeof explicit === "string" && explicit.trim()) return explicit.trim();
  // ``card-<slug>`` — the same prefix convention fishFromLayout strips.
  const prefix = `${block.type}-`;
  if (block.id?.startsWith(prefix)) return block.id.slice(prefix.length);
  return undefined;
}

/**
 * Describe the layout on screen without shipping it.
 *
 * The server addresses blocks by (type, slug) and only needs `(id, type)` pairs
 * to recompute DAG bands, so an ask turn sends a skeleton instead of 100kB of
 * layout JSON. `timeSpan` is echoed back so a rebuilt tank keeps its depth
 * scale and existing fish don't visibly resettle.
 */
export function buildAskContext(
  layout: Layout | null | undefined,
  view: "tank" | "text",
): AskContext {
  if (!layout) {
    return { view, blockIndex: [], tankSlugs: [], dag: null, timeSpan: null };
  }
  const scene = sceneFromLayout(layout);
  const tank = layout.blocks.find((b) => b.type === "fishTank");
  const span = (tank?.props as { timeSpan?: { min: number; max: number } } | undefined)
    ?.timeSpan;
  return {
    view,
    blockIndex: layout.blocks.map((b) => {
      const slug = slugOfBlock(b);
      return { id: b.id, type: b.type, ...(slug ? { slug } : {}) };
    }),
    tankSlugs: scene.fish.map((f) => f.slug),
    dag: layout.meta?.dag ?? null,
    timeSpan: span ?? null,
  };
}

/**
 * Ask directive — hands the server the page skeleton and names the flow.
 *
 * Deliberately thin compared to the directive it replaces: the routing decision
 * now lives in `portfolio_ask_v1`'s deterministic stages, so this no longer
 * tries to talk the agent out of a full-page compose. Prompt-steering that was
 * exactly what kept failing.
 */
export function askDirective(ctx: AskContext): string {
  return (
    "\n\n[System: CatPortfolio ask turn (goal_class=scoped_ask). Route via " +
    "portfolio_ask_v1: route_portfolio_ask -> build_ask_overlay. Return changed " +
    "blocks only; do not compose or bake a whole page unless the visitor is " +
    "actually describing a job posting. Page context: " +
    JSON.stringify({
      view: ctx.view,
      block_index: ctx.blockIndex,
      tank_slugs: ctx.tankSlugs,
      dag: ctx.dag,
      time_span: ctx.timeSpan,
    }) +
    "]"
  );
}

/** Label for the one-shot CLI pill (mirrors OpenCat admin McpMode). */
function oneShotPillLabel(cli: CliMeta): string {
  const agent = (cli.agent || "").toLowerCase();
  if (agent === "agy" || cli.provider === "agy-cli") return "one-shot cli · agy";
  if (agent === "claude" || cli.provider === "claude-cli") return "one-shot cli · claude";
  return `one-shot cli · ${cli.agent}`;
}

/**
 * Chip actions for an ask turn: focus pills for every relevant project, then
 * "view" pills for patched blocks the visitor might want to jump to.
 *
 * The fishTank block is excluded from "view" pills — it's the live 3D scene
 * itself, not a scrollable text card, so a pill for it would force `v=text`
 * just to scroll to content already visible in tank mode.
 */
export function buildMessageActions(
  focusSlug: string | null,
  highlightSlugs: string[],
  patch: BlockPatchResult | null,
  pool?: FishPoolItem[] | null,
): MessageAction[] {
  const actions: MessageAction[] = [];
  const seenFocus = new Set<string>();
  for (const slug of [focusSlug, ...highlightSlugs]) {
    if (!slug || seenFocus.has(slug)) continue;
    seenFocus.add(slug);
    actions.push({ kind: "focus", target: slug, label: slug });
  }
  const fishTankIds = new Set(
    (patch?.blocks ?? [])
      .filter((b) => b.type === "fishTank")
      .map((b) => b.id),
  );
  const seenView = new Set<string>();
  for (const id of patch?.patchedIds ?? []) {
    if (actions.length >= 4) break;
    if (fishTankIds.has(id) || seenView.has(id)) continue;
    seenView.add(id);
    actions.push({ kind: "view", target: id, label: id });
  }
  const seenSpawn = new Set<string>();
  for (const item of pool ?? []) {
    if (actions.length >= 4) break;
    if (!item.slug || seenFocus.has(item.slug) || seenView.has(item.slug) || seenSpawn.has(item.slug)) continue;
    seenSpawn.add(item.slug);
    actions.push({ kind: "spawn", target: item.slug, label: `Add ${item.name}` });
  }
  return actions;
}

export interface ChatPanelProps {
  /** The layout currently on screen — the thing an ask turn patches. */
  layout?: Layout | null;
  /** Which canvas the visitor is looking at; decides fish vs text intents. */
  view?: "tank" | "text";
}

/** Poll cadence for an in-flight discovery job. */
const DISCOVERY_POLL_MS = 3000;
/** A discovery job older than this is abandoned client-side. */
const DISCOVERY_TIMEOUT_MS = 60_000;

/**
 * Renders the interactive chat panel, managing the conversation state and
 * executing ask-mode layout patches or fish tank focus changes.
 */
export function ChatPanel({ layout = null, view = "text" }: ChatPanelProps = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [cliMeta, setCliMeta] = useState<CliMeta | null>(null);
  const [discoveryJob, setDiscoveryJob] = useState<PendingJob | null>(null);
  // Read at send time, not captured in the callback's deps — a layout patch
  // mid-turn must not re-create sendText and cancel the in-flight turn.
  const currentLayoutRef = useRef<Layout | null>(layout);
  const viewRef = useRef<"tank" | "text">(view);
  currentLayoutRef.current = layout;
  viewRef.current = view;
  const demoShortId = useLayoutStore((s) => s.shortId);
  const [lastBakeId, setLastBakeId] = useState<string | null>(
    () => useLayoutStore.getState().shortId,
  );
  const [sessionId] = useState(() => crypto.randomUUID());
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();
  const pendingPrompt = useChatStore((s) => s.pendingPrompt);
  const setPendingPrompt = useChatStore((s) => s.setPendingPrompt);

  // Keep bake chip in sync when Home seeded a ?j= demo session.
  useEffect(() => {
    if (demoShortId) setLastBakeId(demoShortId);
  }, [demoShortId]);

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

      const currentLayout = currentLayoutRef.current;
      const ctx = buildAskContext(currentLayout, viewRef.current);
      const directive = askDirective(ctx);

      // Focus a fish the visitor can already see, before the round trip. The
      // server's focus_slug overrides this when the turn lands; this only
      // removes the wait, it never picks a fish that isn't in the tank.
      if (ctx.view === "tank" && currentLayout) {
        const local = bestFishForQuestion(
          sceneFromLayout(currentLayout).fish,
          userMessageText,
        );
        if (local) fishBus.emit("fish:pick", { slug: local.slug });
      }

      // No REST race. `loadLayoutForQuery` / `composeLayoutLive` each rebuild
      // the whole page, which is precisely what an ask turn must not do — that
      // race was the real cause of "the page reset itself" on every question.
      // A whole layout is applied only when the turn was actually a bake.

      try {
        const result = await askOct(userMessageText, sessionId, directive);
        if (result.ok) {
          if (result.cli) setCliMeta(result.cli);

          // 1) Surgical overlay — the ask path. Changed blocks only.
          const patch = extractBlockPatch(result.raw);
          const focusSlug = extractFocusSlug(result.raw);
          const highlightSlugs = extractHighlightSlugs(result.raw);
          const pendingJob = extractPendingJob(result.raw);

          // Chips let the visitor jump to what changed without re-asking.
          const actions = buildMessageActions(focusSlug, highlightSlugs, patch);
          // A dropped block means the agent's output was partially malformed —
          // tell the visitor rather than silently rendering fewer blocks than
          // it meant to (previously only a console.warn in extractBlockPatch).
          const droppedNote =
            patch?.dropped && patch.dropped > 0
              ? `\n\n_(${patch.dropped} block${patch.dropped === 1 ? "" : "s"} couldn't be rendered)_`
              : "";
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              markdown: sanitizeAskMarkdown(result.markdown) + droppedNote,
              ...(actions.length ? { actions } : {}),
            },
          ]);

          // 2) Whole-layout carry — only a real bake should produce one.
          const carryLayout = patch ? null : extractCarryLayout(result.raw);
          const bake = extractBakeMeta(result.raw);
          if (bake?.shortId) setLastBakeId(bake.shortId);

          if (patch) {
            const applied = applyBlockPatch(queryClient, {
              blocks: patch.blocks,
              patchedIds: patch.patchedIds,
              dag: patch.dag,
              highlightSlugs: patch.highlightSlugs,
            });
            if (!applied) {
              console.warn("[ChatPanel] block patch had no layout to apply to");
            }
          } else if (carryLayout) {
            applyLayoutToCache(queryClient, {
              layout: carryLayout,
              source: bake?.shortId ? "bake" : "live",
              shortId: bake?.shortId,
            });
          } else if (bake?.shortId) {
            const baked = await loadJobLayout(bake.shortId);
            applyLayoutToCache(queryClient, baked);
          }

          // Skip when the pre-flight guess (line ~186) already landed on this
          // slug — re-firing setFocus/fish:pick on an already-focused fish is
          // a redundant chime and a redundant router round trip, and it was
          // masking the real double-zoom bug caused by the scene remount.
          if (focusSlug && useFishTankStore.getState().focus !== focusSlug) {
            useFishTankStore.getState().setFocus(focusSlug);
            fishBus.emit("fish:pick", { slug: focusSlug });
          }
          // Only poll a job that is still running. A ready/empty token is
          // leftover from the same-turn wait and must not re-ask.
          if (pendingJob && (pendingJob.status ?? "pending") === "pending") {
            setDiscoveryJob(pendingJob);
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
          // A failed turn leaves the layout alone. Rebuilding the page as a
          // consolation prize is worse than answering nothing.
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
    },
    [pending, isOnline, sessionId, queryClient],
  );

  // Latest sendText for the poller below — read at fire time, not captured at
  // effect-setup time, so the poller doesn't need sendText in its deps (which
  // would restart the interval and re-post the notice on every render).
  const sendTextRef = useRef(sendText);
  useEffect(() => {
    sendTextRef.current = sendText;
  }, [sendText]);

  // A question with no inventory match queues a read-only discovery job.
  // Poll it, then re-ask once so the grounded project can enter the tank.
  useEffect(() => {
    if (!discoveryJob?.job_id) return;
    let cancelled = false;
    const controller = new AbortController();
    let timer: ReturnType<typeof window.setTimeout> | null = null;
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        markdown: "_Nothing in the inventory matches that yet — looking it up…_",
      },
    ]);

    const started = Date.now();
    // Recursive setTimeout, not setInterval: the next poll is scheduled only
    // after the previous one resolves, so a slow tool call can't overlap
    // itself into a race of out-of-order status updates.
    const poll = async () => {
      if (cancelled) return;
      if (Date.now() - started > DISCOVERY_TIMEOUT_MS) {
        setDiscoveryJob(null);
        return;
      }
      try {
        const client = await getSharedClient();
        const res = await client.callTool(
          "get_context_discovery",
          { job_id: discoveryJob.job_id },
          { signal: controller.signal },
        );
        if (cancelled) return;
        const status = (res.data as { status?: string } | undefined)?.status;
        if (!status || status === "pending") {
          timer = window.setTimeout(poll, DISCOVERY_POLL_MS);
          return;
        }
        setDiscoveryJob(null);
        if (status === "ready") {
          void sendTextRef.current(discoveryJob.query || "");
        } else {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              markdown: "I don't have a project that matches that.",
            },
          ]);
        }
      } catch {
        if (!cancelled) setDiscoveryJob(null);
      }
    };
    timer = window.setTimeout(poll, DISCOVERY_POLL_MS);

    return () => {
      cancelled = true;
      controller.abort();
      if (timer != null) window.clearTimeout(timer);
    };
  }, [discoveryJob]);

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
                ? "Ask about experience, projects, or a job fit — the page re-renders live from fragments while the agent answers. Questions are stored (capped) in an ask-turn audit; the layout overlay is not."
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
            <ChatMessage
              key={idx}
              role={msg.role}
              markdown={msg.markdown}
              isError={msg.isError}
              actions={msg.actions}
            />
          ))
        )}
        {pending && (
          <div className="flex w-full justify-start py-4">
            <span className="sr-only" aria-live="polite">
              composing fragments…
            </span>
            <div className="bg-(--bg-sunken) border border-(--hairline) rounded-2xl rounded-tl-none px-4 py-3 shadow-xs text-(--fg) flex items-center gap-2" aria-hidden="true">
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
      <p className="text-[11px] text-(--fg-subtle) font-mono">
        The question is persisted in <code>portfolio_ask_turns</code> (length-capped).
        That is not consent to keep a conversation — overlays die on reload.
      </p>
    </div>
  );
}
