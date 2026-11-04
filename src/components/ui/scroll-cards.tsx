/**
 * ScrollCards — a reusable, swipeable card deck (horizontal scroll-snap).
 *
 * Native scrolling does the swiping (touch, trackpad, shift+wheel), so it
 * needs no gesture library. Dots and arrow keys move between cards; the
 * caller can render its own actions (Skip / Next / Done) through
 * `renderActions`, which receives the deck state. Controlled (`index` +
 * `onIndexChange`) or uncontrolled. Theme tokens only; honours reduced motion.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

export interface ScrollCard {
  id: string
  eyebrow?: string
  title: string
  body: ReactNode
  /** Decorative visual above the title (emoji, icon, small illustration). */
  art?: ReactNode
}

export interface ScrollCardsState {
  index: number
  total: number
  isFirst: boolean
  isLast: boolean
  next: () => void
  prev: () => void
  goTo: (index: number) => void
}

export interface ScrollCardsProps {
  cards: ScrollCard[]
  /** Accessible name of the deck, e.g. "Tank tutorial". */
  label: string
  index?: number
  onIndexChange?: (index: number) => void
  renderActions?: (state: ScrollCardsState) => ReactNode
  className?: string
}

function prefersReducedMotion(): boolean {
  if (typeof matchMedia !== "function") return false
  try {
    return matchMedia("(prefers-reduced-motion: reduce)").matches
  } catch {
    return false
  }
}

/** Swipeable card deck with dots, arrow keys and caller-supplied actions. */
export function ScrollCards({
  cards,
  label,
  index: controlledIndex,
  onIndexChange,
  renderActions,
  className,
}: ScrollCardsProps) {
  const trackRef = useRef<HTMLDivElement | null>(null)
  const [ownIndex, setOwnIndex] = useState(0)
  const index = controlledIndex ?? ownIndex
  const total = cards.length

  const setIndex = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(total - 1, next))
      if (controlledIndex === undefined) setOwnIndex(clamped)
      onIndexChange?.(clamped)
    },
    [controlledIndex, onIndexChange, total],
  )

  // Scroll the track to the active card whenever the index changes from
  // outside a swipe (dots, buttons, keys, controlled prop).
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const left = index * track.clientWidth
    if (Math.abs(track.scrollLeft - left) < 2) return
    track.scrollTo({ left, behavior: prefersReducedMotion() ? "auto" : "smooth" })
  }, [index])

  // A swipe lands on a snap point; read the card it landed on.
  const onScroll = () => {
    const track = trackRef.current
    if (!track || track.clientWidth === 0) return
    const landed = Math.round(track.scrollLeft / track.clientWidth)
    if (landed !== index && Math.abs(track.scrollLeft - landed * track.clientWidth) < 2) {
      setIndex(landed)
    }
  }

  const state: ScrollCardsState = {
    index,
    total,
    isFirst: index === 0,
    isLast: index === total - 1,
    next: () => setIndex(index + 1),
    prev: () => setIndex(index - 1),
    goTo: setIndex,
  }

  return (
    <div
      className={cn("flex flex-col gap-4", className)}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
    >
      <div
        ref={trackRef}
        tabIndex={0}
        onScroll={onScroll}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") {
            e.preventDefault()
            state.next()
          } else if (e.key === "ArrowLeft") {
            e.preventDefault()
            state.prev()
          }
        }}
        className="flex snap-x snap-mandatory overflow-x-auto rounded-xl outline-none [scrollbar-width:none] focus-visible:ring-2 focus-visible:ring-(--amber) [&::-webkit-scrollbar]:hidden"
        aria-label={`${label}, card ${index + 1} of ${total}. Use arrow keys to move.`}
      >
        {cards.map((card, i) => (
          <article
            key={card.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${total}: ${card.title}`}
            aria-hidden={i !== index}
            className="flex w-full shrink-0 snap-center flex-col gap-2 px-1"
            data-card-id={card.id}
          >
            {card.art ? (
              <div className="mb-1 text-3xl leading-none" aria-hidden="true">
                {card.art}
              </div>
            ) : null}
            {card.eyebrow ? (
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-(--amber)">
                {card.eyebrow}
              </p>
            ) : null}
            <h3 className="text-xl font-semibold tracking-tight text-(--fg)">{card.title}</h3>
            <div className="text-sm leading-relaxed text-(--fg-muted)">{card.body}</div>
          </article>
        ))}
      </div>

      <p className="sr-only" aria-live="polite">
        Card {index + 1} of {total}: {cards[index]?.title}
      </p>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5" role="group" aria-label="Choose a card">
          {cards.map((card, i) => (
            <button
              key={card.id}
              type="button"
              aria-label={`Go to card ${i + 1}: ${card.title}`}
              aria-current={i === index ? "step" : undefined}
              onClick={() => setIndex(i)}
              className={cn(
                "h-2 rounded-full transition-all",
                i === index ? "w-6 bg-(--amber)" : "w-2 bg-(--fg-muted)/45 hover:bg-(--fg-muted)",
              )}
            />
          ))}
        </div>
        {renderActions ? <div className="flex items-center gap-2">{renderActions(state)}</div> : null}
      </div>
    </div>
  )
}
