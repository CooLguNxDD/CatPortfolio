/**
 * Zero-dependency procedural hydro-acoustic synthesizer using Web Audio API.
 * Safely handles SSR, audio permissions, and mute states.
 */

import { fishBus } from "./fishBus"

export type AudioFxType = "dive" | "surface" | "eat" | "chime" | "bubble"

class FishAudioEngine {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private ambientOsc: OscillatorNode | null = null
  private ambientGain: GainNode | null = null
  private enabled: boolean = false
  private unsubscribers: (() => void)[] = []

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return null

    if (!this.ctx) {
      try {
        this.ctx = new AudioCtx()
        this.masterGain = this.ctx.createGain()
        this.masterGain.gain.setValueAtTime(this.enabled ? 0.35 : 0, this.ctx.currentTime)
        this.masterGain.connect(this.ctx.destination)
      } catch {
        return null
      }
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {})
    }
    return this.ctx
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled
    const ctx = this.getAudioContext()
    if (!ctx || !this.masterGain) return

    const now = ctx.currentTime
    this.masterGain.gain.cancelScheduledValues(now)
    this.masterGain.gain.linearRampToValueAtTime(enabled ? 0.35 : 0, now + 0.05)

    if (enabled && !this.ambientOsc) {
      this.startAmbientHum()
    } else if (!enabled && this.ambientGain) {
      this.ambientGain.gain.setValueAtTime(0, now)
    }
  }

  public isEnabled(): boolean {
    return this.enabled
  }

  private startAmbientHum(): void {
    const ctx = this.getAudioContext()
    if (!ctx || !this.masterGain || this.ambientOsc) return

    try {
      this.ambientOsc = ctx.createOscillator()
      this.ambientGain = ctx.createGain()
      const filter = ctx.createBiquadFilter()

      this.ambientOsc.type = "sine"
      this.ambientOsc.frequency.setValueAtTime(55, ctx.currentTime) // Low A1 hum

      filter.type = "lowpass"
      filter.frequency.setValueAtTime(140, ctx.currentTime)

      this.ambientGain.gain.setValueAtTime(0.04, ctx.currentTime)

      this.ambientOsc.connect(filter)
      filter.connect(this.ambientGain)
      this.ambientGain.connect(this.masterGain)

      this.ambientOsc.start()
    } catch {
      /* ignore audio error */
    }
  }

  public playFx(type: AudioFxType): void {
    if (!this.enabled) return
    const ctx = this.getAudioContext()
    if (!ctx || !this.masterGain) return

    const now = ctx.currentTime

    try {
      if (type === "bubble" || type === "eat") {
        // High-pitch pop descending quickly (bubble burst)
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = "sine"
        osc.frequency.setValueAtTime(680, now)
        osc.frequency.exponentialRampToValueAtTime(240, now + 0.12)

        gain.gain.setValueAtTime(0.3, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)

        osc.connect(gain)
        gain.connect(this.masterGain)
        osc.start(now)
        osc.stop(now + 0.14)
      } else if (type === "chime") {
        // Shimmering harmonic pentatonic chime for fish focus
        const osc1 = ctx.createOscillator()
        const osc2 = ctx.createOscillator()
        const gain = ctx.createGain()

        osc1.type = "triangle"
        osc2.type = "sine"
        osc1.frequency.setValueAtTime(523.25, now) // C5
        osc2.frequency.setValueAtTime(783.99, now) // G5

        gain.gain.setValueAtTime(0.25, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6)

        osc1.connect(gain)
        osc2.connect(gain)
        gain.connect(this.masterGain)

        osc1.start(now)
        osc2.start(now)
        osc1.stop(now + 0.65)
        osc2.stop(now + 0.65)
      } else if (type === "dive" || type === "surface") {
        // Filtered low frequency whoosh
        const osc = ctx.createOscillator()
        const filter = ctx.createBiquadFilter()
        const gain = ctx.createGain()

        osc.type = "triangle"
        osc.frequency.setValueAtTime(type === "dive" ? 180 : 90, now)
        osc.frequency.exponentialRampToValueAtTime(type === "dive" ? 80 : 220, now + 0.7)

        filter.type = "lowpass"
        filter.frequency.setValueAtTime(type === "dive" ? 400 : 150, now)
        filter.frequency.exponentialRampToValueAtTime(type === "dive" ? 120 : 500, now + 0.7)

        gain.gain.setValueAtTime(0.22, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75)

        osc.connect(filter)
        filter.connect(gain)
        gain.connect(this.masterGain)

        osc.start(now)
        osc.stop(now + 0.8)
      }
    } catch {
      /* ignore audio error */
    }
  }

  public bindToBus(): void {
    if (this.unsubscribers.length > 0) return

    const onToggle = ({ enabled }: { enabled: boolean }) => {
      this.setEnabled(enabled)
    }
    const onFx = ({ type }: { type: AudioFxType }) => {
      this.playFx(type)
    }

    fishBus.on("audio:toggle", onToggle)
    fishBus.on("audio:fx", onFx)

    this.unsubscribers.push(() => {
      fishBus.off("audio:toggle", onToggle)
      fishBus.off("audio:fx", onFx)
    })
  }

  public dispose(): void {
    for (const unsub of this.unsubscribers) unsub()
    this.unsubscribers = []

    try {
      this.ambientOsc?.stop()
      this.ambientOsc?.disconnect()
      this.ambientGain?.disconnect()
      this.masterGain?.disconnect()
      this.ctx?.close()
    } catch {
      /* ignore cleanup error */
    }
    this.ambientOsc = null
    this.ambientGain = null
    this.masterGain = null
    this.ctx = null
  }
}

export const fishAudio = new FishAudioEngine()
