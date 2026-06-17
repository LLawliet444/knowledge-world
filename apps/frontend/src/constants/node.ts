/**
 * 节点状态视觉样式（对齐 PRD §2.1.3 状态定义）
 */

import type { DepthState } from "../types/world";

export interface NodeVisualStyle {
  haloColor: string;
  haloAlpha: number;
  cursor: "pointer" | "default" | "not-allowed";
  dimmed: boolean;
}

export const NODE_VISUAL: Record<DepthState, NodeVisualStyle> = {
  locked: {
    haloColor: "#8888aa",
    haloAlpha: 0.3,
    cursor: "not-allowed",
    dimmed: true,
  },
  available: {
    haloColor: "#ffffff",
    haloAlpha: 0.35,
    cursor: "pointer",
    dimmed: false,
  },
  learning: {
    haloColor: "#f5b642",
    haloAlpha: 0.6,
    cursor: "pointer",
    dimmed: false,
  },
  completed: {
    haloColor: "#78d98b",
    haloAlpha: 0.85,
    cursor: "pointer",
    dimmed: false,
  },
};

/** 完整通关（nodeClear=true）时的特殊光晕 */
export const NODE_CLEAR_HALO_COLOR = "#b085f5"; // 紫金色
