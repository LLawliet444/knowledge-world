import type { NodeState } from "../types/world";

export interface NodeStyle {
  haloColor: string;
  coreColor: string;
  ringColor: string;
  label: string;
  showsFog: boolean;
  showsHalo: boolean;
  haloIntensity: number;
}

export const NODE_STYLES: Record<NodeState, NodeStyle> = {
  unexplored: {
    haloColor: "#6b5b95",
    coreColor: "#3d2f5c",
    ringColor: "#8e6cff",
    label: "未探索",
    showsFog: true,
    showsHalo: false,
    haloIntensity: 0,
  },
  visited: {
    haloColor: "#c8bca8",
    coreColor: "#5c4f3d",
    ringColor: "#f5d890",
    label: "已访问",
    showsFog: false,
    showsHalo: false,
    haloIntensity: 0.2,
  },
  learning: {
    haloColor: "#f5b642",
    coreColor: "#d49a20",
    ringColor: "#ffe39a",
    label: "理解中",
    showsFog: false,
    showsHalo: true,
    haloIntensity: 0.55,
  },
  mastered: {
    haloColor: "#78d98b",
    coreColor: "#3f9a4f",
    ringColor: "#c7f3d0",
    label: "已掌握",
    showsFog: false,
    showsHalo: true,
    haloIntensity: 0.9,
  },
  transfer: {
    haloColor: "#8e6cff",
    coreColor: "#6b4fbf",
    ringColor: "#d4c3ff",
    label: "迁移应用",
    showsFog: false,
    showsHalo: true,
    haloIntensity: 1.1,
  },
};

/**
 * Maps icon type strings (as used in World data) to their image paths.
 * Falls back to node_unknown if the icon is not listed.
 */
export const NODE_ICONS: Record<string, string> = {
  cave_painting: "/nodes/node_cave_painting.png",
  fire: "/nodes/node_fire.png",
  wheat: "/nodes/node_wheat.png",
  village: "/nodes/node_village.png",
  tribe: "/nodes/node_tribe.png",
  ship: "/nodes/node_ship.png",
  scale: "/nodes/node_scale.png",
  coin: "/nodes/node_coin.png",
  gear: "/nodes/node_gear.png",
  tool: "/nodes/node_tool.png",
  scroll: "/nodes/node_scroll.png",
  brain: "/nodes/node_brain.png",
  unknown: "/nodes/node_unknown.png",
};

export function getNodeIcon(iconType: string): string {
  return NODE_ICONS[iconType] ?? NODE_ICONS.unknown;
}
