import type { LayerType } from "../types/world";

export const BIOME_COLORS: Record<LayerType, { base: string; dark: string; light: string }> = {
  what: { base: "#f4d37a", dark: "#b08a3a", light: "#fbe8b2" },
  how: { base: "#8fbf6d", dark: "#4f7a3a", light: "#c7e3a8" },
  why: { base: "#c0a87a", dark: "#7a6240", light: "#e3d4ae" },
  system: { base: "#6b5b95", dark: "#3d2f5c", light: "#a395c9" },
};

export const BIOME_LABELS: Record<LayerType, string> = {
  what: "认知大草原 · What",
  how: "结构金绿林 · How",
  why: "因果石灰原 · Why",
  system: "系统紫蓝海 · System",
};

export const BIOME_IMAGES: Record<LayerType, string> = {
  what: "/biomes/biome_what_grassland.jpg",
  how: "/biomes/biome_how_forest.jpg",
  why: "/biomes/biome_why_stoneland.jpg",
  system: "/biomes/biome_system_void.jpg",
};

export const LAYER_ORDER: LayerType[] = ["what", "how", "why", "system"];
