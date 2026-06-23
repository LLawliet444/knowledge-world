/**
 * 节点标签层（HTML 浮层，跟随 PixiJS stage 一起 transform）
 *
 * 渲染在 MAP_WIDTH × MAP_HEIGHT 的坐标系内，绝对定位在节点 NPC 头顶。
 * 外层 WorldMap 用 CSS transform: scale(stageScale) 把整个 stage 缩放到视口，
 * 所以这里所有 label 自动跟随缩放、定位精确。
 *
 * 标签类型（按节点状态决定）：
 * - 起点（startNodeId & available）
 * - 当前所在（与学者最接近的节点）
 * - 主线索（nextDiscoveryId 链上下一个可前往节点）
 * - 可前往（其他 available 节点）
 * - 已通关（completed）
 * - 未通关（locked）
 */

import React from "react";
import { useWorldStore } from "../../store/worldStore";

type LabelKind = "current" | "available" | "locked" | "cleared" | "start" | "mainline";

const LABEL_TEXT: Record<LabelKind, string> = {
  current: "当前所在",
  available: "可前往",
  locked: "未通关",
  cleared: "已通关",
  start: "起点",
  mainline: "主线索",
};
const LABEL_ICON: Record<LabelKind, string> = {
  current: "📍",
  available: "→",
  locked: "🔒",
  cleared: "✅",
  start: "✦",
  mainline: "◆",
};
const LABEL_BG: Record<LabelKind, string> = {
  current: "#fff8e6",
  available: "#fff8e6",
  locked: "#e8d5f7",
  cleared: "#dff0e4",
  start: "#fff8e6",
  mainline: "#fff8e6",
};
const LABEL_FG: Record<LabelKind, string> = {
  current: "#1a1226",
  available: "#3a1f0a",
  locked: "#3a1f0a",
  cleared: "#2e6b3a",
  start: "#b56c27",
  mainline: "#6b5b95",
};
const LABEL_BORDER: Record<LabelKind, string> = {
  current: "#1a1226",
  available: "#3a1f0a",
  locked: "#6b5b95",
  cleared: "#5d9c3f",
  start: "#da9100",
  mainline: "#6b5b95",
};

export const NodeLabelLayer: React.FC = () => {
  const { world, nodeProgress, currentDepth, scholarPos } = useWorldStore();
  if (!world) return null;

  // 找当前所在节点（学者最接近的）
  let currentId: string | null = null;
  let bestDist = Infinity;
  for (const node of world.nodes) {
    const np = node.positions[currentDepth];
    if (!np) continue;
    const d = Math.hypot(np.x - scholarPos.x, np.y - scholarPos.y);
    if (d < bestDist) {
      bestDist = d;
      currentId = node.id;
    }
  }

  // 主线索节点：nextDiscoveryId 链上已通关节点指向的下一节点
  const mainlineIds = new Set<string>();
  for (const node of world.nodes) {
    if (!node.nextDiscoveryId) continue;
    const p = nodeProgress[node.id];
    if (p && p[currentDepth] === "completed") {
      mainlineIds.add(node.nextDiscoveryId);
    }
  }

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: 1920,
        height: 1080,
        pointerEvents: "none",
        zIndex: 10,
      }}
    >
      {world.nodes.map((node) => {
        const p = nodeProgress[node.id];
        const state = p?.[currentDepth] ?? "locked";
        const np = node.positions[currentDepth];
        if (!np) return null;

        // 决定 label 类型
        let kind: LabelKind;
        if (node.id === world.startNodeId && state === "available") {
          kind = "start";
        } else if (node.id === currentId) {
          kind = "current";
        } else if (state === "completed") {
          kind = "cleared";
        } else if (state === "available") {
          kind = mainlineIds.has(node.id) ? "mainline" : "available";
        } else {
          kind = "locked";
        }

        // 标签定位：NPC 头顶上方
        const labelX = np.x;
        const labelY = np.y - 110;

        return (
          <div
            key={node.id}
            style={{
              position: "absolute",
              left: labelX,
              top: labelY,
              transform: "translate(-50%, 0)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
            }}
          >
            {/* 状态 chip */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                backgroundColor: LABEL_BG[kind],
                color: LABEL_FG[kind],
                border: `2px solid ${LABEL_BORDER[kind]}`,
                padding: "3px 8px",
                fontSize: 14,
                fontWeight: "bold",
                textShadow: "1px 1px 0 rgba(0,0,0,0.15)",
                boxShadow: "2px 2px 0 rgba(26, 18, 38, 0.35)",
                whiteSpace: "nowrap",
                fontFamily: "'Zpix', 'Press Start 2P', monospace",
                imageRendering: "pixelated",
              }}
            >
              <span style={{ fontSize: 12 }}>{LABEL_ICON[kind]}</span>
              <span>{LABEL_TEXT[kind]}</span>
            </div>
            {/* 节点名 */}
            <div
              style={{
                backgroundColor: "rgba(26, 18, 38, 0.78)",
                color: "#fff8e6",
                border: "2px solid #1a1226",
                padding: "3px 10px",
                fontSize: 13,
                whiteSpace: "nowrap",
                fontFamily: "'Zpix', 'Press Start 2P', monospace",
                textShadow: "1px 1px 0 #1a1226",
              }}
            >
              {node.name}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default NodeLabelLayer;
