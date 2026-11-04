/**
 * TankTutorial — a short first-run tour of the aquarium, on ScrollCards.
 *
 * FishTankStage opens it once per device when the 3D tank first mounts
 * (preferences `tankTutorialSeen`, persisted), and again from
 * Scene controls → "Show tutorial". Wording follows the input: touch gets
 * tap / swipe / pinch, a mouse gets click / scroll / drag. Any way of
 * closing it (finish, skip, ✕, Escape) counts as seen.
 */

import { useEffect, useMemo, useRef, useState } from "react"
import { X } from "lucide-react"
import { ScrollCards, type ScrollCard } from "@/components/ui/scroll-cards"
import { useFocusTrap } from "@/hooks/useFocusTrap"

export interface TankTutorialProps {
  open: boolean
  onClose: () => void
}

function isCoarsePointer(): boolean {
  if (typeof matchMedia !== "function") return false
  try {
    return matchMedia("(pointer: coarse)").matches
  } catch {
    return false
  }
}

/** The tour's cards, worded for touch or mouse. */
function tankTutorialCards(touch: boolean): ScrollCard[] {
  return [
    {
      id: "welcome",
      eyebrow: "Quick tour · 1 of 4",
      art: "🐟",
      title: "Every fish is a project",
      body: (
        <>
          Bigger fish are bigger projects, and deeper water is older work. The
          cat on the rim is just keeping an eye on things.
        </>
      ),
    },
    {
      id: "dive",
      eyebrow: "Quick tour · 2 of 4",
      art: "🌊",
      title: "Dive in",
      body: touch ? (
        <>
          Tap <b className="text-(--fg)">Dive into the tank</b>, or swipe up on
          the water.
        </>
      ) : (
        <>
          Click <b className="text-(--fg)">Dive into the tank</b>, or scroll
          down over the water.
        </>
      ),
    },
    {
      id: "explore",
      eyebrow: "Quick tour · 3 of 4",
      art: "👆",
      title: "Meet a project",
      body: touch ? (
        <>
          Drag to look around, pinch to zoom, and tap a fish to open its story.
          Double-tap the water to feed them.
        </>
      ) : (
        <>
          Drag to orbit, scroll to zoom, and click a fish to open its story.
          Double-click the water to feed them.
        </>
      ),
    },
    {
      id: "find",
      eyebrow: "Quick tour · 4 of 4",
      art: "🧭",
      title: "Find your way",
      body: (
        <>
          <b className="text-(--fg)">Browse projects</b> lists everything,{" "}
          <b className="text-(--fg)">Ask</b> answers questions, and{" "}
          <b className="text-(--fg)">Controls</b> holds lighting, sound, sonar
          and the timeline. Prefer plain text? <b className="text-(--fg)">Text</b>{" "}
          is always in the top corner.
        </>
      ),
    },
  ]
}

/** First-run tour overlay: centred card on desktop, bottom sheet on phones. */
export function TankTutorial({ open, onClose }: TankTutorialProps) {
  const dialogRef = useRef<HTMLElement | null>(null)
  const [index, setIndex] = useState(0)
  const cards = useMemo(() => tankTutorialCards(isCoarsePointer()), [])
  useFocusTrap(open, dialogRef)

  // Every opening starts at the first card, with focus on the primary
  // action (Next). Runs after useFocusTrap's own first-element focus.
  useEffect(() => {
    if (!open) return
    setIndex(0)
    dialogRef.current?.querySelector<HTMLElement>(".ft-cta")?.focus({ preventScroll: true })
  }, [open])

  if (!open) return null

  return (
    <div className="ft-tutorial" data-testid="tank-tutorial">
      <section
        ref={dialogRef}
        className="ft-tutorial-card glass"
        role="dialog"
        aria-modal="true"
        aria-label="Tank tutorial"
      >
        <ScrollCards
          cards={cards}
          label="Tank tutorial"
          index={index}
          onIndexChange={setIndex}
          renderActions={({ isFirst, isLast, next, prev }) => (
            <>
              {isFirst ? (
                <button type="button" className="ft-btn" onClick={onClose}>
                  Skip
                </button>
              ) : (
                <button type="button" className="ft-btn" onClick={prev}>
                  Back
                </button>
              )}
              {isLast ? (
                <button type="button" className="ft-btn ft-cta" onClick={onClose}>
                  Start exploring
                </button>
              ) : (
                <button type="button" className="ft-btn ft-cta" onClick={next}>
                  Next
                </button>
              )}
            </>
          )}
        />
        {/* After the deck in DOM order (positioned top-right) so Tab reaches
            the cards and actions before ✕. */}
        <button
          type="button"
          className="ft-controls-close ft-tutorial-close"
          onClick={onClose}
          aria-label="Close tutorial"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </section>
    </div>
  )
}
