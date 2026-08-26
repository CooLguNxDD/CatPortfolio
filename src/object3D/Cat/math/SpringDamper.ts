/**
 * SpringDamper.ts
 * Second-order spring-damper system for organic, lifelike animation and tactile feedback.
 */

/** Tuning parameters (stiffness, damping, mass) for a spring-damper system; damping is caller-supplied, not fixed to critical. */
export interface SpringConfig {
  stiffness: number; // Spring stiffness constant (k)
  damping: number;   // Damping coefficient (c)
  mass?: number;     // Mass (m)
}

/** A 1D spring-damper for smooth scalar interpolation, integrated with sub-stepped semi-implicit Euler for frame-rate-independent stability. */
export class SpringDamper1D {
  public value: number;
  public velocity = 0;
  public target: number;
  public stiffness: number;
  public damping: number;
  public mass: number;

  constructor(initialValue: number, config: SpringConfig = { stiffness: 120, damping: 14, mass: 1 }) {
    this.value = initialValue;
    this.target = initialValue;
    this.stiffness = config.stiffness;
    this.damping = config.damping;
    this.mass = config.mass ?? 1;
  }

  update(dt: number): number {
    // Sub-step at a fixed 1/60s cadence so the semi-implicit Euler integration
    // stays stable even when dt spikes after a dropped frame.
    const MAX_STEP = 1 / 60;
    let remaining = Math.min(dt, 0.1); // Prevent explosion on frame drop

    while (remaining > 0) {
      const step = Math.min(remaining, MAX_STEP);
      const force = -this.stiffness * (this.value - this.target) - this.damping * this.velocity;
      const acceleration = force / this.mass;

      this.velocity += acceleration * step;
      this.value += this.velocity * step;
      remaining -= step;
    }

    return this.value;
  }

  impulse(force: number): void {
    this.velocity += force / this.mass;
  }

  reset(val: number): void {
    this.value = val;
    this.target = val;
    this.velocity = 0;
  }
}

/** A 3D spring-damper (three independent 1D springs) for smooth Vector3-shaped interpolation. */
export class SpringDamper3D {
  public x: SpringDamper1D;
  public y: SpringDamper1D;
  public z: SpringDamper1D;

  private result = { x: 0, y: 0, z: 0 };

  constructor(
    initial = { x: 0, y: 0, z: 0 },
    config: SpringConfig = { stiffness: 120, damping: 14, mass: 1 }
  ) {
    this.x = new SpringDamper1D(initial.x, config);
    this.y = new SpringDamper1D(initial.y, config);
    this.z = new SpringDamper1D(initial.z, config);
  }

  setTarget(target: { x: number; y: number; z: number }): void {
    this.x.target = target.x;
    this.y.target = target.y;
    this.z.target = target.z;
  }

  update(dt: number): { x: number; y: number; z: number } {
    this.result.x = this.x.update(dt);
    this.result.y = this.y.update(dt);
    this.result.z = this.z.update(dt);
    return this.result;
  }

  impulse(force: { x: number; y: number; z: number }): void {
    this.x.impulse(force.x);
    this.y.impulse(force.y);
    this.z.impulse(force.z);
  }
}
