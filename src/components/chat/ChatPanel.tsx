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
  extractRecommendations,
  sanitizeAskMarkdown,
  type BlockPatchResult,
  type CliMeta,
  type Recommendation,
} from "@/api/harness";
import { loadJobLayout } from "@/content/loadLayout";
import { ChatMessage, type MessageAction } from "./ChatMessage";
import {
  ArrowUp,
  Boxes,
  Briefcase,
  Cat,
  Check,
  Copy,
  Fish,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/store/chatSlice";
import { useFishTankStore, useLayoutStore } from "@/store";
import { applyBlockPatch, applyLayoutToCache } from "@/store/applyLayout";
import { fishBus } from "@/fish/fishBus";
import { sceneFromLayout } from "@/fish/sceneFromLayout";
import type { Layout } from "@/content/schema";

const FAUX_PHASES = [
  "Routing intent…",
  "Searching context…",
  "Patching blocks…",
  "Composing answer…",
] as const;

/** The client skeleton an ask turn needs: block identity, not block content. */
export interface AskContext {
  view: "tank" | "text";
  blockIndex: { id: string; type: string; slug?: string }[];
  tankSlugs: string[];
  dag: Layout["meta"]["dag"] | null;
  timeSpan: { min: number; max: number } | null;
  addSlugs?: string[];
  visitorSessionId?: string;
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
      ...(ctx.addSlugs?.length ? { add_slugs: ctx.addSlugs } : {}),
      ...(ctx.visitorSessionId ? { visitor_session_id: ctx.visitorSessionId } : {}),
    }) +
    "]"
  );
}

/** Label for the one-shot CLI pill (mirrors Whiskers admin McpMode). */
function oneShotPillLabel(cli: CliMeta): string {
  const agent = (cli.agent || "").toLowerCase();
  if (agent === "agy" || cli.provider === "agy-cli") return "one-shot cli · agy";
  if (agent === "claude" || cli.provider === "claude-cli") return "one-shot cli · claude";
  return `one-shot cli · ${cli.agent}`;
}

const MAX_ACTIONS = 4;

/**
 * Chip actions for an ask turn: recommendation ask/add chips first, then
 * focus pills, then "view" pills for patched blocks.
 *
 * The fishTank block is excluded from "view" pills — it's the live 3D scene
 * itself, not a scrollable text card, so a pill for it would force `v=text`
 * just to scroll to content already visible in tank mode.
 */
export function buildMessageActions(
  focusSlug: string | null,
  highlightSlugs: string[],
  patch: BlockPatchResult | null,
  recommendations: Recommendation[] = [],
): MessageAction[] {
  const actions: MessageAction[] = [];
  const seen = new Set<string>();

  const push = (action: MessageAction, key: string) => {
    if (actions.length >= MAX_ACTIONS) return;
    if (seen.has(key)) return;
    seen.add(key);
    actions.push(action);
  };

  for (const rec of recommendations) {
    if (!rec.slug) continue;
    if (rec.in_tank) {
      push(
        {
          kind: "ask",
          target: `Tell me about ${rec.name}`,
          label: `💡 Ask about ${rec.name}`,
          title: rec.reason,
          slug: rec.slug,
        },
        rec.slug,
      );
    } else {
      push(
        {
          kind: "add",
          target: rec.slug,
          label: `+ Add ${rec.name} to tank`,
          title: rec.reason,
          slug: rec.slug,
        },
        rec.slug,
      );
    }
  }

  for (const slug of [focusSlug, ...highlightSlugs]) {
    if (!slug) continue;
    push({ kind: "focus", target: slug, label: slug }, slug);
  }

  const fishTankIds = new Set(
    (patch?.blocks ?? [])
      .filter((b) => b.type === "fishTank")
      .map((b) => b.id),
  );
  for (const id of patch?.patchedIds ?? []) {
    if (fishTankIds.has(id)) continue;
    push({ kind: "view", target: id, label: id }, `view:${id}`);
  }
  return actions;
}

export interface ChatPanelProps {
  /** The layout currently on screen — the thing an ask turn patches. */
  layout?: Layout | null;
  /** Which canvas the visitor is looking at; decides fish vs text intents. */
  view?: "tank" | "text";
  /** Close handler — when set (tank dock), the header shows a close button. */
  onClose?: () => void;
}

