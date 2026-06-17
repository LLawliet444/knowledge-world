/**
 * 门禁与可见性计算（PRD §4.2.3 规则约束）
 *
 * 规则：
 * - What: 永远可用
 * - How: 至少 1 个节点 what.completed
 * - Why: 至少 1 个节点 how.completed
 * - System: 至少 1 个节点 why.completed
 *
 * 同一节点在多张地图中坐标相同，但可见性由该节点在当前深度的状态决定。
 * 每次完成节点时，仅使 1 个下一节点变为 available（nextDiscoveryId 指向；若为空则 neighbors[0]）。
 */

import type { World, WorldNode, LayerType, DepthState } from "../types/world";

export interface NodeProgress {
  what: DepthState;
  how: DepthState;
  why: DepthState;
  system: DepthState;
  introScene: "unseen" | "seen";
  readyChoice?: "definition" | "example" | "bridge";
  finalQuestion: "locked" | "available" | "completed";
  nodeClear: boolean;
}

/** 初始进度：所有节点 What 层为 available（startNode），其余为 locked */
export function buildInitialProgress(world: World): Record<string, NodeProgress> {
  const progress: Record<string, NodeProgress> = {};
  for (const node of world.nodes) {
    const isStart = node.id === world.startNodeId;
    progress[node.id] = {
      what: isStart ? "available" : "locked",
      how: "locked",
      why: "locked",
      system: "locked",
      introScene: "unseen",
      finalQuestion: "locked",
      nodeClear: false,
    };
  }
  return progress;
}

/** 深度切换器的入口状态 */
export type DepthGateStatus = "current" | "available" | "completed" | "locked";

export function getDepthGateStatus(
  depth: LayerType,
  currentDepth: LayerType,
  progress: Record<string, NodeProgress>,
  world: World,
): DepthGateStatus {
  if (depth === currentDepth) return "current";

  // 统计各深度的完成数
  const completedByDepth: Record<LayerType, number> = {
    what: 0, how: 0, why: 0, system: 0,
  };
  for (const p of Object.values(progress)) {
    if (p.what === "completed") completedByDepth.what++;
    if (p.how === "completed") completedByDepth.how++;
    if (p.why === "completed") completedByDepth.why++;
    if (p.system === "completed") completedByDepth.system++;
  }

  const prevDepth: Record<LayerType, LayerType | null> = {
    what: null,
    how: "what",
    why: "how",
    system: "why",
  };

  if (prevDepth[depth] === null) return "available";

  const prev = prevDepth[depth]!;
  const allComplete =
    world.nodes.length > 0 &&
    world.nodes.every((n) => progress[n.id]?.[prev] === "completed");

  if (allComplete) return "completed";
  if (completedByDepth[prev] > 0) return "available";
  return "locked";
}

/** 计算当前深度下哪些节点可见（可用于 available 或 learning） */
export function getVisibleNodes(
  depth: LayerType,
  world: World,
  progress: Record<string, NodeProgress>,
): Set<string> {
  const visible = new Set<string>();

  if (depth === "what") {
    // What 层所有节点可见（locked 态被迷雾遮盖，但仍算"存在"）
    for (const node of world.nodes) visible.add(node.id);
    return visible;
  }

  // 找 startNode
  visible.add(world.startNodeId);

  // 已完成节点在当前深度的邻接节点可见（但只显露 nextDiscoveryId 指向的那一个）
  for (const node of world.nodes) {
    const p = progress[node.id];
    if (!p) continue;

    // 当前深度已完成 → 显露其 nextDiscoveryId 指向的节点
    if (p[depth] === "completed" && node.nextDiscoveryId) {
      visible.add(node.nextDiscoveryId);
    }

    // startNode 在所有深度都可用
    if (node.id === world.startNodeId) {
      visible.add(node.id);
    }
  }

  // 额外：上一深度（shallow）已完成的节点在当前深度也可用
  const prevDepth: Record<LayerType, LayerType | null> = {
    what: null, how: "what", why: "how", system: "why",
  };
  const prev = prevDepth[depth];
  if (prev) {
    for (const node of world.nodes) {
      const p = progress[node.id];
      if (p && p[prev] === "completed") {
        visible.add(node.id);
      }
    }
  }

  return visible;
}

/** 完成一个节点后，更新迷雾进度，返回需要从迷雾中显露的新节点 ID */
export function afterNodeCompleted(
  nodeId: string,
  depth: LayerType,
  world: World,
  progress: Record<string, NodeProgress>,
): string | null {
  const node = world.nodes.find((n) => n.id === nodeId);
  if (!node) return null;

  // nextDiscoveryId 指向的节点；若为空则按 neighbors[0]
  const nextId =
    node.nextDiscoveryId ??
    node.neighbors[0] ??
    null;

  if (!nextId) return null;

  // 将目标节点在当前深度设为 available
  if (progress[nextId]) {
    progress[nextId][depth] = "available";
  }

  return nextId;
}

/** 计算迷雾消散百分比（PRD §4.2.7）：已完成 (node, depth) 对 / 总可能数 */
export function calcFogPercentage(
  world: World,
  progress: Record<string, NodeProgress>,
): number {
  const total = world.nodes.length * 4; // what/how/why/system
  let completed = 0;
  for (const p of Object.values(progress)) {
    if (p.what === "completed") completed++;
    if (p.how === "completed") completed++;
    if (p.why === "completed") completed++;
    if (p.system === "completed") completed++;
  }
  return Math.round((completed / total) * 100);
}
