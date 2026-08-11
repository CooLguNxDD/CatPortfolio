/**
 * Typed interaction bus for the fish tank (mitt).
 *
 * Commands (intent, DOM chrome → reducer) go through zustand and re-render
 * React. Observations (60fps camera/dive values) are bus-only — nothing
 * subscribes them into React state, so the canvas and chrome read them
 * imperatively. See design/fish/README.md ownership table.
 */

import mitt, { type Emitter } from "mitt"

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

export type FishEvents = {
  // commands — intent, drive zustand + router
  "tank:dive": void
  "tank:surface": void
  "fish:pick": { slug: string }
  "fish:release": void
  "view:chrome": FishChrome
  "filter:query": string
  /** Raw clicked domain — the store's toggleDomain applies the on/off logic. */
  "filter:domain": string
  "bake:apply": void
  "bake:dismiss": void
  "feed:drop": { x?: number; y?: number; z?: number }
  "feed:eaten": { pelletId: string; slug: string }
  "audio:toggle": { enabled: boolean }
  "audio:fx": { type: "dive" | "surface" | "eat" | "chime" | "bubble" }
  // observations — 60fps, bus-only, never touch React state
  "tank:progress": number
  "fish:anchor": FishAnchor | null
}

export type FishBus = Emitter<FishEvents>

/** Fresh bus instance — used by the app singleton and by tests. */
export function createFishBus(): FishBus {
  return mitt<FishEvents>()
}

/** App-wide singleton. Components with no mounted stage never emit into it. */
export const fishBus: FishBus = createFishBus()