/** Starter prompts on the empty state, grouped by what they show off. */
const SUGGESTION_GROUPS: {
  label: string;
  icon: LucideIcon;
  tone: "amber" | "neon";
  prompts: string[];
}[] = [
  {
    label: "Architecture & systems",
    icon: Boxes,
    tone: "amber",
    prompts: ["Show me your infra / SRE work", "What is the deepest system you built?"],
  },
  {
    label: "Live tank spawning",
    icon: Fish,
    tone: "neon",
    prompts: ["Show all MCP agent tooling"],
  },
  {
    label: "Job tailoring",
    icon: Briefcase,
    tone: "amber",
    prompts: ["Bake a portfolio for an AI Developer role at DummyAI Labs"],
  },
];

/** Composer textarea grows with its content up to this height (px), then scrolls. */
const COMPOSER_MAX_H = 140;

/** Poll cadence for an in-flight discovery job. */
const DISCOVERY_POLL_MS = 3000;
/** A discovery job older than this is abandoned client-side. */
const DISCOVERY_TIMEOUT_MS = 60_000;

/**
 * Renders the interactive chat panel, managing the conversation state and
 * executing ask-mode layout patches or fish tank focus changes.
 */
export function ChatPanel({ layout = null, view = "text", onClose }: ChatPanelProps = {}) {
  const messages = useChatStore((s) => s.messages);
  const setMessages = useChatStore((s) => s.setMessages);
  const pending = useChatStore((s) => s.pending);
  const setPending = useChatStore((s) => s.setPending);
  const cliMeta = useChatStore((s) => s.cliMeta);
  const setCliMeta = useChatStore((s) => s.setCliMeta);
  const discoveryJob = useChatStore((s) => s.discoveryJob);
  const setDiscoveryJob = useChatStore((s) => s.setDiscoveryJob);
  const sessionId = useChatStore((s) => s.sessionId);
  const clearChat = useChatStore((s) => s.clearChat);
  const pendingPrompt = useChatStore((s) => s.pendingPrompt);
  const setPendingPrompt = useChatStore((s) => s.setPendingPrompt);

  const [input, setInput] = useState("");
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
  const logContainerRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const queryClient = useQueryClient();

  const [copied, setCopied] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);

  // Display phases during long LLM/MCP generation (purely client-side UX pacing, not server events).
  useEffect(() => {
    if (!pending) {
      setPhaseIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setPhaseIndex((prev) => Math.min(prev + 1, FAUX_PHASES.length - 1));
    }, 2500);
    return () => clearInterval(interval);
  }, [pending]);

  // Keep bake chip in sync when Home seeded a ?j= demo session.
  useEffect(() => {
    if (demoShortId) setLastBakeId(demoShortId);
  }, [demoShortId]);

  const { data: tools, isSuccess, isPending: isConnecting } = useQuery({
    queryKey: ["oct", "tools"],
    queryFn: async () => {
      const client = await getSharedClient();
      return await client.listTools();
    },
    retry: false,
    staleTime: 300_000,
  });

  const isOnline = isSuccess && !!tools;
  // Discovery settled without a tool list: only now is "unavailable" true.
  const isOffline = !isOnline && !isConnecting;

  const lastAssistantMsg = messages.filter((m) => m.role === "assistant").slice(-1)[0];

  const handleCopy = async () => {
    if (!lastAssistantMsg?.markdown || typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(lastAssistantMsg.markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard write failed
    }
  };

  const handleClear = () => {
    clearChat();
  };

  useEffect(() => {
    if (messages.length === 0) return;
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [messages, pending]);

  // Grow the composer with its content instead of showing a one-row scroller.
  useEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, COMPOSER_MAX_H)}px`;
  }, [input]);

  const sendText = useCallback(
    async (userMessageText: string, extras?: { addSlugs?: string[] }) => {
      if (!userMessageText.trim() || pending || !isOnline) return;

      setInput("");
      setPending(true);

      setMessages((prev) => [...prev, { role: "user", markdown: userMessageText }]);

      const currentLayout = currentLayoutRef.current;
      const ctx: AskContext = {
        ...buildAskContext(currentLayout, viewRef.current),
        addSlugs: extras?.addSlugs,
        visitorSessionId: sessionId,
      };
      const directive = askDirective(ctx);

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
          const recommendations = extractRecommendations(result.raw);

          // Chips let the visitor jump to what changed without re-asking.
          const actions = buildMessageActions(
            focusSlug,
            highlightSlugs,
            patch,
            recommendations,
          );
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

  const sendAdd = useCallback(
    (slug: string) => {
      const name = slug.trim();
      if (!name) return;
      void sendText(`Add ${name} to the tank`, { addSlugs: [name] });
    },
    [sendText],
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

  const docked = Boolean(onClose);


  /** Offline escape hatch: the work stays reachable without the agent. */
  const browseProjects = () => {
    if (view === "tank") {
      fishBus.emit("view:chrome", "flat");
      onClose?.();
      return;
    }
    document
      .querySelector("[data-fishtank-flat]")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const offlineNotice = (
    <div className="flex flex-col gap-3" data-testid="chat-offline">
      <p className="text-sm leading-relaxed text-(--fg-muted)">
        The agent can't be reached right now, so no question is sent or stored. Every project is
        still here to explore.
      </p>
      <button
        type="button"
        onClick={browseProjects}
        className="self-start min-h-11 rounded-xl bg-(--amber) px-4 text-sm font-semibold text-(--bg) hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--amber) focus-visible:ring-offset-2 focus-visible:ring-offset-(--card) transition-all cursor-pointer"
      >
        Browse projects instead
      </button>
    </div>
  );

  const iconBtn =
    "h-9 w-9 rounded-lg inline-flex items-center justify-center text-(--fg-muted) hover:text-(--fg) hover:bg-(--fg)/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--amber) disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0";

  return (
    <section
      className={cn(
        "chat-panel w-full flex flex-col min-h-0 relative overflow-hidden",
        docked
          ? "h-full"
          : "rounded-2xl border border-(--hairline) bg-(--card) shadow-lg lg:max-h-[calc(100svh-5rem)]",
      )}
      data-variant={docked ? "dock" : "card"}
    >
      <header className="flex items-start gap-3 px-4 pt-4 pb-3 border-b border-(--hairline)">
        <span
          aria-hidden="true"
          className="mt-0.5 h-9 w-9 rounded-xl bg-(--amber)/15 text-(--amber) inline-flex items-center justify-center shrink-0"
        >
          <Cat className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-(--fg) leading-tight tracking-tight">
            Ask Portfolio
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-(--fg-muted)">
            <span className="inline-flex items-center gap-1.5" data-testid="chat-status" role="status">
              <span
                aria-hidden="true"
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  isOnline
                    ? "bg-emerald-500 shadow-[0_0_0_3px] shadow-emerald-500/20"
                    : isConnecting
                      ? "bg-(--fg-subtle) animate-pulse"
                      : "bg-red-500",
                )}
              />
              {isOnline ? "Ask ready" : isConnecting ? "Connecting…" : "Ask unavailable"}
            </span>
            {docked ? (
              <span className="text-(--fg-subtle)">· live-patches the tank</span>
            ) : null}
            {cliMeta && (
              <span
                className="rounded-md px-1.5 py-px font-mono text-[10px] border bg-(--neon)/10 text-(--neon) border-(--neon)/30 whitespace-nowrap"
                title="Whiskers core LLM is a headless CLI provider — this turn ran as a single CLI agent spawn."
              >
                {oneShotPillLabel(cliMeta)}
              </span>
            )}
            {lastBakeId && (
              <a
                href={`${import.meta.env.BASE_URL}?j=${encodeURIComponent(lastBakeId)}`}
                className="rounded-md px-1.5 py-px font-mono text-[10px] border border-(--hairline) text-(--fg-muted) hover:text-(--amber) hover:border-(--amber) transition-colors whitespace-nowrap max-w-full truncate"
                title="Open the baked job layout on the home page"
              >
                baked · j={lastBakeId}
              </a>
            )}
          </div>
        </div>
        <div className="flex items-center gap-0.5 -mr-1.5">
          {messages.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => void handleCopy()}
                disabled={!lastAssistantMsg}
                title={copied ? "Copied!" : "Copy last answer"}
                aria-label="copy chat"
                className={iconBtn}
              >
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={handleClear}
                title="Clear conversation"
                aria-label="clear chat"
                className={iconBtn}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              title="Close Ask Panel (Esc)"
              aria-label="Close Ask panel"
              className={iconBtn}
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </header>

      <div
        ref={logContainerRef}
        className={cn(
          "chat-scroll flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 space-y-4 select-text",
          !docked && "max-h-[min(60vh,520px)] lg:max-h-none",
        )}
        role="log"
        aria-live="polite"
        aria-atomic="false"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col gap-5">
            {isOffline ? (
              offlineNotice
            ) : (
              <p className="text-sm leading-relaxed text-(--fg-muted)">
                {isOnline
                  ? "Ask about experience, projects or a job fit. The page re-renders live while the agent answers."
                  : "Connecting to the agent…"}
              </p>
            )}
            {isOnline && (
              <div className="flex flex-col gap-4">
                {SUGGESTION_GROUPS.map((group) => (
                  <div key={group.label} className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-(--fg-subtle)">
                      <group.icon className="h-3 w-3" aria-hidden="true" />
                      {group.label}
                    </div>
                    {group.prompts.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => void sendText(chip)}
                        className={cn(
                          "group w-full flex items-center justify-between gap-3 min-h-11 rounded-xl border border-(--hairline) bg-(--bg-sunken)/60 px-3.5 py-2.5 text-left text-sm text-(--fg) transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2",
                          group.tone === "neon"
                            ? "hover:border-(--neon)/60 hover:bg-(--neon)/8 focus-visible:ring-(--neon)"
                            : "hover:border-(--amber)/60 hover:bg-(--amber)/8 focus-visible:ring-(--amber)",
                        )}
                      >
                        <span>{chip}</span>
                        <ArrowUp
                          aria-hidden="true"
                          className={cn(
                            "h-3.5 w-3.5 shrink-0 rotate-45 text-(--fg-subtle) transition-colors",
                            group.tone === "neon" ? "group-hover:text-(--neon)" : "group-hover:text-(--amber)",
                          )}
                        />
                      </button>
                    ))}
                  </div>
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
              onAsk={sendText}
              onAdd={sendAdd}
            />
          ))
        )}
        {/* Conversation already started: keep the offline guidance reachable. */}
        {isOffline && messages.length > 0 ? (
          <div className="rounded-xl border border-(--hairline) bg-(--bg-sunken)/60 p-3.5">
            {offlineNotice}
          </div>
        ) : null}
        {pending && (
          <div className="flex w-full items-start gap-2.5">
            <span className="sr-only" aria-live="polite">
              composing fragments…
            </span>
            <span
              aria-hidden="true"
              className="h-7 w-7 rounded-lg bg-(--amber)/15 text-(--amber) inline-flex items-center justify-center shrink-0"
            >
              <Cat className="h-4 w-4" />
            </span>
            <div
              className="bg-(--bg-sunken) border border-(--hairline) rounded-2xl rounded-tl-md px-3.5 py-2.5 text-(--fg) flex items-center gap-2"
              aria-hidden="true"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-(--amber) animate-bounce [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-(--amber) animate-bounce [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-(--amber) animate-bounce" />
              <span className="ml-1 text-[11px] font-mono text-(--fg-muted)">
                {FAUX_PHASES[phaseIndex]}
              </span>
            </div>
          </div>
        )}
      </div>

      <footer className="px-4 pt-3 pb-4 border-t border-(--hairline)">
        <div
          className={cn(
            "flex items-end gap-2 rounded-2xl border border-(--hairline) bg-(--bg) pl-3.5 pr-1.5 py-1.5 transition-colors",
            "focus-within:border-(--amber) focus-within:ring-2 focus-within:ring-(--amber)/25",
            !isOnline && "opacity-60",
          )}
        >
          <textarea
            ref={composerRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Ask about Andrew's projects or experience"
            placeholder={
              isOnline
                ? "Ask a question or paste a job post…"
                : isConnecting
                  ? "Connecting…"
                  : "Ask is unavailable right now"
            }
            disabled={pending || !isOnline}
            className="chat-scroll flex-1 min-w-0 resize-none bg-transparent py-1.5 text-sm leading-6 text-(--fg) outline-none placeholder:text-(--fg-subtle) disabled:cursor-not-allowed"
            style={{ maxHeight: COMPOSER_MAX_H }}
            rows={1}
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={pending || !input.trim() || !isOnline}
            aria-label="Send"
            title="Send (Enter) · new line (Shift+Enter)"
            className="h-9 w-9 shrink-0 rounded-xl bg-(--amber) text-(--bg) inline-flex items-center justify-center transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--amber) focus-visible:ring-offset-2 focus-visible:ring-offset-(--bg) disabled:bg-(--fg)/10 disabled:text-(--fg-subtle) disabled:cursor-not-allowed cursor-pointer"
          >
            <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>
        {isOnline ? (
          <p className="mt-2 text-[11px] leading-snug text-(--fg-subtle)">
            Questions are logged (length-capped) in <code className="font-mono">portfolio_ask_turns</code>;
            page changes vanish on reload.
          </p>
        ) : null}
      </footer>
    </section>
  );
}
