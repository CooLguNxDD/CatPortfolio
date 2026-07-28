/**
 * Ephemeral chat seed store — QuickActions chips set pendingPrompt;
 * ChatPanel consumes and clears it.
 */

import { create } from "zustand";

export interface ChatSlice {
  pendingPrompt: string | null;
  setPendingPrompt: (prompt: string | null) => void;
}

/** Zustand store for ephemeral chat state like pending prompts. */
export const useChatStore = create<ChatSlice>((set) => ({
  pendingPrompt: null,
  setPendingPrompt: (prompt) => set({ pendingPrompt: prompt }),
}));
