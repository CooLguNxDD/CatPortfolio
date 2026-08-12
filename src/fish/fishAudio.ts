/**
 * Zero-dependency procedural hydro-acoustic synthesizer (Web Audio API).
 * Safely handles SSR, audio permissions, and mute states.
 *
 * Signal chain:
 *   voice → [PannerNode HRTF] → dry ─┐
 *                             → wet → ConvolverNode ─┤
 *                                                    ├→ lowpass → lowshelf → master → destination
 *
 * The lowpass/lowshelf pair is the waterline: `setImmersion` sweeps it from
 * full bandwidth above the surface down to a 450 Hz muffle when submerged.
 * Positional voices go through an HRTF panner bound to the camera pose
 * (`setListenerPose`), so headphone users hear fish to their left and right.
 * All the tuning math lives in fish/audioMath.ts and is unit-tested there.
 */

import { fishBus } from "./fishBus"
import {
  cutoffForImmersion,
  impulseResponseCurve,
  lowShelfGainForImmersion,
  reverbMixForImmersion,
} from "./audioMath"

export type AudioFxType = "dive" | "surface" | "eat" | "chime" | "bubble"

/** Autoplay / AudioContext rejection is expected; log only in dev. */
function audioWarn(where: string, err: unknown): void {
  if (import.meta.env.DEV) {
    console.debug(`[fishAudio:${where}]`, err)
  }
}

export interface AudioPoint {
  x: number
  y: number
  z: number
}

