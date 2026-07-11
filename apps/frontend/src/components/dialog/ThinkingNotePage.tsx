/**
 * 节点思考笔记页面
 *
 * 节点完成原问回响后展示，汇总用户在各层的回答 + 关键词。
 * 只展示正面内容（用户自己的回答原文），不展示弱点分析。
 */

import React from "react";
import { useKnowledgeStore } from "../../store/knowledgeStore";
import { PixelButton } from "../common/PixelButton";
import type { WorldNode } from "../../types/world";

interface ThinkingNotePageProps {
  node: WorldNode;
  onClose: () => void;
}

export const ThinkingNotePage: React.FC<ThinkingNotePageProps> = ({
  node,
  onClose,
}) => {
  const { getThinkingNote, nodeRecords } = useKnowledgeStore();
  const note = getThinkingNote(node.id);
  const record = nodeRecords[node.id];

  if (!note) {
    // 无记录时显示通用文案
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 320 }}>
        <div
          style={{
            fontSize: 20,
            color: "#492310",
            paddingBottom: 8,
            borderBottom: "3px dashed #b56c27",
          }}
        >
          📖 {node.name} · 思考笔记
        </div>
        <div
          style={{
            backgroundColor: "#dff0e4",
            border: "3px solid #5d9c3f",
            padding: "16px 20px",
            fontSize: 15,
            lineHeight: 1.8,
            color: "#492310",
          }}
        >
          {`你完成了「${node.name}」的探索。\n\n这个节点的思考笔记尚未生成。继续探索其他节点吧。`}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "auto" }}>
          <PixelButton onClick={onClose} variant="success">回到地图</PixelButton>
        </div>
      </div>
    );
  }

  const sections: { label: string; icon: string; text: string; feedback?: string }[] = [
    { label: "你选择的卷轴", icon: "📜", text: note.scrollText },
    { label: "How · 你的理解", icon: "💡", text: note.howAnswer, feedback: note.positiveFeedback.how },
    { label: "Why · 你的分析", icon: "🔍", text: note.whyAnswer, feedback: note.positiveFeedback.why },
    { label: "System · 你的延伸", icon: "🌐", text: note.systemAnswer, feedback: note.positiveFeedback.system },
    { label: "你的最终回答", icon: "✨", text: note.finalAnswer, feedback: note.positiveFeedback.final },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 360, maxHeight: 500 }}>
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
          gap: 8,
        }}
      >
        📖 {node.name} · 你的思考笔记
      </div>

      {/* 完成时间 */}
      {record && (
        <div style={{ fontSize: 11, color: "#492310", opacity: 0.6, textAlign: "right" }}>
          完成于 {new Date(record.completedAt).toLocaleString("zh-CN")}
        </div>
      )}

      {/* 各层回答 */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        {sections.map((s) => (
          <div key={s.label}>
            <div
              style={{
                fontSize: 12,
                color: "#b56c27",
                fontWeight: "bold",
                marginBottom: 4,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {s.icon} ── {s.label} ──
            </div>
            <div
              style={{
                backgroundColor: "#fff7e6",
                border: "2px solid #da9100",
                padding: "10px 14px",
                fontSize: 14,
                lineHeight: 1.7,
                color: "#492310",
                whiteSpace: "pre-wrap",
              }}
            >
              {s.text}
            </div>
            {s.feedback && (
              <div
                style={{
                  backgroundColor: "#dff0e4",
                  border: "2px solid #5d9c3f",
                  padding: "6px 12px",
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: "#2e6b3a",
                  marginTop: 4,
                  marginLeft: 12,
                  whiteSpace: "pre-wrap",
                }}
              >
                💡 老学者点评：{s.feedback}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 关键词 */}
      {note.keywords.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            padding: "8px 12px",
            backgroundColor: "#e8d5f7",
            border: "2px solid #6b5b95",
          }}
        >
          <span style={{ fontSize: 12, color: "#3f3558", fontWeight: "bold" }}>
            ⭐ 你在探索中提到：
          </span>
          {note.keywords.map((kw) => (
            <span
              key={kw}
              style={{
                fontSize: 12,
                color: "#fff",
                backgroundColor: "#6b5b95",
                padding: "2px 8px",
                borderRadius: 8,
              }}
            >
              {kw}
            </span>
          ))}
        </div>
      )}

      {/* 底部按钮 */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
          padding: "4px 0",
        }}
      >
        <PixelButton onClick={onClose} variant="success">
          继续探索
        </PixelButton>
      </div>
    </div>
  );
};

export default ThinkingNotePage;
