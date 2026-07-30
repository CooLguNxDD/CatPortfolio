/**
 * Demo layout store is in-memory (no async rehydrate). Always "ready".
 * Kept as a hook so call sites stay stable if we reintroduce persist later.
 */

/** Always true — temporary store needs no hydration wait. */
export function useLayoutSessionHydrated(): boolean {
  return true
}
