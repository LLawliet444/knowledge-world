/**
 * 四层生物群系调色板（PRD §4.2.3 像素风基线）
 */

import type { LayerType } from "../types/world";

export interface BiomePalette {
  label: string;
  bgColor: string;
  accentColor: string;
  textColor: string;
  /** PixiJS Container tint 色值 */
  tint: number;
}

export const BIOME_PALETTE: Record<LayerType, BiomePalette> = {
  what: {
    label: "认知大草原",
    bgColor: "#f4d37a",
    accentColor: "#e8b34f",
    textColor: "#5a3a1a",
    tint: 0xf4d37a,
  },
  how: {
    label: "结构丛林",
    bgColor: "#8fbf6d",
    accentColor: "#5d9c3f",
    textColor: "#1a3a1a",
    tint: 0x8fbf6d,
  },
  why: {
    label: "统一山脉",
    bgColor: "#c0a87a",
    accentColor: "#8b7355",
    textColor: "#3a2a1a",
    tint: 0xc0a87a,
  },
  system: {
    label: "科学大陆",
    bgColor: "#4a3a6b",
    accentColor: "#6b5b95",
    textColor: "#e8e0ff",
    tint: 0x4a3a6b,
  },
};

export const LAYER_ORDER: LayerType[] = ["what", "how", "why", "system"];

/** 四张深度地图背景图路径 */
export const DEPTH_BG_IMAGE: Record<LayerType, string> = {
  what: "/biomes/world_what.png",
  how: "/biomes/world_how.png",
  why: "/biomes/world_why.png",
  system: "/biomes/world_system.png",
};
