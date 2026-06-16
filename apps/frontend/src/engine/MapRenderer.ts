import type { World, WorldNode, NodeState, LayerType } from "../types/world";
import { BIOME_COLORS, BIOME_IMAGES, LAYER_ORDER, BIOME_LABELS } from "../constants/biome";
import { NODE_ICONS, NODE_STYLES, getNodeIcon } from "../constants/node";
import {
  clamp,
  distance,
  drawPixelImage,
  loadImage,
  px,
} from "../utils/pixel";
import { computeGridLayout, LayoutResult } from "./GridLayout";
import { FogSystem } from "./FogSystem";
import { AnimationManager } from "./AnimationManager";

export interface MapRendererCallbacks {
  onNodeClick: (node: WorldNode) => void;
}

/**
 * Renders the entire Knowledge World map on a 2D canvas.
 *
 * Responsibilities:
 *  - Layout (delegated to GridLayout)
 *  - Layer bands with biome backgrounds (fallback to color gradients if images unavailable)
 *  - Node icons, state halos, labels, and path lines
 *  - Scholar character (a circular avatar with a label; uses a spritesheet when provided)
 *  - Fog overlay (FogSystem)
 *  - Hit testing for clicks
 *
 * React integration:
 *  - The React component owns the <canvas> element and passes a ref to setCanvas()
 *  - The component calls start() to kick off the RAF loop and stop() when unmounting
 *  - updateWorld() / updateNodeStates() feed fresh data from the React state into the renderer
 */
