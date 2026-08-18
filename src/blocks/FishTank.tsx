/**
 * fishTank block shell — WebGL probe + reduced-motion gate + lazy Three canvas.
 * Mirrors Scene2d → Scene2dCanvas; three is never imported here.
 * Stage/immersive callers use FishTankView with the same canvas. Interaction
 * is bus/store-driven inside the canvas (see fish/fishBus.ts) — a bare inline
 * registry block like this one never subscribes a stage, so clicking a fish
 * here only locks the camera locally for one frame (no bus listener exists
 * to persist it) — this mirrors the pre-refactor inline behavior exactly.
 */

import { lazy, Suspense, useMemo } from "react"
import { useReducedMotion } from "motion/react"
import type { PropsOf } from "@/render/registry"
import type { FishSpecimenInput } from "./fishTankLayout"
import { probeWebGL2 } from "@/routes/viewMode"
import { FishTankErrorBoundary } from "@/components/FishTankErrorBoundary"
import { useLayoutStore, usePreferencesStore } from "@/store"

const FishTankCanvas = lazy(() => import("./FishTankCanvas"))

/** Stable empty highlight set — a per-render `[]` remounts the WebGL scene. */
const NO_HIGHLIGHTS: string[] = []

export interface FishTankViewProps {
  fish: FishSpecimenInput[]
  title?: string
  caption?: string
  immersive?: boolean
  /** Bake highlight set — layout-derived; see fishBus.ts for interaction state. */
  highlightSlugs?: string[]
  className?: string
}

/**
 * Shared view shell used by the block and the full-page stage. Interaction
 * (focus, dive progress, dossier anchor) is no longer prop-drilled — the
 * canvas reads it straight off the zustand store + fish bus (see
 * fish/fishBus.ts, blocks/FishTankCanvas.tsx). This shell only forwards
 * identity props: which fish, which layout-derived highlights, which theme.
 */
export function FishTankView({
  fish,
  title,
  caption,
  immersive = false,
  highlightSlugs = NO_HIGHLIGHTS,
  className,
}: FishTankViewProps) {
  const reduced = useReducedMotion()
  const webgl2 = useMemo(() => probeWebGL2(), [])
  const prefTheme = usePreferencesStore((s) => s.theme)
  const accent = usePreferencesStore((s) => s.accent)
  const circadian = usePreferencesStore((s) => s.circadian)
  const themeOverride = useLayoutStore((s) => s.themeOverride)
  const bakeTheme = useLayoutStore((s) => s.bakeTheme)
  const isDemoSession = useLayoutStore((s) => s.isDemoSession)
  // Remount on theme/accent only. Circadian is applied in-place on the live scene.
  const themeKey = useMemo(() => {
    const t =
      isDemoSession && themeOverride
        ? themeOverride
        : isDemoSession && bakeTheme
          ? bakeTheme
          : prefTheme
    return `${t}:${accent}`
  }, [prefTheme, accent, themeOverride, bakeTheme, isDemoSession])

  if (reduced || !webgl2) {
    return null
  }
  // Inline registry block with no specimens stays out of the text matrix.
  // Immersive stage still mounts so an authored empty tank can render water.
  if (!fish.length && !immersive) {
    return null
  }

  const canvas = (
    <Suspense
      fallback={
        <div
          className={
            immersive
              ? "h-full w-full bg-(--bg-sunken)"
              : "h-[320px] w-full rounded-[var(--radius)] bg-(--bg-sunken)"
          }
          aria-hidden="true"
        />
      }
    >
      <FishTankCanvas
        fish={fish}
        immersive={immersive}
        highlightSlugs={highlightSlugs}
        themeKey={themeKey}
        circadian={circadian}
      />
    </Suspense>
  )

  // Inline (registry) renders sit inside LayoutRenderer with no boundary of
  // their own — a chunk-load/WebGL failure would take the page down. The
  // immersive stage stays unwrapped so HomePage's boundary can swap the whole
  // tank for the text layout instead of leaving an empty stage.
  const guarded = immersive ? (
    canvas
  ) : (
    <FishTankErrorBoundary
      fallback={
        <p className="text-xs text-(--fg-muted)">
          Aquarium view unavailable — see the project list below.
        </p>
      }
    >
      {canvas}
    </FishTankErrorBoundary>
  )

  return (
    <section
      className={
        className ??
        (immersive
          ? "relative h-full w-full"
          : "rounded-[var(--radius-lg)] border border-(--hairline) bg-(--card) p-[var(--pad-card)]")
      }
      data-fishtank={immersive ? "immersive" : "inline"}
    >
      {!immersive && title ? (
        <h3 className="mb-2 text-sm font-medium text-(--fg)">{title}</h3>
      ) : null}
      {guarded}
      {!immersive && caption ? (
        <p className="mt-2 text-xs text-(--fg-muted)">{caption}</p>
      ) : null}
    </section>
  )
}

/** Schema block entry — inline in-flow aquarium from props.fish (registry). */
export function FishTank(props: PropsOf<"fishTank">) {
  const fish = (props.fish ?? []) as FishSpecimenInput[]
  return (
    <FishTankView
      fish={fish}
      title={props.title}
      caption={props.caption}
      highlightSlugs={props.highlightSlugs ?? NO_HIGHLIGHTS}
      immersive={false}
    />
  )
}
