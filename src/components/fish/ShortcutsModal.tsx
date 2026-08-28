/**
 * Keyboard shortcuts modal dialog.
 *
 * Traps focus and lists keyboard controls for the aquarium stage.
 */

import { useRef } from "react"
import { useFocusTrap } from "@/hooks/useFocusTrap"
import { cn } from "@/lib/utils"

export interface ShortcutsModalProps {
  open: boolean
  onClose: () => void
  className?: string
}

interface ShortcutEntry {
  key: string
  label: string
  context?: string
}

const SHORTCUTS: { category: string; items: ShortcutEntry[] }[] = [
  {
    category: "Aquarium & Interaction",
    items: [
      { key: "F", label: "Drop food pellets" },
      { key: "M", label: "Toggle hydro-acoustic audio" },
      { key: "/", label: "Focus project search bar" },
      { key: "Space", label: "Dive into the tank", context: "on surface" },
      { key: "?", label: "Toggle shortcuts dialog" },
      { key: "Esc", label: "Close modal / Release fish / Surface" },
    ],
  },
  {
    category: "Filters & Navigation",
    items: [
      { key: "1 – 4", label: "Filter domain (AI, DevOps, Mobile, Platform)" },
      { key: "0", label: "Clear domain filter" },
      { key: "← / →", label: "Previous / Next specimen", context: "dossier open" },
    ],
  },
]

export function ShortcutsModal({ open, onClose, className }: ShortcutsModalProps) {
  const modalRef = useRef<HTMLDivElement | null>(null)
  useFocusTrap(open, modalRef)

  if (!open) return null

  return (
    <div
      className={cn(
        "ft-shortcuts-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs",
        className,
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={modalRef}
        className="ft-shortcuts-modal glass relative w-full max-w-md rounded-2xl border border-(--hairline) p-6 shadow-2xl text-(--fg) animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ft-shortcuts-title"
      >
        <div className="flex items-center justify-between pb-4 border-b border-(--hairline)">
          <div className="flex items-center gap-2">
            <span className="text-base">⌨</span>
            <h2 id="ft-shortcuts-title" className="text-base font-semibold tracking-tight">
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            type="button"
            className="ft-chip-btn text-xs px-2.5 py-1"
            onClick={onClose}
            aria-label="Close shortcuts dialog"
          >
            ✕ Close
          </button>
        </div>

        <div className="mt-4 space-y-5 max-h-[65vh] overflow-y-auto pr-1">
          {SHORTCUTS.map((section) => (
            <div key={section.category} className="space-y-2">
              <h3 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-(--fg-subtle)">
                {section.category}
              </h3>
              <div className="rounded-xl border border-(--hairline)/60 bg-(--bg-sunken)/40 divide-y divide-(--hairline)/40">
                {section.items.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between px-3 py-2 text-xs"
                  >
                    <div className="flex flex-col">
                      <span className="text-(--fg-muted)">{item.label}</span>
                      {item.context ? (
                        <span className="text-[10px] text-(--fg-subtle) font-mono">
                          {item.context}
                        </span>
                      ) : null}
                    </div>
                    <kbd className="inline-flex items-center justify-center min-w-6 px-2 py-0.5 font-mono text-[11px] font-semibold text-(--fg) bg-(--bg-elevated) border border-(--border) rounded-md shadow-xs">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-3 border-t border-(--hairline) flex justify-end">
          <span className="text-[11px] font-mono text-(--fg-subtle)">
            Press <kbd className="px-1.5 py-0.5 rounded bg-(--bg-elevated) border border-(--border)">Esc</kbd> to dismiss
          </span>
        </div>
      </div>
    </div>
  )
}
