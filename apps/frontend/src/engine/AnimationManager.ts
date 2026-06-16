import { gsap } from "gsap";

/**
 * Wraps GSAP for the two main animation concerns:
 *  - Moving the scholar from point A to point B with a smooth, slightly-bouncy curve
 *  - Emitting short-lived unlock/flash animations that overlay on top of the map
 *
 * All animation state is kept inside this class so React components only need to
 * call high-level methods.
 */
export class AnimationManager {
  private scholarTarget = { x: 0, y: 0 };
  private unlockFlashes: { x: number; y: number; life: number; color: string }[] = [];

  /**
   * Moves the scholar target to (x, y) over `durationMs`.
   * Returns a promise that resolves when the animation completes.
   */
  moveScholarTo(x: number, y: number, durationMs: number = 1500): Promise<void> {
    return new Promise((resolve) => {
      const target = { x, y };
      gsap.to(this.scholarTarget, {
        x: target.x,
        y: target.y,
        duration: durationMs / 1000,
        ease: "power2.inOut",
        onComplete: resolve,
      });
    });
  }

  /** Spawns a short-lived unlock flash at (x, y) with a color tint. */
  spawnUnlockFlash(x: number, y: number, color: string = "#78d98b"): void {
    this.unlockFlashes.push({ x, y, life: 1, color });
  }

  getScholarPosition(): { x: number; y: number } {
    return { x: this.scholarTarget.x, y: this.scholarTarget.y };
  }

  /**
   * Update the internal flash animation state by dtMs. The renderer is expected
   * to draw the flashes itself using getUnlockFlashes().
   */
  update(dtMs: number): void {
    const dt = dtMs / 1000;
    for (const flash of this.unlockFlashes) {
      flash.life -= dt * 1.2;
    }
    this.unlockFlashes = this.unlockFlashes.filter((f) => f.life > 0);
  }

  getUnlockFlashes(): { x: number; y: number; life: number; color: string }[] {
    return this.unlockFlashes;
  }

  /** Immediately stop all animations (useful when unmounting). */
  killAll(): void {
    gsap.killTweensOf(this.scholarTarget);
    this.unlockFlashes = [];
  }
}
