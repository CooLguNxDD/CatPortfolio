/**
 * fishTank block shell — WebGL probe + reduced-motion gate + lazy Three canvas.
 * Mirrors Scene2d → Scene2dCanvas; three is never imported here.
 * Stage/immersive callers use FishTankView with the same canvas.
 * Controller (focus/filter) is optional — block stays pure props from registry.
 */

import { lazy, Suspense, useMemo } from "react"
import { useReducedMotion } from "motion/react"
import type { PropsOf } from "@/render/registry"
import type { FishSpecimenInput } from "./fishTankLayout"
import { probeWebGL2 } from "@/routes/viewMode"
import { useLayoutStore, usePreferencesStore } from "@/store"

const FishTankCanvas = lazy(() => import("./FishTankCanvas"))

export interface FishTankViewProps {
  fish: FishSpecimenInput[]
  title?: string
  caption?: string
  immersive?: boolean
  focusedSlug?: string | null
  highlightSlugs?: string[]
  onFocusChange?: (slug: string | null) => void
  stageProgress?: number
  /** Optional lit factor from controller (0..1+); canvas dims non-matches. */
  litFactor?: (f: FishSpecimenInput) => number
  /** Canvas-local position + canvas box of the locked fish (for docking chrome). */
  onFocusAnchor?: (
    anchor: { x: number; y: number; r: number; w: number; h: number } | null,
  ) => void
  className?: string
}

/** Shared view shell used by the block and the full-page stage. */
export function FishTankView({
  fish,
  title,
  caption,
  immersive = false,
  focusedSlug = null,
  highlightSlugs = [],
  onFocusChange,
  stageProgress = 1,
  litFactor,
  onFocusAnchor,
  className,
}: FishTankViewProps) {
  const reduced = useReducedMotion()
  const webgl2 = useMemo(() => probeWebGL2(), [])
  const prefTheme = usePreferencesStore((s) => s.theme)
  const accent = usePreferencesStore((s) => s.accent)
  const themeOverride = useLayoutStore((s) => s.themeOverride)
  const bakeTheme = useLayoutStore((s) => s.bakeTheme)
  const isDemoSession = useLayoutStore((s) => s.isDemoSession)
  // Remount WebGL scene when shell theme/accent changes so lights re-sample CSS.
  const themeKey = useMemo(() => {
    const t =
      isDemoSession && themeOverride
        ? themeOverride
        : isDemoSession && bakeTheme
          ? bakeTheme
          : prefTheme
    return `${t}:${accent}`
  }, [prefTheme, accent, themeOverride, bakeTheme, isDemoSession])

  if (!fish.length || reduced || !webgl2) {
    return null
  }

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
          focusedSlug={focusedSlug}
          highlightSlugs={highlightSlugs}
          onFocusChange={onFocusChange}
          stageProgress={stageProgress}
          litFactor={litFactor}
          themeKey={themeKey}
          onFocusAnchor={onFocusAnchor}
        />
      </Suspense>
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
      highlightSlugs={props.highlightSlugs ?? []}
      immersive={false}
      stageProgress={1}
    />
  )
}
