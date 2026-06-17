/**
 * 四段式诊断反馈卡 —— 星露谷像素风
 *
 * 四张卡片：你已理解 / 还缺一点 / 提示 / 下一问（或完成）
 * 风格参考 index.html sd-board + sd-btn：
 *   - 羊皮纸底 + 双层木边框 + 金色内框
 *   - 每张卡片用不同底色表达语义（绿/橙/紫/绿）
 */

import React from "react";
import type { FeedbackCard as FeedbackCardData } from "../../types/feedback";
import { PixelButton } from "../common/PixelButton";

interface FeedbackCardProps {
  feedback: FeedbackCardData;
  feedbackLevel: string;
  depthState: string;
  onContinue: () => void;
  onClose: () => void;
}

// 每个卡片的颜色语义
const THEMES = {
  understood: {
    bg: "#dff0e4",       // 嫩绿（理解了）
    border: "#5d9c3f",
    outer: "#97e65e",
    label: "✅ 你已理解",
  },
  missing: {
    bg: "#fbe3b4",       // 暖橙（还缺一点）
    border: "#b56c27",
    outer: "#eeb069",
    label: "💡 还缺一点",
  },
  hint: {
    bg: "#e8d5f7",       // 紫（提示）
    border: "#6b5b95",
    outer: "#b9a8d8",
    label: "🔍 提示",
  },
  next: {
    bg: "#dff0e4",       // 嫩绿（下一问 / 完成）
    border: "#5d9c3f",
    outer: "#97e65e",
    label: "🔄 下一问",
  },
} as const;

const cardStyle = (theme: keyof typeof THEMES): React.CSSProperties => {
  const t = THEMES[theme];
  return {
    position: "relative",
    backgroundColor: t.bg,
    border: `4px solid ${t.border}`,
    boxShadow: `0 0 0 4px ${t.outer}`,
    padding: 12,
    fontFamily: "'Zpix', 'Press Start 2P', 'Microsoft YaHei', monospace",
    color: "#492310",
  };
};

const labelStyle = (theme: keyof typeof THEMES): React.CSSProperties => {
  const t = THEMES[theme];
  return {
    position: "absolute",
    top: -14,
    left: 12,
    backgroundColor: t.border,
    color: "#ffffff",
    padding: "2px 10px",
    border: `3px solid #492310`,
    fontFamily: "'Zpix', 'Press Start 2P', 'Microsoft YaHei', monospace",
    fontSize: 12,
    textShadow: "2px 2px 0px #492310",
    boxShadow: "0 2px 0 rgba(0,0,0,0.2)",
  };
};

const bodyText: React.CSSProperties = {
  fontSize: 14,
  color: "#492310",
  lineHeight: 1.5,
  paddingTop: 8,
};

const bulletList: React.CSSProperties = {
  paddingLeft: 16,
  margin: 0,
  fontSize: 14,
  color: "#492310",
  lineHeight: 1.6,
  paddingTop: 8,
};

export const FeedbackCard: React.FC<FeedbackCardProps> = ({
  feedback,
  depthState,
  onContinue,
  onClose,
}) => {
  const isCompleted = depthState === "completed";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: 16,
        width: "100%",
        paddingTop: 8,
      }}
    >
      {/* 1. 已理解 */}
      <div style={{ position: "relative" }}>
        <div style={labelStyle("understood")}>{THEMES.understood.label}</div>
        <div style={cardStyle("understood")}>
          <ul style={bulletList}>
            {(feedback.understood ?? []).map((s: string, i: number) => (
              <li key={i} style={{ marginBottom: 2 }}>
                {s}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 2. 还缺一点 */}
      <div style={{ position: "relative" }}>
        <div style={labelStyle("missing")}>{THEMES.missing.label}</div>
        <div style={cardStyle("missing")}>
          <ul style={bulletList}>
            {(feedback.missing ?? []).map((s: string, i: number) => (
              <li key={i} style={{ marginBottom: 2 }}>
                {s}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 3. 提示 */}
      <div style={{ position: "relative" }}>
        <div style={labelStyle("hint")}>{THEMES.hint.label}</div>
        <div style={cardStyle("hint")}>
          <div style={bodyText}>{feedback.guidance}</div>
        </div>
      </div>

      {/* 4. 下一问 / 完成 */}
      <div style={{ position: "relative" }}>
        <div style={labelStyle("next")}>
          {isCompleted ? "🎉 已掌握！" : THEMES.next.label}
        </div>
        <div
          style={{
            ...cardStyle("next"),
            minHeight: 100,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          {isCompleted ? (
            <>
              <div style={bodyText}>
                这一层的核心你已经掌握！迷雾散去了一部分——
                对前一个节点的理解让你看见了相邻的问题。
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <PixelButton onClick={onClose} variant="success">
                  继续探索
                </PixelButton>
              </div>
            </>
          ) : (
            <div style={bodyText}>{feedback.next_question}</div>
          )}
        </div>
      </div>

      {/* 底部：继续追问 / 稍后回来（未完成态才显示） */}
      {!isCompleted && (
        <div
          style={{
            gridColumn: "1 / -1",
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: 4,
          }}
        >
          <PixelButton onClick={onClose} variant="secondary">
            稍后回来
          </PixelButton>
          <PixelButton onClick={onContinue} variant="primary">
            继续追问
          </PixelButton>
        </div>
      )}
    </div>
  );
};

export default FeedbackCard;
