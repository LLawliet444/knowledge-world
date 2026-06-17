/**
 * 世界生成引擎 Zustand store
 *
 * 管理：当前加载的世界、节点进度、迷雾百分比、当前深度
 */

import { create } from "zustand";
import type { World, LayerType } from "../types/world";
import {
  buildInitialProgress,
  calcFogPercentage,
  type NodeProgress,
} from "../utils/depthGate";

interface WorldState {
  // 当前世界
  world: World | null;

  // 每个节点的进度（what/how/why/system 状态 + 小场景 + 终问）
  nodeProgress: Record<string, NodeProgress>;

  // 当前所在的深度地图
  currentDepth: LayerType;

  // 迷雾消散百分比
  fogPercentage: number;

  // 学者化身当前像素坐标（初始化为 startNode 位置）
  scholarPos: { x: number; y: number };

  // 是否正在切换深度（用于交叉溶解动画）
  isSwitchingDepth: boolean;
  switchingTargetDepth: LayerType | null;
}

interface WorldActions {
  loadWorld: (world: World) => void;

  /** 更新某个节点在某个深度的状态 */
  updateNodeDepthState: (
    nodeId: string,
    depth: LayerType,
    state: NodeProgress[LayerType],
  ) => void;

  /** 标记小场景已观看 */
  markIntroSceneSeen: (nodeId: string) => void;

  /** What 层轻量确认 */
  setWhatChoice: (
    nodeId: string,
    choice: "definition" | "example" | "bridge",
  ) => void;

  /** 深度切换 */
  switchDepth: (depth: LayerType) => void;

  /** 完成深度切换动画 */
  finishDepthSwitch: () => void;

  /** 学者移动到坐标 */
  moveScholar: (x: number, y: number) => void;
}

const EMPTY_PROGRESS: Record<string, NodeProgress> = {};

export const useWorldStore = create<WorldState & WorldActions>((set, get) => ({
  world: null,
  nodeProgress: EMPTY_PROGRESS,
  currentDepth: "what",
  fogPercentage: 0,
  scholarPos: { x: 0, y: 0 },
  isSwitchingDepth: false,
  switchingTargetDepth: null,

  loadWorld: (world) => {
    const startNode = world.nodes.find((n) => n.id === world.startNodeId);
    const progress = buildInitialProgress(world);
    set({
      world,
      nodeProgress: progress,
      currentDepth: "what",
      fogPercentage: calcFogPercentage(world, progress),
      scholarPos: startNode
        ? { x: startNode.position.x, y: startNode.position.y }
        : { x: 0, y: 0 },
    });
  },

  updateNodeDepthState: (nodeId, depth, state) => {
    const { world, nodeProgress } = get();
    if (!world) return;
    const updated = {
      ...nodeProgress,
      [nodeId]: { ...nodeProgress[nodeId], [depth]: state },
    };
    set({
      nodeProgress: updated,
      fogPercentage: calcFogPercentage(world, updated),
    });
  },

  markIntroSceneSeen: (nodeId) => {
    const { nodeProgress } = get();
    const p = nodeProgress[nodeId];
    if (!p) return;
    set({ nodeProgress: { ...nodeProgress, [nodeId]: { ...p, introScene: "seen" } } });
  },

  setWhatChoice: (nodeId, choice) => {
    const { nodeProgress } = get();
    const p = nodeProgress[nodeId];
    if (!p) return;
    set({
      nodeProgress: {
        ...nodeProgress,
        [nodeId]: { ...p, readyChoice: choice },
      },
    });
  },

  switchDepth: (depth) => {
    const { currentDepth } = get();
    if (depth === currentDepth) return;
    set({ isSwitchingDepth: true, switchingTargetDepth: depth });
  },

  finishDepthSwitch: () => {
    const { switchingTargetDepth } = get();
    if (!switchingTargetDepth) return;
    set({ currentDepth: switchingTargetDepth, isSwitchingDepth: false, switchingTargetDepth: null });
  },

  moveScholar: (x, y) => set({ scholarPos: { x, y } }),
}));
