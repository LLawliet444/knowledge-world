/**
 * 世界生成引擎 Zustand store
 *
 * 管理：当前加载的世界、节点进度、迷雾百分比、当前深度
 * 持久化：仅 sessionId（后端 Redis 才是进度的唯一真源）
 * 刷新恢复：启动时若有 sessionId 则调 GET /sessions/{id}/status 重建 UI 状态
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { World, LayerType } from "../types/world";
import {
  buildInitialProgress,
  calcFogPercentage,
  afterNodeCompleted,
  type NodeProgress,
} from "../utils/depthGate";
import { getSessionStatus, type SessionStatus } from "../api/nodes";

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

  // 后端学习会话 ID（整个学习旅程共享，跨节点跨层）
  sessionId: string | null;
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

  /** 设置原问回响（finalQuestion）状态：system 全通后回到 what 层解答初始问题 */
  setFinalQuestion: (
    nodeId: string,
    state: "locked" | "available" | "completed",
  ) => void;

  /** 记录终问最近一次评价（correct/partial/incorrect） */
  setFinalQuestionVerdict: (
    nodeId: string,
    verdict: "correct" | "partial" | "incorrect",
  ) => void;

  /**
   * 节点终问完成后，解锁下一节点（在 what 层设为 available，迷雾消散）。
   * 依据 node.nextDiscoveryId ?? node.neighbors[0] 指向的节点。
   */
  unlockNextNode: (nodeId: string) => void;

  /** 深度切换 */
  switchDepth: (depth: LayerType) => void;

  /** 完成深度切换动画 */
  finishDepthSwitch: () => void;

  /** 学者移动到坐标 */
  moveScholar: (x: number, y: number) => void;

  /** 设置后端会话 ID（首次 createSession 后存入，跨节点跨层复用） */
  setSessionId: (id: string) => void;

  /**
   * 从后端 /status 恢复 UI 状态（刷新页面后调用）。
   * 根据 sessionId 拉取后端状态，重建 nodeProgress / currentDepth。
   * 返回后端状态副本（供对话框恢复最后一条消息），无会话或失败返回 null。
   */
  restoreSession: () => Promise<SessionStatus | null>;

  /** 清空缓存进度，回到初始状态 */
  resetProgress: (world: World) => void;
}

const EMPTY_PROGRESS: Record<string, NodeProgress> = {};

