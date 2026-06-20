/**
 * 节点通关纪念对话框
 *
 * 当节点终问（finalQuestion）已通过（verdict=correct）后，再次点击该节点时显示。
 * 不再有提问场景，只展示节点 icon + 通关寄语 + 各层摘要回顾。
 */

import React from "react";
import { useWorldStore } from "../../store/worldStore";
import { PixelButton } from "../common/PixelButton";
import type { WorldNode } from "../../types/world";

interface NodeMemorialDialogProps {
  node: WorldNode;
  onClose: () => void;
}

const LAYER_LABEL: Record<string, string> = {
  how: "How · 理解层",
  why: "Why · 因果层",
  system: "System · 系统层",
};

export const NodeMemorialDialog: React.FC<NodeMemorialDialogProps> = ({
  node,
  onClose,
}) => {
  const { nodeProgress } = useWorldStore();
  const p = nodeProgress[node.id];

  // 各层摘要（后端归档的 layer_summaries，恢复时已写入 nodeProgress？实际未存，这里用空占位）
  // 注：layer_summaries 目前只在后端 node_history 里，前端 NodeProgress 未存。
  // 这里只展示节点基本信息 + 通关状态。
  const verdict = p?.finalQuestionVerdict ?? "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 360, maxHeight: 480 }}>
      {/* 标题区 */}
      <div
        style={{
          fontSize: 20,
          lineHeight: 1.5,
          color: "#492310",
          paddingBottom: 8,
          borderBottom: "3px dashed #b56c27",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <img
          src={node.icon}
          alt={node.name}
          style={{ width: 40, height: 40, imageRendering: "pixelated" }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
        <span>🏆 {node.name} · 已通关</span>
      </div>

      {/* 缎带 */}
      <div
        style={{
          display: "inline-block",
          alignSelf: "flex-end",
          backgroundColor: "#5d9c3f",
          color: "#fff7e6",
          padding: "3px 10px",
          border: "2px solid #492310",
          textShadow: "1px 1px 0px #492310",
          fontSize: 11,
          marginBottom: 4,
        }}
      >
        通关纪念 · {node.gateNpc.title}
      </div>

      {/* 通关寄语 */}
      <div
        style={{
          backgroundColor: "#dff0e4",
          border: "3px solid #5d9c3f",
          padding: "14px 18px",
          fontSize: 15,
          lineHeight: 1.8,
          color: "#492310",
          whiteSpace: "pre-wrap",
        }}
      >
        {`你已经走完了「${node.name}」的四层探索，并用自己的话回答了最初的问题。\n\n「${node.mysteryQuestion}」\n\n这个节点的探索已经完成。带着这份理解，继续走向下一个未知吧。`}
      </div>

      {/* 评价标记 */}
      {verdict === "correct" && (
        <div
          style={{
            fontSize: 13,
            color: "#5d9c3f",
            fontWeight: "bold",
            textAlign: "center",
          }}
        >
          ✅ 终问评价：通过
        </div>
      )}

      {/* 底部按钮 */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
          padding: "4px 0",
          marginTop: "auto",
        }}
      >
        <PixelButton onClick={onClose} variant="success">
          回到地图
        </PixelButton>
      </div>
    </div>
  );
};

export default NodeMemorialDialog;
