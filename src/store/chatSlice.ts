/**
 * Chat conversation state store — holds active conversation messages,
 * pending turn flags, CLI metadata, and seed prompts across view toggles.
 */

import { create } from "zustand";
import type { Message } from "@/components/chat/ChatMessage";
import type { CliMeta, PendingJob } from "@/api/harness";

export interface ChatSlice {
  messages: Message[];
  setMessages: (
    updater: Message[] | ((prev: Message[]) => Message[]),
  ) => void;
  pending: boolean;
  setPending: (pending: boolean) => void;
  cliMeta: CliMeta | null;
  setCliMeta: (meta: CliMeta | null) => void;
  discoveryJob: PendingJob | null;
  setDiscoveryJob: (job: PendingJob | null) => void;
  sessionId: string;
  pendingPrompt: string | null;
  setPendingPrompt: (prompt: string | null) => void;
  clearChat: () => void;
}

/** Zustand store for persistent chat state. */
export const useChatStore = create<ChatSlice>((set) => ({
  messages: [],
  setMessages: (updater) =>
    set((state) => ({
      messages:
        typeof updater === "function" ? updater(state.messages) : updater,
    })),
  pending: false,
  setPending: (pending) => set({ pending }),
  cliMeta: null,
  setCliMeta: (cliMeta) => set({ cliMeta }),
  discoveryJob: null,
  setDiscoveryJob: (discoveryJob) => set({ discoveryJob }),
  sessionId: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "session-1",
  pendingPrompt: null,
  setPendingPrompt: (prompt) => set({ pendingPrompt: prompt }),
  clearChat: () =>
    set({
      messages: [],
      cliMeta: null,
      discoveryJob: null,
    }),
}));
