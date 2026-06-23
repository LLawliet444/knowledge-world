/**
 * NPC 头顶冒泡组件
 *
 * What 层完成后，点击 NPC 时在 NPC 头上显示一个气泡，
 * 气泡内容是 NPC 的终问（mysteryQuestion），而非打开对话框。
 */

import React from "react";
import type { WorldNode } from "../../types/world";

interface NodeSpeechBubbleProps {
  node: WorldNode;
  /** NPC 中心在 MAP 坐标系中的 x */
  posX: number;
  /** NPC 中心在 MAP 坐标系中的 y */
  posY: number;
  onClose: () => void;
}

export const NodeSpeechBubble: React.FC<NodeSpeechBubbleProps> = ({
  node,
  posX,
  posY,
  onClose,
}) => {
  const BUBBLE_WIDTH = 320;

  // 气泡主体：NPC 头顶上方
  // NPC 图标高度 144px，anchor 为 0.5，所以头顶在 posY - 72
  // 气泡底部与头顶之间留 16px 间隙（尾巴占一部分）
  const bubbleLeft = posX - BUBBLE_WIDTH / 2;
  const bubbleBottom = posY - 72 - 16; // bottom of bubble (the tail connects here)

  return (
    <>
      {/* 全屏遮罩——点击任意处关闭气泡 */}
      {/* 遮罩在 MAP 容器内全铺，pointer-events: auto */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "auto",
          cursor: "pointer",
        }}
        onClick={onClose}
      />

      {/* 气泡容器：bottom + left 定位 */}
      <div
        style={{
          position: "absolute",
          left: bubbleLeft,
          bottom: bubbleBottom,
          width: BUBBLE_WIDTH,
          pointerEvents: "none", // 点击穿透，由遮罩处理
        }}
      >
        {/* 气泡主体 + 尾巴（用伪元素画三角） */}
        <div
          style={{
            position: "relative",
            backgroundColor: "#fff8e6",
            border: "4px solid #492310",
            borderRadius: 12,
            padding: "18px 20px 14px",
            fontFamily: "'Zpix', 'Press Start 2P', 'Microsoft YaHei', monospace",
            boxShadow: "4px 4px 0 rgba(0,0,0,0.15)",
          }}
        >
          {/* NPC 称号 */}
          <div
            style={{
              fontSize: 13,
              color: "#6b5b95",
              marginBottom: 10,
              textAlign: "center",
              fontWeight: "bold",
            }}
          >
            🧙 {node.gateNpc.title}
          </div>

          {/* 分隔线 */}
          <div
            style={{
              width: "60%",
              height: 2,
              backgroundColor: "#e8d5a3",
              margin: "0 auto 10px",
            }}
          />

          {/* 谜题终问 */}
          <div
            style={{
              fontSize: 16,
              lineHeight: 1.7,
              color: "#492310",
              textAlign: "center",
            }}
          >
            ❓ {node.mysteryQuestion}
          </div>

          {/* 关闭提示 */}
          <div
            style={{
              fontSize: 11,
              color: "#b56c27",
              textAlign: "center",
              marginTop: 14,
              opacity: 0.6,
            }}
          >
            点击任意处关闭
          </div>
        </div>

        {/* 尾巴：向下三角 */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: -2,
          }}
        >
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: "14px solid transparent",
              borderRight: "14px solid transparent",
              borderTop: "16px solid #492310",
            }}
          />
        </div>
      </div>
    </>
  );
};

export default NodeSpeechBubble;
