import { useEffect, type RefObject } from "react"

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

/**
 * Traps keyboard Tab focus within an active container (e.g. FishDossier or Ask dock).
 * Moves focus inside on activation if not already focused, and wraps Tab / Shift+Tab.
 */
export function useFocusTrap(
  active: boolean,
  containerRef: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    if (!active) return
    const container = containerRef.current
    if (!container) return

    const previouslyFocused = document.activeElement as HTMLElement | null

    const getFocusables = (): HTMLElement[] => {
      const elements = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      return Array.from(elements).filter(
        (el) =>
          !el.hasAttribute("disabled") &&
          (el.offsetParent !== null || el.getClientRects().length > 0),
      )
    }

    const focusables = getFocusables()
    if (focusables.length > 0 && !container.contains(document.activeElement)) {
      focusables[0]?.focus()
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return
      const containerEl = containerRef.current
      if (!containerEl) return

      const current = getFocusables()
      if (current.length === 0) {
        e.preventDefault()
        return
      }

      const first = current[0]!
      const last = current[current.length - 1]!

      if (e.shiftKey) {
        if (
          document.activeElement === first ||
          !containerEl.contains(document.activeElement)
        ) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (
          document.activeElement === last ||
          !containerEl.contains(document.activeElement)
        ) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      // Return focus to whatever triggered the trap, but only if the user
      // hasn't already moved focus elsewhere themselves (e.g. by clicking
      // away) and the trigger element is still attached to the DOM.
      if (
        previouslyFocused &&
        document.contains(previouslyFocused) &&
        container.contains(document.activeElement)
      ) {
        try {
          previouslyFocused.focus()
        } catch {
          // Element became unfocusable between the checks above and this
          // call (e.g. disabled/hidden during unmount) — never crash cleanup.
        }
      }
    }
  }, [active, containerRef])
}
