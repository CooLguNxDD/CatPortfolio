# Code Health Assessment Report: Backend / Orchestration

This report contains findings from an exhaustive deep scan of the historical and functional context of the codebase, focusing on robustness, performance, defensive programming, and maintainability.

---

### Finding 1: Potentially unsafe ref assignment in ChatPanel
- **Priority:** Medium
- **Location:** `src/components/chat/ChatPanel.tsx` (Lines 432-434)
- **Explanation:** 
  Assigning to a ref (`sendTextRef.current = sendText`) inside a `useEffect` for a callback without proper synchronization can lead to issues in Concurrent React or Strict Mode. If the ref is read during render or before it settles, it might execute a stale version of the callback, causing unexpected behavior or bugs during rapid state changes.
- **Concrete Refactor:** 
  Use the `useEvent` pattern or safely capture the ref without triggering unnecessary effects if it only needs to be read in a callback.
  ```typescript
  // Consider utilizing a custom hook pattern for latest values:
  const useLatest = <T>(value: T) => {
    const ref = useRef(value);
    useInsertionEffect(() => {
      ref.current = value;
    });
    return ref;
  };
  const sendTextRef = useLatest(sendText);
  ```

---

### Finding 2: Missing timeout/abort on MCP ping
- **Priority:** Medium
- **Location:** `src/api/octClient.ts` (Lines 152-157)
- **Explanation:** 
  The `ping` operation in `octClient.ts` (`await this.client.ping();`) does not accept a timeout or AbortSignal. If the connection is partially dead or the server is unresponsive but the socket is still open, this promise could hang indefinitely, potentially blocking the thread or downstream processes that await it.
- **Concrete Refactor:** 
  Pass a timeout or signal to `this.client.ping({ timeout: 5000 })` if supported by the SDK. If the SDK does not support options here, wrap the call in a `Promise.race` with a rejection timeout to ensure it resolves/fails predictably.
  ```typescript
  async ping(): Promise<void> {
    if (!this.client) {
      throw new Error("client_not_connected");
    }
    // Assuming ping doesn't take opts natively, wrap it:
    await Promise.race([
      this.client.ping(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("ping timeout")), 5000))
    ]);
  }
  ```

---

### Finding 3: Unsafe focus restore in useFocusTrap
- **Priority:** Low
- **Location:** `src/hooks/useFocusTrap.ts` (Lines 74-81)
- **Explanation:** 
  Restoring focus on unmount via `previouslyFocused.focus()` can throw an error in some older browser versions if the element is no longer focusable, invisible, or invalid. Although there is a `document.contains(previouslyFocused)` check, unexpected states might still crash the unmount path.
- **Concrete Refactor:** 
  Wrap the `previouslyFocused.focus()` call in a `try...catch` block to ensure focus restoration doesn't crash the unmount path.
  ```typescript
  if (
    previouslyFocused &&
    document.contains(previouslyFocused) &&
    container.contains(document.activeElement)
  ) {
    try {
      previouslyFocused.focus();
    } catch (e) {
      // Ignore focus restoration errors on unmount
    }
  }
  ```

---

### Finding 4: ResizeObserver missing disconnect for dynamic nodes
- **Priority:** Low
- **Location:** `src/hooks/useLayoutDag.ts` (Lines 177-183)
- **Explanation:** 
  The `ResizeObserver` is attached to `document.querySelectorAll("[data-dag-level]")` once on mount based on the `levels` array length. If the actual DOM nodes change (e.g. dynamic content rendering late, like mermaid charts) without `levels` identity changing, those new nodes will not be observed. Furthermore, if nodes are removed, old ones might leak or no longer be observed correctly.
- **Concrete Refactor:** 
  Use a `MutationObserver` to watch the container for new nodes, or switch to a React `ref` callback pattern to dynamically attach/detach the `ResizeObserver` to elements as they enter/leave the DOM instead of relying on a one-time `querySelectorAll` loop inside the effect.
