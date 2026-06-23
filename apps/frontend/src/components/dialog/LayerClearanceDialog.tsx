/**
 * 节点通关评级对话框
 *
 * 场景：how/why/system 层通关后再次点击该节点，弹此对话框只显示该层的通关评级。
 * 数据源：nodeProgress[nodeId].layerRecords[depth]（从后端 /status 恢复时填入）
 *
 * 不发起后端 API（节点已通关，避免 409 Conflict），纯展示。
 */

import React from "react";
import { useWorldStore } from "../../store/worldStore";
import { PixelButton } from "../common/PixelButton";
import type { WorldNode, LayerType } from "../../types/world";
import type { LayerRecord } from "../../types/feedback";

interface LayerClearanceDialogProps {
  node: WorldNode;
  depth: Exclude<LayerType, "what">;
  onClose: () => void;
}

const LAYER_LABEL: Record<Exclude<LayerType, "what">, string> = {
  how: "How · 机制理解",
  why: "Why · 本质抽象",
  system: "System · 体系建模",
};

/** 把后端 score (1-5) 映射到 3 档文字评级 */
function scoreToVerdict(score: number): { label: string; color: string } {
  if (score >= 4) return { label: "优秀", color: "#5d9c3f" };
  if (score >= 3) return { label: "通过", color: "#b56c27" };
  return { label: "勉强", color: "#8b5a2b" };
}

const SIGNAL_LABEL: Record<keyof LayerRecord["signals"], string> = {
  abstraction: "抽象",
  transfer: "迁移",
  example: "举例",
  compression: "压缩",
};

export const LayerClearanceDialog: React.FC<LayerClearanceDialogProps> = ({
  node,
  depth,
  onClose,
}) => {
  const { nodeProgress } = useWorldStore();
  const p = nodeProgress[node.id];
  const rec = p?.layerRecords?.[depth];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 320, maxHeight: 480 }}>
      {/* 标题 */}
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
        <span>🏆 {node.name} · {LAYER_LABEL[depth]} 已通关</span>
      </div>

      {/* 评级 */}
      {rec ? (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "12px 16px",
              backgroundColor: "#dff0e4",
              border: "3px solid #5d9c3f",
            }}
          >
            <div style={{ fontSize: 13, color: "#492310" }}>通关评级</div>
            <div
              style={{
                fontSize: 22,
                fontWeight: "bold",
                color: scoreToVerdict(rec.score).color,
                textShadow: "1px 1px 0 #fff",
              }}
            >
              {scoreToVerdict(rec.score).label}
            </div>
            <div
              style={{
                fontSize: 12,
                color: "#492310",
                opacity: 0.7,
                marginLeft: "auto",
              }}
            >
              得分 {rec.score.toFixed(1)} / 5
            </div>
          </div>

          {/* 行为信号 */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 6,
              padding: "8px 12px",
              backgroundColor: "#fff7e6",
              border: "2px solid #b56c27",
            }}
          >
            {(["abstraction", "transfer", "example", "compression"] as const).map((k) => (
              <div
                key={k}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <div style={{ fontSize: 11, color: "#492310", opacity: 0.7 }}>
                  {SIGNAL_LABEL[k]}
                </div>
                <div style={{ fontSize: 16, color: "#492310", fontWeight: "bold" }}>
                  {rec.signals[k] ?? 0}
                </div>
              </div>
            ))}
          </div>

          {/* 层总结 */}
          {rec.summary && (
            <div
              style={{
                backgroundColor: "#fff7e6",
                border: "2px solid #da9100",
                padding: "12px 16px",
                fontSize: 14,
                lineHeight: 1.7,
                color: "#492310",
                whiteSpace: "pre-wrap",
                maxHeight: 180,
                overflowY: "auto",
              }}
            >
              <div style={{ fontSize: 12, color: "#b56c27", marginBottom: 6, fontWeight: "bold" }}>
                📜 老学者评语
              </div>
              {rec.summary}
            </div>
          )}
        </>
      ) : (
        // 无 layerRecords 数据（理论上 restoreSession 应已填入；若失败则显示通用文案）
        <div
          style={{
            backgroundColor: "#dff0e4",
            border: "3px solid #5d9c3f",
            padding: "16px 20px",
            fontSize: 15,
            lineHeight: 1.7,
            color: "#492310",
            whiteSpace: "pre-wrap",
          }}
        >
          {`「${node.name}」的 ${LAYER_LABEL[depth]} 已通关。\n\n这一层你走完了：先理解机制（how），再抽象本质（why），最后建模体系（system）。继续向下一层探索吧。`}
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

export default LayerClearanceDialog;
