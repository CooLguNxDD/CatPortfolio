/**
 * SceneControls — the underwater "Controls" panel (design review v2).
 *
 * Everything that tunes the scene rather than finding work lives here:
 * lighting, sound, sonar, feeding, the year timeline, the bake highlight and
 * the gesture / shortcut guide. The bottom bar keeps only Browse · Ask ·
 * Controls, and FishTankStage keeps one panel open at a time.
 * Actions reuse the existing store slices and bus commands — no new state.
 */

import { useEffect, useRef } from "react"
import { useShallow } from "zustand/react/shallow"
import { X } from "lucide-react"
import { usePreferencesStore, useFishTankStore } from "@/store"
import { fishBus } from "@/fish/fishBus"
import { useFocusTrap } from "@/hooks/useFocusTrap"
import { DepthScrubber } from "@/components/fish/DepthScrubber"

export interface SceneControlsProps {
  open: boolean
  onClose: () => void
  /** Job-bake highlight row — only when the layout is tailored. */
  showBake?: boolean
}

const LIGHTING_LABEL = {
  auto: "Auto · local clock",
  day: "Lagoon · day",
  night: "Abyss · night",
} as const

function isCoarsePointer(): boolean {
  if (typeof matchMedia !== "function") return false
  try {
    return matchMedia("(pointer: coarse)").matches
  } catch {
    return false
  }
}

/** Scene settings sheet: bottom sheet on phones, anchored card on desktop. */
export function SceneControls({ open, onClose, showBake = false }: SceneControlsProps) {
  const panelRef = useRef<HTMLElement | null>(null)
  const firstRef = useRef<HTMLButtonElement | null>(null)
  useFocusTrap(open, panelRef)

  const { soundEnabled, toggleSound, sonarOpen, toggleSonar, dropFood } = useFishTankStore(
    useShallow((s) => ({
      soundEnabled: s.soundEnabled,
      toggleSound: s.toggleSound,
      sonarOpen: s.sonarOpen,
      toggleSonar: s.toggleSonar,
      dropFood: s.dropFood,
    })),
  )
  const circadian = usePreferencesStore((s) => s.circadian)
  const cycleCircadian = usePreferencesStore((s) => s.cycleCircadian)

  useEffect(() => {
    if (open) firstRef.current?.focus({ preventScroll: true })
  }, [open])

  if (!open) return null
  const touch = isCoarsePointer()

  return (
    <section
      ref={panelRef}
      className="ft-controls glass"
      role="dialog"
      aria-modal="false"
      aria-labelledby="ft-controls-title"
      data-testid="scene-controls"
    >
      <header className="ft-controls-head">
        <div>
          <p className="ft-controls-eyebrow">Make yourself comfortable</p>
          <h2 id="ft-controls-title">Scene controls</h2>
        </div>
        <button
          type="button"
          className="ft-controls-close"
          onClick={onClose}
          aria-label="Close scene controls"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </header>

      <div className="ft-controls-row">
        <div>
          <p className="ft-controls-name">Lighting</p>
          <p className="ft-controls-hint">Day, night, or follow your clock</p>
        </div>
        <button ref={firstRef} type="button" className="ft-controls-btn" onClick={() => cycleCircadian()}>
          {LIGHTING_LABEL[circadian] ?? circadian}
        </button>
      </div>

      <div className="ft-controls-row">
        <div>
          <p className="ft-controls-name">Sound</p>
          <p className="ft-controls-hint">Spatial water ambience</p>
        </div>
        <button
          type="button"
          className="ft-controls-btn"
          aria-pressed={soundEnabled}
          onClick={() => toggleSound()}
        >
          {soundEnabled ? "On" : "Off"}
        </button>
      </div>

      <div className="ft-controls-row">
        <div>
          <p className="ft-controls-name">Sonar</p>
          <p className="ft-controls-hint">A small map of every fish</p>
        </div>
        <button
          type="button"
          className="ft-controls-btn"
          aria-pressed={sonarOpen}
          onClick={() => toggleSonar()}
        >
          {sonarOpen ? "Visible" : "Hidden"}
        </button>
      </div>

      <div className="ft-controls-row">
        <div>
          <p className="ft-controls-name">Feed the fish</p>
          <p className="ft-controls-hint">
            {touch ? "Or double-tap the water" : "Or double-click the water"}
          </p>
        </div>
        <button type="button" className="ft-controls-btn" onClick={() => dropFood()}>
          Drop food
        </button>
      </div>

      {showBake ? (
        <div className="ft-controls-row">
          <div>
            <p className="ft-controls-name">Job highlight</p>
            <p className="ft-controls-hint">Dim projects outside this role</p>
          </div>
          <button type="button" className="ft-controls-btn" onClick={() => fishBus.emit("bake:apply")}>
            Highlight
          </button>
        </div>
      ) : null}

      <div className="ft-controls-block">
        <p className="ft-controls-name">Timeline</p>
        <p className="ft-controls-hint">Deeper water is older work</p>
        <DepthScrubber variant="inline" />
      </div>

      <div className="ft-controls-block">
        <p className="ft-controls-name">{touch ? "Gestures" : "Mouse & keys"}</p>
        <ul className="ft-controls-gestures">
          {touch ? (
            <>
              <li><b>Drag</b> look around</li>
              <li><b>Pinch</b> zoom</li>
              <li><b>Tap</b> a fish for its story</li>
              <li><b>Double-tap</b> feed</li>
            </>
          ) : (
            <>
              <li><b>Drag</b> orbit</li>
              <li><b>Scroll</b> zoom</li>
              <li><b>Click</b> a fish for its story</li>
              <li><b>Double-click</b> feed</li>
              <li><b>Esc</b> back / surface</li>
            </>
          )}
        </ul>
        {touch ? null : (
          <button
            type="button"
            className="ft-controls-link"
            onClick={() => fishBus.emit("shortcuts:toggle")}
          >
            All keyboard shortcuts (?)
          </button>
        )}
      </div>

      <button type="button" className="ft-btn ft-cta ft-controls-done" onClick={onClose}>
        Back to exploring
      </button>
    </section>
  )
}