class FishAudioEngine {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private waterFilter: BiquadFilterNode | null = null
  private lowShelf: BiquadFilterNode | null = null
  private convolver: ConvolverNode | null = null
  private wetGain: GainNode | null = null
  private dryGain: GainNode | null = null
  private ambientOsc: OscillatorNode | null = null
  private ambientGain: GainNode | null = null
  private enabled: boolean = false
  private immersion: number = 0
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
        this.buildGraph(this.ctx)
      } catch (err) {
        audioWarn("createContext", err)
        this.ctx = null
        return null
      }
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch((err) => audioWarn("resume", err))
    }
    return this.ctx
  }

  /** Master bus: wet/dry reverb split → waterline filters → master gain. */
  private buildGraph(ctx: AudioContext): void {
    const now = ctx.currentTime

    this.masterGain = ctx.createGain()
    this.masterGain.gain.setValueAtTime(this.enabled ? 0.35 : 0, now)
    this.masterGain.connect(ctx.destination)

    this.lowShelf = ctx.createBiquadFilter()
    this.lowShelf.type = "lowshelf"
    this.lowShelf.frequency.setValueAtTime(80, now)
    this.lowShelf.gain.setValueAtTime(lowShelfGainForImmersion(this.immersion), now)
    this.lowShelf.connect(this.masterGain)

    this.waterFilter = ctx.createBiquadFilter()
    this.waterFilter.type = "lowpass"
    this.waterFilter.frequency.setValueAtTime(cutoffForImmersion(this.immersion), now)
    this.waterFilter.Q.setValueAtTime(0.7, now)
    this.waterFilter.connect(this.lowShelf)

    this.dryGain = ctx.createGain()
    this.dryGain.gain.setValueAtTime(1, now)
    this.dryGain.connect(this.waterFilter)

    this.wetGain = ctx.createGain()
    this.wetGain.gain.setValueAtTime(reverbMixForImmersion(this.immersion), now)
    this.wetGain.connect(this.waterFilter)

    try {
      this.convolver = ctx.createConvolver()
      // Procedural impulse — no asset fetch, keeps the module dependency-free.
      const channels = impulseResponseCurve(ctx.sampleRate, 1.6, 2.4, 2)
      const buffer = ctx.createBuffer(channels.length, channels[0].length, ctx.sampleRate)
      // set() rather than copyToChannel: the generated arrays are plain
      // Float32Array, and copyToChannel is typed against a narrower buffer.
      for (let c = 0; c < channels.length; c++) buffer.getChannelData(c).set(channels[c])
      this.convolver.buffer = buffer
      this.convolver.connect(this.wetGain)
    } catch (err) {
      // No convolver support → dry path only, everything else still works.
      audioWarn("convolver", err)
      this.convolver = null
    }
  }

  /** Voice entry point: sources connect here, not straight to the master. */
  private voiceInput(): AudioNode | null {
    return this.dryGain ?? this.masterGain
  }

  private sendToBus(node: AudioNode): void {
    const dry = this.voiceInput()
    if (dry) node.connect(dry)
    if (this.convolver) node.connect(this.convolver)
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

  /**
   * Waterline sweep, 0 (above surface) → 1 (submerged). Called from the canvas
   * frame loop; cheap enough to spam, but the caller throttles on delta anyway.
   */
  public setImmersion(immersion: number): void {
    const next = Number.isFinite(immersion) ? Math.max(0, Math.min(1, immersion)) : 0
    this.immersion = next
    if (!this.enabled) return
    const ctx = this.ctx
    if (!ctx || !this.waterFilter || !this.lowShelf) return
    const now = ctx.currentTime
    // Short ramps, not steps — instant filter jumps click.
    this.waterFilter.frequency.linearRampToValueAtTime(cutoffForImmersion(next), now + 0.12)
    this.lowShelf.gain.linearRampToValueAtTime(lowShelfGainForImmersion(next), now + 0.12)
    this.wetGain?.gain.linearRampToValueAtTime(reverbMixForImmersion(next), now + 0.12)
  }

  /**
   * Bind the Web Audio listener to the camera. `forward` and `up` must be unit
   * vectors in the same world space as the emitters.
   */
  public setListenerPose(position: AudioPoint, forward: AudioPoint, up: AudioPoint): void {
    if (!this.enabled) return
    const ctx = this.ctx
    if (!ctx) return
    const l = ctx.listener
    try {
      if (l.positionX) {
        const now = ctx.currentTime
        l.positionX.setValueAtTime(position.x, now)
        l.positionY.setValueAtTime(position.y, now)
        l.positionZ.setValueAtTime(position.z, now)
        l.forwardX.setValueAtTime(forward.x, now)
        l.forwardY.setValueAtTime(forward.y, now)
        l.forwardZ.setValueAtTime(forward.z, now)
        l.upX.setValueAtTime(up.x, now)
        l.upY.setValueAtTime(up.y, now)
        l.upZ.setValueAtTime(up.z, now)
      } else {
        // Deprecated API — still the only one Safari implements.
        const legacy = l as unknown as {
          setPosition?: (x: number, y: number, z: number) => void
          setOrientation?: (...args: number[]) => void
        }
        legacy.setPosition?.(position.x, position.y, position.z)
        legacy.setOrientation?.(forward.x, forward.y, forward.z, up.x, up.y, up.z)
      }
    } catch (err) {
      audioWarn("listener", err)
    }
  }

  /** HRTF panner for one positional voice. Null when spatialisation is absent. */
  private createPanner(at: AudioPoint): PannerNode | null {
    const ctx = this.ctx
    if (!ctx || typeof ctx.createPanner !== "function") return null
    try {
      const panner = ctx.createPanner()
      panner.panningModel = "HRTF"
      panner.distanceModel = "inverse"
      panner.refDistance = 8
      panner.maxDistance = 80
      panner.rolloffFactor = 1
      if (panner.positionX) {
        const now = ctx.currentTime
        panner.positionX.setValueAtTime(at.x, now)
        panner.positionY.setValueAtTime(at.y, now)
        panner.positionZ.setValueAtTime(at.z, now)
      } else {
        ;(panner as unknown as { setPosition?: (x: number, y: number, z: number) => void })
          .setPosition?.(at.x, at.y, at.z)
      }
      return panner
    } catch (err) {
      audioWarn("panner", err)
      return null
    }
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
      // The bed sits behind the waterline filter too, so surfacing opens it up.
      this.ambientGain.connect(this.waterFilter ?? this.masterGain)

      this.ambientOsc.start()
    } catch (err) {
      audioWarn("ambient", err)
    }
  }

  /**
   * Fire a one-shot. `at` routes the voice through an HRTF panner; omit it for
   * non-diegetic cues (dive/surface) that should stay centred.
   */
  public playFx(type: AudioFxType, at?: AudioPoint | null): void {
    if (!this.enabled) return
    const ctx = this.getAudioContext()
    if (!ctx || !this.masterGain) return

    const now = ctx.currentTime
    const panner = at ? this.createPanner(at) : null

    /** Route a voice tail through the panner (when spatial) into the master bus. */
    const attach = (node: AudioNode) => {
      if (panner) {
        node.connect(panner)
        this.sendToBus(panner)
      } else {
        this.sendToBus(node)
      }
    }

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
        attach(gain)
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
        attach(gain)

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
        attach(gain)

        osc.start(now)
        osc.stop(now + 0.8)
      }
    } catch (err) {
      audioWarn("playFx", err)
    }
  }

  public bindToBus(): void {
    if (this.unsubscribers.length > 0) return

    const onToggle = ({ enabled }: { enabled: boolean }) => {
      this.setEnabled(enabled)
    }
    const onFx = ({ type, at }: { type: AudioFxType; at?: AudioPoint }) => {
      this.playFx(type, at)
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
      this.convolver?.disconnect()
      this.wetGain?.disconnect()
      this.dryGain?.disconnect()
      this.waterFilter?.disconnect()
      this.lowShelf?.disconnect()
      this.masterGain?.disconnect()
      this.ctx?.close()
    } catch (err) {
      audioWarn("dispose", err)
    }
    this.ambientOsc = null
    this.ambientGain = null
    this.convolver = null
    this.wetGain = null
    this.dryGain = null
    this.waterFilter = null
    this.lowShelf = null
    this.masterGain = null
    this.ctx = null
    this.immersion = 0
  }
}

export const fishAudio = new FishAudioEngine()
