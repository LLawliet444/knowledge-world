import type { World, WorldNode } from "../types/world";
import { LAYER_ORDER } from "../constants/biome";

/**
 * Computes a grid layout for the world's nodes.
 *
 * Layout rules:
 * - Each layer occupies one horizontal band of the canvas.
 * - Nodes inside a layer are evenly spread horizontally.
 * - Coordinates are normalized to [0, 1]; the caller scales by canvas size.
 */
export interface LayoutResult {
  /** Mapping from node id to absolute x in canvas px. */
  positions: Record<string, { x: number; y: number }>;
  /** Layer bands: y-range for each layer (in px). */
  bands: Record<string, { yTop: number; yCenter: number; yBottom: number }>;
}

export function computeGridLayout(
  world: World,
  width: number,
  height: number,
): LayoutResult {
  const paddingX = Math.max(80, width * 0.08);
  const paddingTop = Math.max(70, height * 0.12);
  const paddingBottom = Math.max(70, height * 0.12);

  const usableWidth = width - paddingX * 2;
  const usableHeight = height - paddingTop - paddingBottom;

  const layerCount = LAYER_ORDER.length;
  const bandHeight = usableHeight / layerCount;

  const positions: Record<string, { x: number; y: number }> = {};
  const bands: LayoutResult["bands"] = {};

  LAYER_ORDER.forEach((layer, bandIndex) => {
    const layerData = world.layers.find((l) => l.layer === layer);
    const nodes: WorldNode[] = layerData?.nodes ?? [];
    const yTop = paddingTop + bandIndex * bandHeight;
    const yBottom = yTop + bandHeight;
    const yCenter = (yTop + yBottom) / 2;

    bands[layer] = { yTop, yCenter, yBottom };

    if (nodes.length === 0) return;
    const stepX = nodes.length === 1 ? 0 : usableWidth / (nodes.length - 1);

    nodes.forEach((node, index) => {
      const x = paddingX + stepX * index;
      const jitter = (index % 2 === 0 ? -1 : 1) * bandHeight * 0.05;
      positions[node.id] = { x, y: yCenter + jitter };
    });
  });

  return { positions, bands };
}
