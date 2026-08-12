/**
 * Pure hydro-acoustic math for the tank synthesizer (fish/fishAudio.ts).
 * No Web Audio types here — everything is plain numbers so it runs in Vitest
 * without an AudioContext.
 */

/** Full-bandwidth cutoff above the waterline. */
export const AIR_CUTOFF_HZ = 20000
/** Muffled cutoff at full immersion — the report's 450 Hz figure. */
export const WATER_CUTOFF_HZ = 450
/** Bass lift at full immersion, dB. */
export const WATER_LOW_SHELF_DB = 6

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(1, v))
}

/**
 * xorshift32 PRNG factory — deterministic across runs and platforms, unlike
 * `Math.random()`. Shared by any per-frame visual/audio effect that wants
 * reproducible jitter (tests, screenshots) instead of true randomness.
 * Returns a `() => number` generator yielding values in [-1, 1).
 */
export function makeXorshift32(seed: number): () => number {
  let state = seed | 0 || 1
  return () => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    state >>>= 0
    return (state / 0xffffffff) * 2 - 1
  }
}

/**
 * Lowpass cutoff for an immersion factor (0 = above water, 1 = submerged).
 * Interpolated geometrically: pitch is logarithmic, so a linear sweep spends
 * almost all of its travel in the inaudible top octaves.
 */
export function cutoffForImmersion(immersion: number): number {
  const t = clamp01(immersion)
  return AIR_CUTOFF_HZ * Math.pow(WATER_CUTOFF_HZ / AIR_CUTOFF_HZ, t)
}

/** Low-shelf gain (dB) for an immersion factor — 0 dB dry, +6 dB submerged. */
export function lowShelfGainForImmersion(immersion: number): number {
  return clamp01(immersion) * WATER_LOW_SHELF_DB
}

/** Wet/dry mix for the bubbly convolution reverb. */
export function reverbMixForImmersion(immersion: number): number {
  return clamp01(immersion) * 0.55
}

/**
 * Inverse distance rolloff, matching PannerNode's `inverse` model. Used for
 * the pre-panner gain so a distant fish does not spend a voice at full level.
 */
export function gainForDistance(distance: number, refDistance = 8, rolloff = 1): number {
  const d = Math.max(0, Number.isFinite(distance) ? distance : 0)
  if (d <= refDistance) return 1
  return refDistance / (refDistance + rolloff * (d - refDistance))
}

/**
 * Procedural impulse response — exponentially decaying noise with a slight
 * high-frequency tilt, which reads as a small reverberant water volume.
 * Returns interleaved-free per-channel arrays so the caller just copies them
 * into an AudioBuffer. Deterministic: seeded, never Math.random.
 */
export function impulseResponseCurve(
  sampleRate: number,
  seconds: number,
  decay = 2.4,
  channels = 2,
): Float32Array[] {
  const rate = Math.max(1, Math.floor(sampleRate) || 44100)
  const length = Math.max(1, Math.floor(rate * Math.max(0.01, seconds)))
  const chans = Math.max(1, Math.floor(channels) || 1)
  const out: Float32Array[] = []
  const rand = makeXorshift32(0x2f6e2b1)
  for (let c = 0; c < chans; c++) {
    const data = new Float32Array(length)
    for (let i = 0; i < length; i++) {
      const t = i / length
      data[i] = rand() * Math.pow(1 - t, decay)
    }
    out.push(data)
  }
  return out
}
