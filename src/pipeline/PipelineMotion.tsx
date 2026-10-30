import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import type { PipelineContent } from "@/content/pipelineSchema"
import { buildStops, createTimeline } from "./timeline"

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)"

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

/** Live `prefers-reduced-motion`; assumes reduced until a browser says otherwise. */
function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribeReducedMotion, () => window.matchMedia(REDUCED_MOTION).matches, () => true)
}

const percent = (progress: number) => `${(progress * 100).toFixed(3)}%`

/**
 * One request token travelling the Act 1 stages, the Act 2 hops and back to the browser.
 * Progressive enhancement only: the page text never depends on it, and reduced motion renders no token.
 * Driven by the page scroll (the stop list item nearest the viewport centre) and by the step buttons.
 */
export default function PipelineMotion({ content }: { content: PipelineContent }) {
  const reduced = usePrefersReducedMotion()
  const timeline = useMemo(() => createTimeline(buildStops(content)), [content])
  const [index, setIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const stop = timeline.stops[index]

  // Mark the page's list item for the active stop. Return stops reuse their hop's element.
  useEffect(() => {
    const page = rootRef.current?.closest("article")
    if (reduced || !page) return
    const items = [...page.querySelectorAll<HTMLElement>("[data-stop-id]")]
    for (const item of items) {
      if (item.dataset.stopId === stop.id) item.setAttribute("aria-current", "step")
      else item.removeAttribute("aria-current")
    }
    return () => items.forEach((item) => item.removeAttribute("aria-current"))
  }, [reduced, stop.id])

  // Scroll drives the token: the stop item closest to the viewport centre band wins.
  useEffect(() => {
    const page = rootRef.current?.closest("article")
    if (reduced || !page || typeof IntersectionObserver === "undefined") return
    const inBand = new Set<HTMLElement>()
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const item = entry.target as HTMLElement
        if (entry.isIntersecting) inBand.add(item)
        else inBand.delete(item)
      }
      const centre = window.innerHeight / 2
      let nearest: HTMLElement | undefined
      let distance = Infinity
      for (const item of inBand) {
        const box = item.getBoundingClientRect()
        const d = Math.abs(box.top + box.height / 2 - centre)
        if (d < distance) [nearest, distance] = [item, d]
      }
      const id = nearest?.dataset.stopId
      if (!id) return
      // Keep a return-leg stop when its hop is the item in view; otherwise jump to the outbound stop.
      setIndex((current) => {
        if (timeline.stops[current].id === id) return current
        const next = timeline.indexOfId(id)
        return next === -1 ? current : next
      })
    }, { rootMargin: "-45% 0px -45% 0px" })
    page.querySelectorAll<HTMLElement>("[data-stop-id]").forEach((item) => observer.observe(item))
    return () => observer.disconnect()
  }, [reduced, timeline])

  if (reduced) return <span hidden data-testid="pipeline-motion-static" />

  const last = timeline.stops.length - 1
  const boundary = (timeline.progressFor(timeline.actBoundary - 1) + timeline.progressFor(timeline.actBoundary)) / 2
  const returnStart = timeline.stops.findIndex((s) => s.leg === "back")
  const actLabel = stop.act === "tailor" ? "Act 1 — Tailor" : "Act 2 — Serve"
  const legLabel = stop.leg === "back" ? " (response)" : ""
  return (
    <div ref={rootRef} className="pipeline-motion" data-testid="pipeline-motion" role="group" aria-label="Request walkthrough">
      <div className="pipeline-motion-rail" aria-hidden="true">
        <span className="pipeline-motion-label" data-act="tailor">Tailor</span>
        <span className="pipeline-motion-label" data-act="serve" style={{ left: percent(boundary) }}>Serve</span>
        {returnStart > 0 ? (
          <span className="pipeline-motion-label" data-leg="back" style={{ left: percent(timeline.progressFor(returnStart)) }}>Back</span>
        ) : null}
        <span className="pipeline-motion-track" />
        <span className="pipeline-motion-divider" style={{ left: percent(boundary) }} />
        {timeline.stops.map((s) => (
          <span
            key={s.index}
            className="pipeline-motion-tick"
            data-act={s.act}
            data-leg={s.leg}
            data-visited={s.index <= index}
            style={{ left: percent(timeline.progressFor(s.index)) }}
          />
        ))}
        <span
          data-testid="pipeline-token"
          className="pipeline-token"
          data-stop={stop.id}
          data-act={stop.act}
          data-leg={stop.leg}
          style={{ left: percent(timeline.progressFor(index)) }}
        />
      </div>
      <div className="pipeline-motion-controls">
        <button
          type="button"
          data-testid="pipeline-step-prev"
          aria-disabled={index === 0}
          onClick={() => setIndex((current) => timeline.prevStop(current))}
        >
          ← Previous stop
        </button>
        <p className="pipeline-motion-status" aria-live="polite" aria-atomic="true">
          {actLabel} · {index + 1} / {last + 1}: <strong>{stop.name}</strong>{legLabel}
        </p>
        <button
          type="button"
          data-testid="pipeline-step-next"
          aria-disabled={index === last}
          onClick={() => setIndex((current) => timeline.nextStop(current))}
        >
          Next stop →
        </button>
      </div>
      <p className="pipeline-motion-caption" data-testid="pipeline-motion-caption" data-visible={timeline.isActBoundary(index)}>
        Act 2 serves the request you just saw, through each hop and back.
      </p>
    </div>
  )
}
