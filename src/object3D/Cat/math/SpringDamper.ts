/**
 * SpringDamper.ts
 * Second-order spring-damper system for organic, lifelike animation and tactile feedback.
 */

export interface SpringConfig {
  stiffness: number; // Spring stiffness constant (k)
  damping: number;   // Damping coefficient (c)
  mass?: number;     // Mass (m)
}

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
    const clampedDt = Math.min(dt, 0.1); // Prevent explosion on frame drop
    const force = -this.stiffness * (this.value - this.target) - this.damping * this.velocity;
    const acceleration = force / this.mass;

    this.velocity += acceleration * clampedDt;
    this.value += this.velocity * clampedDt;

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

export class SpringDamper3D {
  public x: SpringDamper1D;
  public y: SpringDamper1D;
  public z: SpringDamper1D;

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
    return {
      x: this.x.update(dt),
      y: this.y.update(dt),
      z: this.z.update(dt),
    };
  }

  impulse(force: { x: number; y: number; z: number }): void {
    this.x.impulse(force.x);
    this.y.impulse(force.y);
    this.z.impulse(force.z);
  }
}
