/**
 * LandscapeGate — shown instead of the fish tank when a phone is held upright.
 *
 * Mounted *in place of* FishTankStage, so nothing behind it touches WebGL or
 * fetches the lazy three chunk. Rotating the phone dismisses it (HomePage acks
 * the orientation as soon as the portrait query stops matching); the buttons
 * cover visitors who would rather not rotate. Theme tokens only.
 */
import { useEffect, useRef } from "react"
import { useFocusTrap } from "@/hooks/useFocusTrap"

export interface LandscapeGateProps {
  /** Enter the tank anyway, in portrait. */
  onContinue: () => void
  /** Switch to the text view (`?v=text`). */
  onText: () => void
}

/** Full-bleed "best in landscape" prompt with portrait / text escape hatches. */
export function LandscapeGate({ onContinue, onText }: LandscapeGateProps) {
  const firstRef = useRef<HTMLButtonElement>(null)
  // aria-modal: keep Tab inside the gate (the shell header stays mounted).
  const dialogRef = useRef<HTMLDivElement>(null)
  useFocusTrap(true, dialogRef)

  useEffect(() => {
    firstRef.current?.focus({ preventScroll: true })
  }, [])

  return (
    <div className="ft-gate" data-testid="landscape-gate">
      <div
        ref={dialogRef}
        className="ft-gate-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ft-gate-title"
        aria-describedby="ft-gate-desc"
      >
        <div className="ft-gate-phone" aria-hidden="true">
          <span className="ft-gate-phone-body">
            <span className="ft-gate-phone-fish">🐟</span>
          </span>
          <span className="ft-gate-arrow">↻</span>
        </div>
        <span className="ft-eyebrow">
          <i className="ft-pulse" /> 3D aquarium
        </span>
        <h2 id="ft-gate-title">Best in landscape</h2>
        <p id="ft-gate-desc">
          Turn your phone sideways to dive into the tank. Each fish is a
          shipped project, and the tank needs room to swim.
        </p>
        <div className="ft-gate-actions">
          <button
            ref={firstRef}
            type="button"
            className="ft-btn ft-cta"
            onClick={onContinue}
          >
            Continue in portrait
          </button>
          <button type="button" className="ft-btn" onClick={onText}>
            Use text view instead
          </button>
        </div>
        <p className="ft-gate-note">Rotate any time, and the tank opens on its own.</p>
      </div>
    </div>
  )
}
