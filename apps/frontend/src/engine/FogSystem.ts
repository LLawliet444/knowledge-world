import { px } from "../utils/pixel";

interface Particle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  life: number; // 0..1, 1 = fresh
  size: number;
  alpha: number;
}

export interface FogSystemOptions {
  /** Number of particles total across the canvas. */
  count?: number;
  /** Base color tint (purplish-blue). */
  color?: string;
  /** Opacity of the fog layer. */
  baseAlpha?: number;
}

/**
 * A lightweight Canvas particle system for the "knowledge fog" effect.
 *
 * - Draws a subtle tiled haze over the whole canvas
 * - Adds drifting particles that subtly shift to give the fog a living feel
 * - Supports triggerClear(x, y) for a local "fog dissipating" burst (used on
 *   node unlock / mastery)
 */
export class FogSystem {
  private particles: Particle[] = [];
  private clearBursts: { x: number; y: number; radius: number; life: number }[] = [];
  private color: string;
  private baseAlpha: number;
  private targetCount: number;

  constructor(
    private width: number,
    private height: number,
    options: FogSystemOptions = {},
  ) {
    this.color = options.color ?? "#6b5b95";
    this.baseAlpha = options.baseAlpha ?? 0.18;
    this.targetCount = options.count ?? Math.max(60, Math.floor((width * height) / 24000));
    this.seed();
  }

  /** Replace the particle array with a fresh random distribution. */
  private seed(): void {
    this.particles = [];
    for (let i = 0; i < this.targetCount; i++) {
      this.particles.push(this.spawnParticle());
    }
  }

  private spawnParticle(): Particle {
    const x = Math.random() * this.width;
    const y = Math.random() * this.height;
    return {
      x,
      y,
      baseX: x,
      baseY: y,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.15,
      life: 0.6 + Math.random() * 0.4,
      size: 40 + Math.random() * 60,
      alpha: 0.05 + Math.random() * 0.1,
    };
  }

  /**
   * Trigger a fog-clearing burst at (x,y). Radius is in canvas pixels.
   * The burst expands outward and fades over ~1.5 seconds.
   */
  triggerClear(x: number, y: number, radius: number = 180): void {
    this.clearBursts.push({ x, y, radius, life: 1 });
  }

  /** Resize the system; particles are re-positioned proportionally. */
  resize(width: number, height: number): void {
    const sx = width / this.width;
    const sy = height / this.height;
    this.width = width;
    this.height = height;
    this.particles.forEach((p) => {
      p.x = p.baseX = p.baseX * sx;
      p.y = p.baseY = p.baseY * sy;
    });
    if (this.particles.length < this.targetCount * 0.8) this.seed();
  }

  /** Advance animation by dtMs milliseconds. */
  update(dtMs: number): void {
    const dt = dtMs / 1000;
    // Gentle sinusoidal drift.
    const t = performance.now() / 1000;
    for (const p of this.particles) {
      p.x += p.vx + Math.sin(t + p.baseY * 0.01) * 0.15;
      p.y += p.vy + Math.cos(t + p.baseX * 0.01) * 0.1;
      // Wrap to keep coverage.
      if (p.x < -50) p.x = this.width + 50;
      if (p.x > this.width + 50) p.x = -50;
      if (p.y < -50) p.y = this.height + 50;
      if (p.y > this.height + 50) p.y = -50;
      p.life -= dt * 0.05;
      if (p.life <= 0) {
        // Respawn at a new location.
        Object.assign(p, this.spawnParticle());
      }
    }

    for (const b of this.clearBursts) {
      b.radius += dt * 120;
      b.life -= dt * 0.55;
    }
    this.clearBursts = this.clearBursts.filter((b) => b.life > 0);
  }

  /**
   * Draws the fog layer on the provided canvas context.
   *
   * The caller is expected to first draw the scene (biome + nodes), and then
   * call drawFog() so the fog overlays everything except the scholar and the
   * UI elements.
   */
  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    // Base haze fill.
    ctx.fillStyle = this.color;
    ctx.globalAlpha = this.baseAlpha;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.globalAlpha = 1;

    // Drifting particles.
    for (const p of this.particles) {
      const gradient = ctx.createRadialGradient(
        px(p.x),
        px(p.y),
        0,
        px(p.x),
        px(p.y),
        p.size,
      );
      gradient.addColorStop(0, `${this.color}`);
      gradient.addColorStop(0.6, `${this.color}`);
      gradient.addColorStop(1, "rgba(107, 91, 149, 0)");
      ctx.globalAlpha = p.alpha * p.life;
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(px(p.x), px(p.y), p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Clear bursts — punch lighter circles into the fog.
    for (const b of this.clearBursts) {
      ctx.globalCompositeOperation = "destination-out";
      const gradient = ctx.createRadialGradient(
        px(b.x),
        px(b.y),
        0,
        px(b.x),
        px(b.y),
        b.radius,
      );
      gradient.addColorStop(0, `rgba(255, 255, 255, ${0.85 * b.life})`);
      gradient.addColorStop(0.6, `rgba(255, 255, 255, ${0.35 * b.life})`);
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(px(b.x), px(b.y), b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
    }

    ctx.restore();
  }
}
