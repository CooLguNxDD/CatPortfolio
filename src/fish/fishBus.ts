/**
 * Typed interaction bus for the fish tank (mitt).
 *
 * Commands (intent, DOM chrome → reducer) go through zustand and re-render
 * React. Observations (60fps camera/dive values) are bus-only — nothing
 * subscribes them into React state, so the canvas and chrome read them
 * imperatively. See design/fish/README.md ownership table.
 */

import mitt, { type Emitter } from "mitt"
import type { FishSpecimenInput } from "@/blocks/fishTankLayout"

export interface FishAnchor {
  /** Canvas-local px position of the locked fish. */
  x: number
  y: number
  /** Projected radius in px — chrome must clear this. */
  r: number
  /** Canvas box (for chrome clamping in the same space). */
  w: number
  h: number
}

export type FishChrome = "3d" | "flat"

/** One radar contact, already projected onto the sonar disc. */
export interface SonarContact {
  slug: string
  species: string
  school: number
  /** Disc coordinates in [-1, 1]. */
  u: number
  v: number
  depth01: number
  lit: number
}

export type FishEvents = {
  // commands — intent, drive zustand + router
  "tank:dive": void
  "tank:surface": void
  "fish:pick": { slug: string }
  "fish:focus": { slug: string }
  "fish:spawn": { fish: FishSpecimenInput | FishSpecimenInput[] }
  "fish:release": void
  "view:chrome": FishChrome
  "filter:query": string
  /** Raw clicked domain — the store's toggleDomain applies the on/off logic. */
  "filter:domain": string
  "bake:apply": void
  "bake:dismiss": void
  "ask:toggle": void
  "ask:open": { prompt?: string } | void
  "ask:close": void
  "feed:drop": { x?: number; y?: number; z?: number }
  /** Bathymetry scrubber — null releases the depth lock. */
  "tank:depth": { depth01: number } | null
  "view:sonar": { open: boolean }
  "feed:eaten": { pelletId: string; slug: string }
  "audio:toggle": { enabled: boolean }
  /**
   * `at` routes the voice through the HRTF panner (fish/fishAudio.ts). Omit it
   * for non-diegetic cues so they stay centred.
   */
  "audio:fx": {
    type: "dive" | "surface" | "eat" | "chime" | "bubble"
    at?: { x: number; y: number; z: number }
  }
  // observations — 60fps, bus-only, never touch React state
  "tank:progress": number
  "fish:anchor": FishAnchor | null
  /** Radar contacts, emitted at ~10Hz (not per frame). */
  "tank:sonar": SonarContact[]
  /** Live camera position and orbit target, emitted on camera changes. */
  "camera:move": {
    position: { x: number; y: number; z: number }
    target: { x: number; y: number; z: number }
  }
}

export type FishBus = Emitter<FishEvents>

/** Fresh bus instance — used by the app singleton and by tests. */
export function createFishBus(): FishBus {
  return mitt<FishEvents>()
}

/** App-wide singleton. Components with no mounted stage never emit into it. */
export const fishBus: FishBus = createFishBus()

/** Dispatches a fish focus command via typed fishBus and DOM CustomEvent bridge. */
export function dispatchFishFocus(slug: string): void {
  if (!slug) return
  fishBus.emit("fish:pick", { slug })
  fishBus.emit("fish:focus", { slug })
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("catportfolio:fish:focus", { detail: { slug } }))
  }
}

/** Dispatches a fish spawn command via typed fishBus and DOM CustomEvent bridge. */
export function dispatchFishSpawn(fish: FishSpecimenInput | FishSpecimenInput[]): void {
  if (!fish) return
  fishBus.emit("fish:spawn", { fish })
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("catportfolio:fish:spawn", { detail: { fish } }))
  }
}
