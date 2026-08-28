/**
 * Global keyboard shortcuts for the fish tank stage.
 *
 * Promotes canvas-local hotkeys (e.g. F for feeding) to the whole window
 * while guarding against inputs, textareas, contenteditables, and modifiers.
 */

import { useEffect } from "react"
import { useFishTankStore } from "@/store"
import { fishBus } from "@/fish/fishBus"

/**
 * Pure guard helper: returns true if the event target is an editable input,
 * textarea, select, or contenteditable element.
 */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!target) return false
  if (typeof HTMLElement !== "undefined" && !(target instanceof HTMLElement)) return false
  const t = target as {
    tagName?: string
    isContentEditable?: boolean
    getAttribute?: (attr: string) => string | null
  }
  const tag = t.tagName?.toLowerCase()
  if (tag === "input" || tag === "textarea" || tag === "select") return true
  if (t.isContentEditable) return true
  if (typeof t.getAttribute === "function" && t.getAttribute("contenteditable") === "true") return true
  return false
}

export interface UseTankHotkeysOptions {
  enabled?: boolean
  onPrevSpecimen?: () => void
  onNextSpecimen?: () => void
  domains?: string[]
}

const DEFAULT_DOMAINS = ["ai", "devops", "mobile", "platform"]

/** Global hotkey listener mounted by FishTankStage. */
export function useTankHotkeys({
  enabled = true,
  onPrevSpecimen,
  onNextSpecimen,
  domains = DEFAULT_DOMAINS,
}: UseTankHotkeysOptions = {}): void {
  useEffect(() => {
    if (!enabled) return

    function onKeyDown(e: KeyboardEvent) {
      if (e.defaultPrevented) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (isEditableTarget(e.target)) return

      const key = e.key

      if (key === "f" || key === "F") {
        e.preventDefault()
        useFishTankStore.getState().dropFood()
        return
      }

      if (key === "m" || key === "M") {
        e.preventDefault()
        useFishTankStore.getState().toggleSound()
        return
      }

      if (key === "/") {
        e.preventDefault()
        fishBus.emit("search:focus")
        return
      }

      if (key === "?") {
        e.preventDefault()
        fishBus.emit("shortcuts:toggle")
        return
      }

      if (key === " ") {
        const isInteractive =
          e.target instanceof HTMLElement &&
          (e.target.tagName.toLowerCase() === "button" ||
            e.target.tagName.toLowerCase() === "a" ||
            e.target.getAttribute("role") === "button")
        if (!isInteractive && useFishTankStore.getState().state === "surface") {
          e.preventDefault()
          fishBus.emit("tank:dive")
        }
        return
      }

      if (key >= "1" && key <= "4") {
        const idx = parseInt(key, 10) - 1
        const domainList = domains.length ? domains : DEFAULT_DOMAINS
        if (idx < domainList.length) {
          e.preventDefault()
          fishBus.emit("filter:domain", domainList[idx])
        }
        return
      }

      if (key === "0") {
        e.preventDefault()
        fishBus.emit("filter:domain", "")
        return
      }

      if (key === "ArrowLeft") {
        if (onPrevSpecimen) {
          e.preventDefault()
          onPrevSpecimen()
        }
        return
      }

      if (key === "ArrowRight") {
        if (onNextSpecimen) {
          e.preventDefault()
          onNextSpecimen()
        }
        return
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [enabled, onPrevSpecimen, onNextSpecimen, domains])
}