export const useWorldStore = create<WorldState & WorldActions>()(
  persist(
    (set, get) => ({
      world: null,
      nodeProgress: EMPTY_PROGRESS,
      currentDepth: "what",
      fogPercentage: 0,
      scholarPos: { x: 0, y: 0 },
      isSwitchingDepth: false,
      switchingTargetDepth: null,
      sessionId: null,

      loadWorld: (world) => {
        // 进度真源在后端 Redis，前端始终从初始进度开始；
        // 若有 sessionId，由 App 调 restoreSession 从后端拉取覆盖
        const progress = buildInitialProgress(world);
        set({
          world,
          nodeProgress: progress,
          fogPercentage: calcFogPercentage(world, progress),
          scholarPos: { x: world.scholarStartByDepth.what.x, y: world.scholarStartByDepth.what.y },
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

      setFinalQuestion: (nodeId, state) => {
        const { nodeProgress } = get();
        const p = nodeProgress[nodeId];
        if (!p) return;
        set({
          nodeProgress: {
            ...nodeProgress,
            [nodeId]: { ...p, finalQuestion: state, nodeClear: state === "completed" },
          },
        });
      },

      setFinalQuestionVerdict: (nodeId, verdict) => {
        const { nodeProgress } = get();
        const p = nodeProgress[nodeId];
        if (!p) return;
        set({
          nodeProgress: {
            ...nodeProgress,
            [nodeId]: { ...p, finalQuestionVerdict: verdict },
          },
        });
      },

      unlockNextNode: (nodeId) => {
        const { world, nodeProgress } = get();
        if (!world) return;
        // 深拷贝 progress，避免直接 mutate 原对象
        const progress: Record<string, NodeProgress> = {};
        for (const k of Object.keys(nodeProgress)) {
          progress[k] = { ...nodeProgress[k] };
        }
        afterNodeCompleted(nodeId, "what", world, progress);
        set({
          nodeProgress: progress,
          fogPercentage: calcFogPercentage(world, progress),
        });
      },

      switchDepth: (depth) => {
        const { currentDepth } = get();
        if (depth === currentDepth) return;
        set({ isSwitchingDepth: true, switchingTargetDepth: depth });
      },

      finishDepthSwitch: () => {
        const { switchingTargetDepth, world, nodeProgress } = get();
        if (!switchingTargetDepth || !world) return;
        const start = world.scholarStartByDepth[switchingTargetDepth];

        // 切到新层后：把上一深度已 completed 的节点在新层设为 available，
        // 保证它们可点（与 What→How 的显式解锁一致）
        const LAYER_ORDER = ["what", "how", "why", "system"] as const;
        const idx = LAYER_ORDER.indexOf(switchingTargetDepth);
        const prevDepth = idx > 0 ? LAYER_ORDER[idx - 1] : null;
        const updated = { ...nodeProgress };
        if (prevDepth) {
          for (const node of world.nodes) {
            const p = updated[node.id];
            if (p && p[prevDepth] === "completed" && p[switchingTargetDepth] === "locked") {
              updated[node.id] = { ...p, [switchingTargetDepth]: "available" };
            }
          }
        }

        set({
          currentDepth: switchingTargetDepth,
          isSwitchingDepth: false,
          switchingTargetDepth: null,
          scholarPos: { x: start.x, y: start.y },
          nodeProgress: updated,
          fogPercentage: calcFogPercentage(world, updated),
        });
      },

      moveScholar: (x, y) => set({ scholarPos: { x, y } }),

      setSessionId: (id) => set({ sessionId: id }),

      restoreSession: async () => {
        const { sessionId, world } = get();
        if (!sessionId || !world) return null;

        const status = await getSessionStatus(sessionId);
        if (!status) {
          // 后端无此会话（过期或不存在）：清空 sessionId，保持初始进度
          set({ sessionId: null });
          return null;
        }

        // 重建 nodeProgress：以初始进度为底
        const progress = buildInitialProgress(world);
        const LAYER_ORDER = ["what", "how", "why", "system"] as const;

        // 1) 先恢复历史节点：根据 nodeHistory 标记每个已完成节点的各层状态
        for (const h of status.nodeHistory) {
          const p = progress[h.frontendNodeId];
          if (!p) continue;
          // what 层：能进入 how 说明 what 已完成
          if (h.completedLayers.length > 0) {
            p.what = "completed";
            p.introScene = "seen";
          }
          // 按层顺序标记 completed
          for (const layer of h.completedLayers) {
            if (layer === "how" || layer === "why" || layer === "system") {
              p[layer] = "completed";
            }
          }
          // 节点全部完成 → 终问状态
          if (h.nodeCompleted) {
            p.system = "completed";
            p.finalQuestionVerdict = h.finalQuestionVerdict || "";
            if (h.finalQuestionCompleted) {
              // 终问通过 → completed，解锁下一节点
              p.finalQuestion = "completed";
              p.nodeClear = true;
              afterNodeCompleted(h.frontendNodeId, "what", world, progress);
            } else {
              // 终问未通过或未作答 → available，下次点开仍显示终问
              p.finalQuestion = "available";
            }
          }
        }

        // 2) 恢复当前节点（若与历史中某个节点相同，下面会覆盖更新为"进行中"状态）
        if (status.frontendNodeId && status.currentLayer) {
          const cur = progress[status.frontendNodeId];
          if (cur) {
            const layerIdx = LAYER_ORDER.indexOf(status.currentLayer);
            // 当前层及之前的层对该节点标记 completed（状态机已流转到此层）
            // what 层虽是前端翻卡流程，但能进入 how 说明 what 已完成，标记合理
            if (layerIdx >= 1) cur.what = "completed";
            if (layerIdx >= 2) cur.how = "completed";
            if (layerIdx >= 3) cur.why = "completed";
            // 当前层本身视作 available（进行中）
            cur[status.currentLayer] = "available";
            // 已进入 how 层及之后，说明 what 层动画早已看过，标记 seen 避免刷新后重播
            if (layerIdx >= 1) cur.introScene = "seen";
          }
          // 节点全部完成：当前节点 system completed + finalQuestion 开启
          if (status.nodeCompleted && cur) {
            cur.system = "completed";
            cur.finalQuestion = "available";
          }
        }

        // currentDepth：节点全部完成时回到 what 层（由 NPC 触发 finalQuestion），
        // 否则跳到当前层，无节点则 what
        const depth: LayerType = status.nodeCompleted
          ? "what"
          : (status.currentLayer ?? "what");

        // 学徒位置：若有当前节点，放到节点旁边（与 handleNodeClick 的偏移一致）；
        // 否则用该层起始点
        let scholarPos = { ...world.scholarStartByDepth[depth] };
        if (status.frontendNodeId) {
          const cur = world.nodes.find((n) => n.id === status.frontendNodeId);
          if (cur) {
            const np = cur.positions[depth];
            if (np) {
              scholarPos = { x: np.x - 100, y: np.y + 30 };
            }
          }
        }

        set({
          nodeProgress: progress,
          currentDepth: depth,
          fogPercentage: calcFogPercentage(world, progress),
          scholarPos,
        });

        return status;
      },

      resetProgress: (world) => {
        const progress = buildInitialProgress(world);
        set({
          nodeProgress: progress,
          currentDepth: "what",
          fogPercentage: calcFogPercentage(world, progress),
          scholarPos: { x: world.scholarStartByDepth.what.x, y: world.scholarStartByDepth.what.y },
          isSwitchingDepth: false,
          switchingTargetDepth: null,
          // 重置进度同时清空会话，下次打开对话框会重新 createSession
          sessionId: null,
        });
      },
    }),
    {
      name: "knowledge-world-progress",
      // 仅持久化 sessionId：进度真源在后端 Redis，刷新后由 restoreSession 拉取
      partialize: (state) => ({
        sessionId: state.sessionId,
      }),
    },
  ),
);
