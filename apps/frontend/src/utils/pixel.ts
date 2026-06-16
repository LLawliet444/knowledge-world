/**
 * Pixel-art helper utilities for the Canvas renderer.
 * Keeps the rendering crisp at any scale.
 */

/**
 * Draws an image with pixelated (nearest-neighbor) scaling disabled,
 * so that pixel-art images stay crisp rather than blurred.
 */
export function drawPixelImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
): void {
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, dx, dy, dw, dh);
  ctx.imageSmoothingEnabled = true;
}

/**
 * Loads an image and returns a Promise that resolves when it is ready.
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

/**
 * Preloads a batch of images; resolves once all are ready.
 * Images that fail are silently dropped so the UI can still render.
 */
export async function preloadImages(
  sources: string[],
): Promise<Record<string, HTMLImageElement>> {
  const results: Record<string, HTMLImageElement> = {};
  const tasks = sources.map(async (src) => {
    try {
      results[src] = await loadImage(src);
    } catch {
      // leave missing for the caller to handle with a fallback
    }
  });
  await Promise.all(tasks);
  return results;
}

/**
 * Formats a pixel coordinate to the nearest integer so strokes remain sharp.
 */
export function px(value: number): number {
  return Math.round(value);
}

/** Distance between two points. */
export function distance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Linear interpolation. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Clamps a number to the inclusive range [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
