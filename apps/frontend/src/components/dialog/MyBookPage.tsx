/**
 * 《我的〈人类简史〉》合集页面
 *
 * 全部 7 节点完成后展示，汇编各节点的思考笔记。
 * 支持导出 Markdown。
 */

import React, { useCallback } from "react";
import { useWorldStore } from "../../store/worldStore";
import { useKnowledgeStore } from "../../store/knowledgeStore";
import { bookToMarkdown, downloadMarkdown } from "../../utils/exportNote";
import { PixelButton } from "../common/PixelButton";

interface MyBookPageProps {
  onClose: () => void;
}

export const MyBookPage: React.FC<MyBookPageProps> = ({ onClose }) => {
  const { world } = useWorldStore();
  const { getBookRecord, isBookReady } = useKnowledgeStore();

  const book = getBookRecord();
  const ready = world ? isBookReady(world) : false;

  const handleExportMarkdown = useCallback(() => {
    if (!book) return;
    const md = bookToMarkdown(book);
    downloadMarkdown("我的《人类简史》.md", md);
  }, [book]);

  if (!world || !ready || !book) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(26, 18, 38, 0.85)",
        }}
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: "#fce1b5",
            border: "4px solid #b56c27",
            boxShadow: "0 0 0 4px #eeb069, 0 8px 0 rgba(0,0,0,0.3)",
            padding: "28px 28px 24px 28px",
            maxWidth: 600,
            color: "#492310",
            fontFamily: "'Zpix', 'Press Start 2P', 'Microsoft YaHei', monospace",
            position: "relative",
          }}
        >
          <div style={{ fontSize: 20, marginBottom: 12 }}>📖 我的《人类简史》</div>
          <div style={{ fontSize: 15, lineHeight: 1.7 }}>
            你还没有完成所有节点的探索。
            <br />
            完成全部 7 个节点的原问回响后，这里会生成你的专属合集。
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <PixelButton onClick={onClose} variant="primary">关闭</PixelButton>
          </div>
        </div>
      </div>
    );
  }

  // 汇总关键词
  const allKeywords = new Set<string>();
  for (const node of book.nodes) {
    for (const kw of node.thinkingNote.keywords) {
      allKeywords.add(kw);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(26, 18, 38, 0.85)",
        overflow: "auto",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "#fce1b5",
          border: "4px solid #b56c27",
          boxShadow: "0 0 0 4px #eeb069, 0 8px 0 rgba(0,0,0,0.3)",
          padding: "32px 32px 28px 32px",
          maxWidth: 720,
          width: "90%",
          maxHeight: "85vh",
          overflowY: "auto",
          color: "#492310",
          fontFamily: "'Zpix', 'Press Start 2P', 'Microsoft YaHei', monospace",
          position: "relative",
        }}
      >
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: -18,
            right: -8,
            width: 36,
            height: 36,
            backgroundColor: "#f7a143",
            color: "#fff",
            border: "4px solid #492310",
            fontSize: 16,
            cursor: "pointer",
            boxShadow: "0 4px 0 rgba(0,0,0,0.2)",
          }}
        >
          ✕
        </button>

        {/* 标题 */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📖 我的《人类简史》</div>
          <div style={{ fontSize: 13, opacity: 0.7 }}>
            你的探索之旅 · {new Date(book.generatedAt).toLocaleDateString("zh-CN")}
          </div>
        </div>

        {/* 前言 */}
        <div
          style={{
            backgroundColor: "#fff7e6",
            border: "2px solid #da9100",
            padding: "14px 18px",
            fontSize: 14,
            lineHeight: 1.8,
            marginBottom: 16,
            whiteSpace: "pre-wrap",
          }}
        >
          {`这是你在 Knowledge World 中探索《人类简史》时留下的思考记录。\n你走过了 7 个知识节点，从认知革命到科学革命，在 What / How / Why / System 四个维度中层层深入。\n以下是你自己的回答和思考——它们不属于书本，只属于你。`}
        </div>

        {/* 目录 / 各章节 */}
        {book.nodes.map((node, i) => (
          <div
            key={node.nodeId}
            style={{
              marginBottom: 16,
              padding: "12px 16px",
              backgroundColor: "#fff7e6",
              border: "2px solid #b56c27",
            }}
          >
            <div style={{ fontSize: 16, fontWeight: "bold", marginBottom: 8 }}>
              第 {i + 1} 章 · {node.nodeName}
            </div>

            {/* 各层回答摘要 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                { label: "How", text: node.thinkingNote.howAnswer },
                { label: "Why", text: node.thinkingNote.whyAnswer },
                { label: "System", text: node.thinkingNote.systemAnswer },
                { label: "最终回答", text: node.thinkingNote.finalAnswer },
              ].map((s) => (
                <div key={s.label} style={{ display: "flex", gap: 8 }}>
                  <span
                    style={{
                      fontSize: 11,
                      color: "#b56c27",
                      fontWeight: "bold",
                      minWidth: 60,
                      flexShrink: 0,
                    }}
                  >
                    {s.label}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      lineHeight: 1.6,
                      color: "#492310",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {s.text}
                  </span>
                </div>
              ))}
            </div>

            {/* 关键词 */}
            {node.thinkingNote.keywords.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                {node.thinkingNote.keywords.map((kw) => (
                  <span
                    key={kw}
                    style={{
                      fontSize: 11,
                      color: "#fff",
                      backgroundColor: "#6b5b95",
                      padding: "1px 6px",
                      borderRadius: 6,
                    }}
                  >
                    {kw}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* 后记 */}
        <div
          style={{
            backgroundColor: "#dff0e4",
            border: "2px solid #5d9c3f",
            padding: "14px 18px",
            fontSize: 14,
            lineHeight: 1.8,
            marginBottom: 16,
            whiteSpace: "pre-wrap",
          }}
        >
          {allKeywords.size > 0
            ? `你在探索中提到了这些关键词：${[...allKeywords].join(" · ")}\n\n感谢你走完这段旅程。每一个字都是你自己的思考。`
            : "感谢你走完这段旅程。每一个字都是你自己的思考。"}
        </div>

        {/* 导出按钮 */}
        <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
          <PixelButton onClick={handleExportMarkdown} variant="primary">
            ⬇️ 导出 Markdown
          </PixelButton>
          <PixelButton onClick={onClose} variant="success">
            回到地图
          </PixelButton>
        </div>
      </div>
    </div>
  );
};

export default MyBookPage;