export class MapRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private width = 1280;
  private height = 720;
  private world: World | null = null;
  private layout: LayoutResult = { positions: {}, bands: {} };
  private nodeStates: Record<string, NodeState> = {};
  private hoverNodeId: string | null = null;
  private imageCache: Record<string, HTMLImageElement> = {};
  private fog!: FogSystem;
  private animation!: AnimationManager;
  private rafId: number | null = null;
  private lastTimestamp = 0;
  private callbacks: MapRendererCallbacks;
  private boundOnClick: ((e: MouseEvent) => void) | null = null;
  private boundOnMove: ((e: MouseEvent) => void) | null = null;
  private ready = false;

  constructor(callbacks: MapRendererCallbacks) {
    this.callbacks = callbacks;
  }

  /** Attach the renderer to a canvas element. */
  async setCanvas(canvas: HTMLCanvasElement): Promise<void> {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    if (!this.ctx) return;

    this.fog = new FogSystem(this.width, this.height, {
      color: "#3d2f5c",
      baseAlpha: 0.22,
    });
    this.animation = new AnimationManager();

    // Preload assets.
    const sources = [
      BIOME_IMAGES.what,
      BIOME_IMAGES.how,
      BIOME_IMAGES.why,
      BIOME_IMAGES.system,
      "/characters/scholar_apprentice_17_frame_walk_spritesheet_clean.png",
      ...Object.values(NODE_ICONS),
    ];

    const unique = Array.from(new Set(sources));
    const tasks = unique.map(async (src) => {
      try {
        this.imageCache[src] = await loadImage(src);
      } catch {
        // Ignore missing images — drawPixelImage already handles missing cache entries gracefully.
      }
    });
    await Promise.all(tasks);
    this.ready = true;

    if (this.world) this.layout = computeGridLayout(this.world, this.width, this.height);
  }

  /** Set or replace the world data. Triggers a fresh layout pass. */
  updateWorld(world: World): void {
    this.world = world;
    // Default every node to unexplored on first load.
    for (const layer of world.layers) {
      for (const node of layer.nodes) {
        if (!this.nodeStates[node.id]) {
          this.nodeStates[node.id] = "unexplored";
        }
      }
    }
    this.applyLayout();
  }

  /**
   * Update the recorded state of one or more nodes.
   * If the new state is mastered/transfer, also triggers a fog-clear burst.
   */
  updateNodeStates(updates: Record<string, NodeState>): void {
    for (const [id, state] of Object.entries(updates)) {
      const prev = this.nodeStates[id];
      this.nodeStates[id] = state;
      if (
        (state === "mastered" || state === "transfer") &&
        prev !== state &&
        this.layout.positions[id]
      ) {
        const pos = this.layout.positions[id];
        this.fog.triggerClear(pos.x, pos.y, 200);
        this.animation.spawnUnlockFlash(
          pos.x,
          pos.y,
          state === "transfer" ? "#8e6cff" : "#78d98b",
        );
      }
    }
  }

  /** Programmatic access to the current node state map. */
  getNodeStates(): Record<string, NodeState> {
    return this.nodeStates;
  }

  /** Returns a node at the given client coordinates, or null if none. */
  hitTest(clientX: number, clientY: number): WorldNode | null {
    if (!this.canvas || !this.world) return null;
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    for (const layer of this.world.layers) {
      for (const node of layer.nodes) {
        const pos = this.layout.positions[node.id];
        if (!pos) continue;
        if (distance(x, y, pos.x, pos.y) <= 28) return node;
      }
    }
    return null;
  }

  /** Move the scholar (animated) to the given node's position. */
  moveScholarToNode(nodeId: string): Promise<void> {
    const pos = this.layout.positions[nodeId];
    if (!pos) return Promise.resolve();
    return this.animation.moveScholarTo(pos.x, pos.y, 1500);
  }

  resize(width: number, height: number): void {
    if (!this.canvas) return;
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.fog?.resize(width, height);
    this.applyLayout();
  }

  start(): void {
    if (this.rafId !== null) return;
    this.lastTimestamp = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(60, now - this.lastTimestamp);
      this.lastTimestamp = now;
      this.update(dt);
      this.draw();
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);

    // Attach click + hover handlers while the loop is running.
    if (this.canvas) {
      this.boundOnClick = (e: MouseEvent) => {
        const node = this.hitTest(e.clientX, e.clientY);
        if (node) this.callbacks.onNodeClick(node);
      };
      this.boundOnMove = (e: MouseEvent) => {
        const node = this.hitTest(e.clientX, e.clientY);
        this.hoverNodeId = node ? node.id : null;
        if (this.canvas) {
          this.canvas.style.cursor = node ? "pointer" : "default";
        }
      };
      this.canvas.addEventListener("click", this.boundOnClick);
      this.canvas.addEventListener("mousemove", this.boundOnMove);
    }
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.canvas && this.boundOnClick) {
      this.canvas.removeEventListener("click", this.boundOnClick);
    }
    if (this.canvas && this.boundOnMove) {
      this.canvas.removeEventListener("mousemove", this.boundOnMove);
    }
    this.animation?.killAll();
  }

  private applyLayout(): void {
    if (!this.world) return;
    this.layout = computeGridLayout(this.world, this.width, this.height);
    // Position scholar at start node.
    const startId = this.world.startNodeId;
    const startPos = this.layout.positions[startId];
    if (startPos) {
      // Reset the underlying tween target directly.
      (this.animation as unknown as {
        scholarTarget: { x: number; y: number };
      }).scholarTarget = { x: startPos.x, y: startPos.y };
    }
  }

  private update(dtMs: number): void {
    this.fog?.update(dtMs);
    this.animation?.update(dtMs);
  }

  private draw(): void {
    if (!this.ctx || !this.world || !this.canvas) return;
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, this.width, this.height);

    this.drawLayerBands(ctx);
    this.drawPaths(ctx);
    this.drawNodes(ctx);
    this.fog?.draw(ctx);
    this.drawUnlockFlashes(ctx);
    this.drawScholar(ctx);
    this.drawLegend(ctx);
  }

  private drawLayerBands(ctx: CanvasRenderingContext2D): void {
    if (!this.world) return;
    for (const layer of LAYER_ORDER) {
      const band = this.layout.bands[layer];
      if (!band) continue;
      const color = BIOME_COLORS[layer];

      // If we have a biome image, tile it; otherwise fall back to a soft gradient.
      const imgSrc = BIOME_IMAGES[layer];
      const img = this.imageCache[imgSrc];
      if (img) {
        const pattern = ctx.createPattern(img, "repeat");
        if (pattern) {
          ctx.save();
          ctx.globalAlpha = 0.55;
          ctx.fillStyle = pattern;
          ctx.fillRect(0, band.yTop, this.width, band.yBottom - band.yTop);
          ctx.restore();
        }
      }

      // Soft color tint on top so the layers are distinguishable.
      const gradient = ctx.createLinearGradient(0, band.yTop, 0, band.yBottom);
      gradient.addColorStop(0, hexToRgba(color.light, 0.35));
      gradient.addColorStop(0.5, hexToRgba(color.base, 0.28));
      gradient.addColorStop(1, hexToRgba(color.dark, 0.35));
      ctx.fillStyle = gradient;
      ctx.fillRect(0, band.yTop, this.width, band.yBottom - band.yTop);

      // Separator lines between layers.
      ctx.strokeStyle = hexToRgba(color.dark, 0.4);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, band.yTop);
      ctx.lineTo(this.width, band.yTop);
      ctx.stroke();

      // Layer label (top-left).
      ctx.font = '14px "Press Start 2P", monospace';
      ctx.fillStyle = color.dark;
      ctx.fillText(BIOME_LABELS[layer], px(20), px(band.yTop + 22));
    }
  }

  private drawPaths(ctx: CanvasRenderingContext2D): void {
    if (!this.world) return;
    const drawn = new Set<string>();
    for (const layer of this.world.layers) {
      for (const node of layer.nodes) {
        const from = this.layout.positions[node.id];
        if (!from) continue;
        for (const neighborId of node.neighbors) {
          const key = [node.id, neighborId].sort().join("|");
          if (drawn.has(key)) continue;
          drawn.add(key);
          const to = this.layout.positions[neighborId];
          if (!to) continue;
          const fromState = this.nodeStates[node.id] ?? "unexplored";
          const toState = this.nodeStates[neighborId] ?? "unexplored";
          const active =
            fromState !== "unexplored" || toState !== "unexplored";
          ctx.strokeStyle = active
            ? "rgba(245, 212, 128, 0.85)"
            : "rgba(139, 115, 85, 0.45)";
          ctx.lineWidth = active ? 3 : 2;
          ctx.setLineDash(active ? [] : [6, 6]);
          ctx.beginPath();
          ctx.moveTo(px(from.x), px(from.y));
          ctx.lineTo(px(to.x), px(to.y));
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }
  }

  private drawNodes(ctx: CanvasRenderingContext2D): void {
    if (!this.world) return;
    for (const layer of this.world.layers) {
      for (const node of layer.nodes) {
        const pos = this.layout.positions[node.id];
        if (!pos) continue;
        const state = this.nodeStates[node.id] ?? "unexplored";
        const style = NODE_STYLES[state];

        // Halo (behind the core icon).
        if (style.showsHalo) {
          const radius = 28 + 18 * style.haloIntensity;
          const gradient = ctx.createRadialGradient(
            pos.x,
            pos.y,
            2,
            pos.x,
            pos.y,
            radius,
          );
          gradient.addColorStop(0, hexToRgba(style.haloColor, 0.85));
          gradient.addColorStop(1, hexToRgba(style.haloColor, 0));
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
          ctx.fill();
        }

        // Core node icon.
        if (state === "unexplored") {
          const unknown = this.imageCache["/nodes/node_unknown.png"];
          if (unknown) {
            drawPixelImage(ctx, unknown, pos.x - 18, pos.y - 18, 36, 36);
          } else {
            ctx.fillStyle = style.coreColor;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 16, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#fff";
            ctx.font = 'bold 18px "Press Start 2P", monospace';
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("?", pos.x, pos.y);
          }
        } else {
          const iconSrc = getNodeIcon(node.iconType);
          const icon = this.imageCache[iconSrc];
          if (icon) {
            drawPixelImage(ctx, icon, pos.x - 20, pos.y - 20, 40, 40);
          } else {
            ctx.fillStyle = style.coreColor;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 18, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Outer ring.
        ctx.strokeStyle = style.ringColor;
        ctx.lineWidth = this.hoverNodeId === node.id ? 4 : 2;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 22, 0, Math.PI * 2);
        ctx.stroke();

        // Name label below.
        ctx.font = '12px "Press Start 2P", monospace';
        ctx.fillStyle = "#1a1226";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(node.name, pos.x, pos.y + 28);

        // State badge (small).
        ctx.font = '10px "VT323", monospace';
        ctx.fillStyle = hexToRgba(style.haloColor, 0.95);
        ctx.fillText(style.label, pos.x, pos.y + 46);
      }
    }
  }

  private drawUnlockFlashes(ctx: CanvasRenderingContext2D): void {
    for (const flash of this.animation.getUnlockFlashes()) {
      const maxRadius = 120;
      const radius = maxRadius * (1 - flash.life);
      const gradient = ctx.createRadialGradient(
        flash.x,
        flash.y,
        0,
        flash.x,
        flash.y,
        Math.max(20, radius),
      );
      gradient.addColorStop(0, hexToRgba(flash.color, 0.9 * flash.life));
      gradient.addColorStop(0.5, hexToRgba(flash.color, 0.35 * flash.life));
      gradient.addColorStop(1, hexToRgba(flash.color, 0));
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(flash.x, flash.y, Math.max(20, radius), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawScholar(ctx: CanvasRenderingContext2D): void {
    if (!this.world) return;
    const pos = this.animation.getScholarPosition();
    // Fall back to start node if animation target is still at origin.
    let x = pos.x;
    let y = pos.y;
    if (x === 0 && y === 0) {
      const startPos = this.layout.positions[this.world.startNodeId];
      if (startPos) {
        x = startPos.x;
        y = startPos.y;
      }
    }

    const scholar = this.imageCache[
      "/characters/scholar_apprentice_17_frame_walk_spritesheet_clean.png"
    ];
    // Pedestal shadow.
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(x, y + 36, 22, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    if (scholar) {
      // Use the first frame of the spritesheet.
      const frameWidth = scholar.naturalWidth / 17;
      const frameHeight = scholar.naturalHeight;
      drawPixelImage(
        ctx,
        scholar,
        0,
        0,
        frameWidth,
        frameHeight,
      );
      // Clean re-draw at the right position.
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        scholar,
        0,
        0,
        frameWidth,
        frameHeight,
        x - frameWidth * 0.8,
        y - frameHeight * 1.5,
        frameWidth * 1.6,
        frameHeight * 1.6,
      );
      ctx.imageSmoothingEnabled = true;
    } else {
      // Fallback: draw a friendly circle.
      ctx.fillStyle = "#f5b642";
      ctx.beginPath();
      ctx.arc(x, y - 12, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#3d2f5c";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.font = '12px "Press Start 2P", monospace';
      ctx.fillStyle = "#1a1226";
      ctx.textAlign = "center";
      ctx.fillText("Scholar", x, y + 36);
    }

    // Soft aura below the scholar to highlight the current position.
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 36);
    gradient.addColorStop(0, "rgba(255, 221, 128, 0.35)");
    gradient.addColorStop(1, "rgba(255, 221, 128, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, 36, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawLegend(ctx: CanvasRenderingContext2D): void {
    // Progress indicator (top-right).
    const total = Object.keys(this.nodeStates).length;
    const mastered = Object.values(this.nodeStates).filter(
      (s) => s === "mastered" || s === "transfer",
    ).length;
    ctx.font = '14px "Press Start 2P", monospace';
    ctx.fillStyle = "#1a1226";
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillText(
      `已掌握 ${mastered} / ${total} 节点`,
      this.width - 20,
      20,
    );
  }

  isReady(): boolean {
    return this.ready;
  }
}

/** Utility: convert a hex "#aabbcc" + alpha to rgba(). */
function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const a = clamp(alpha, 0, 1);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return `rgba(107, 91, 149, ${a})`;
  }
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export type { LayerType };
