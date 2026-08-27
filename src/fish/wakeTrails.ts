/**
 * High-performance pooled particle ring-buffer for bioluminescent fish wake trails.
 * Pure mathematical buffer management (DOM/Three free).
 */

import { makeXorshift32 } from "./audioMath"

export interface WakeParticle {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  r: number
  g: number
  b: number
  alpha: number
  size: number
  life: number
  maxLife: number
}

/** Fixed-size particle ring buffer for wake trails: pre-allocates `maxParticles`, then reuses slots round-robin on `emit()` instead of growing/GC-ing the array every frame. */
export class WakeTrailPool {
  public particles: WakeParticle[] = []
  private maxParticles: number
  private spawnIndex: number = 0
  // Deterministic per-pool jitter stream — Math.random() in a
  // requestAnimationFrame-driven emit() both costs cycles and makes the
  // trail non-reproducible across runs/tests. Seed varies per pool instance
  // (multiple emitters shouldn't jitter in lockstep) but is otherwise fixed.
  private rand: () => number

  constructor(maxParticles = 300, seed = 0x9e3779b9) {
    this.maxParticles = maxParticles
    this.rand = makeXorshift32(seed)
    this.particles = new Array(maxParticles)
    for (let i = 0; i < maxParticles; i++) {
      this.particles[i] = {
        x: 0,
        y: -9999,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        r: 1,
        g: 1,
        b: 1,
        alpha: 0,
        size: 1,
        life: 0,
        maxLife: 1,
      }
    }
  }

  public emit(
    x: number,
    y: number,
    z: number,
    rgb: { r: number; g: number; b: number },
    options?: { size?: number; maxLife?: number; speed?: number; spread?: number },
  ): void {
    const p = this.particles[this.spawnIndex]
    this.spawnIndex = (this.spawnIndex + 1) % this.maxParticles

    // this.rand() yields [-1, 1); halve it for a symmetric [-0.5, 0.5) jitter,
    // or remap to [0, 1) below where the original spread was one-sided.
    const spread = options?.spread ?? 0.25
    p.x = x + this.rand() * 0.5 * spread
    p.y = y + this.rand() * 0.5 * spread
    p.z = z + this.rand() * 0.5 * spread

    p.vx = this.rand() * 0.2
    p.vy = 0.15 + (this.rand() + 1) * 0.5 * 0.25
    p.vz = this.rand() * 0.2

    p.r = rgb.r
    p.g = rgb.g
    p.b = rgb.b
    p.alpha = 0.95
    p.size = options?.size ?? (1.2 + (this.rand() + 1) * 0.5 * 0.8)
    p.life = 0
    p.maxLife = options?.maxLife ?? (1.2 + (this.rand() + 1) * 0.5 * 0.8)
  }

  public update(dt: number): void {
    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i]
      if (p.alpha <= 0.001) continue

      p.life += dt
      if (p.life >= p.maxLife) {
        p.alpha = 0
        p.y = -9999
        continue
      }

      // Drag & slow buoyant rise
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.z += p.vz * dt
      p.vx *= 0.96
      p.vz *= 0.96

      // Smooth fade out
      const progress = p.life / p.maxLife
      p.alpha = Math.max(0, (1 - progress) * (1 - progress * 0.5))
    }
  }

  public activeCount(): number {
    let count = 0
    for (let i = 0; i < this.maxParticles; i++) {
      if (this.particles[i].alpha > 0.001) count++
    }
    return count
  }
}
