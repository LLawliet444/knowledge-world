/**
 * What 层翻卡组件 —— 星露谷像素风
 *
 * 设计参考 index.html sd-board / sd-btn：
 *   - 卡片容器：羊皮纸底 + 双层木边框 + 金色内框
 *   - 卡片类型标签：突出的像素缎带（定义/例子/连接 三色）
 *   - 底部按钮：橙色主按钮风格
 */

import React, { useCallback, useEffect, useState } from "react";
import type { WhatCard } from "../../types/world";
import { PixelButton } from "../common/PixelButton";

interface WhatCardsProps {
  cards: WhatCard[];
  onComplete: (choice: "definition" | "example" | "bridge") => void;
  mentorIntro: string;
}

const CARD_LABELS = {
  definition: "定义",
  example: "例子",
  bridge: "连接",
} as const;

// 每类卡用一种颜色：按星露谷游戏物品风格
const CARD_COLORS = {
  definition: {
    bg: "#e8b34f",       // 金棕色（矿物类）
    border: "#8a5a1a",
    text: "#ffffff",
  },
  example: {
    bg: "#5d9c3f",       // 草绿色（植物类）
    border: "#3a6526",
    text: "#ffffff",
  },
  bridge: {
    bg: "#6b5b95",       // 紫水晶色（魔法类）
    border: "#3f3558",
    text: "#ffffff",
  },
} as const;

export const WhatCards: React.FC<WhatCardsProps> = ({
  cards,
  onComplete,
  mentorIntro,
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [canAdvance, setCanAdvance] = useState(false);

  useEffect(() => {
    setCanAdvance(false);
    const t = setTimeout(() => setCanAdvance(true), 2000);
    return () => clearTimeout(t);
  }, [currentIdx]);

  const handleNext = useCallback(() => {
    if (!canAdvance) return;
    if (currentIdx < cards.length - 1) {
      setCurrentIdx((i) => i + 1);
    } else {
      setShowConfirm(true);
    }
  }, [canAdvance, currentIdx, cards.length]);

  const handleSelect = useCallback((type: WhatCard["type"]) => {
    setSelectedChoice(type);
    setTimeout(() => onComplete(type), 600);
  }, [onComplete]);

  const card = cards[currentIdx];

  // 像素按钮工具函数（避免重复写 inline-style）
  const pixelBtnBase = (
    bg: string,
    border: string,
    shadowDark: string,
    shadowLight: string,
  ): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "6px 14px",
    backgroundColor: bg,
    color: "#ffffff",
    border: `4px solid ${border}`,
    fontFamily: "'Zpix', 'Press Start 2P', 'Microsoft YaHei', monospace",
    textShadow: `2px 2px 0px ${border}`,
    boxShadow: `inset -3px -3px 0px ${shadowDark}, inset 3px 3px 0px ${shadowLight}`,
    cursor: "pointer",
    transition: "transform 0.05s",
    fontSize: 14,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
      {/* 老学者开场白 */}
      {currentIdx === 0 && (
        <div
          style={{
            fontSize: 14,
            color: "#492310",
            lineHeight: 1.5,
            fontStyle: "italic",
          }}
        >
          {mentorIntro}
        </div>
      )}

      {/* 进度指示 —— 5 个像素点 */}
      <div style={{ display: "flex", gap: 4 }}>
        {cards.map((_, i) => (
          <div
            key={i}
            style={{
              height: 8,
              flex: 1,
              border: `2px solid #492310`,
              backgroundColor:
                i < currentIdx ? "#78d98b" : i === currentIdx ? "#d67a29" : "#eeb069",
            }}
          />
        ))}
      </div>

      {/* 翻卡区域 / 确认区域 */}
      {!showConfirm ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* 卡片主体 —— sd-board 风格 */}
          <div
            style={{
              position: "relative",
              backgroundColor: "#fff7e6",
              border: "4px solid #b56c27",
              boxShadow: "0 0 0 4px #eeb069",
              padding: "20px 16px 14px 16px",
              minHeight: 90,
            }}
          >
            {/* 金色内框 */}
            <div
              style={{
                position: "absolute",
                top: 4,
                left: 4,
                right: 4,
                bottom: 4,
                border: "2px solid #da9100",
                pointerEvents: "none",
              }}
            />

            {/* 类型缎带标签 —— 突出卡片顶部 */}
            <div
              style={{
                position: "absolute",
                top: -18,
                left: 16,
                backgroundColor: CARD_COLORS[card.type].bg,
                color: CARD_COLORS[card.type].text,
                padding: "4px 12px",
                border: `4px solid ${CARD_COLORS[card.type].border}`,
                fontFamily: "'Zpix', 'Press Start 2P', 'Microsoft YaHei', monospace",
                fontSize: 14,
                textShadow: `2px 2px 0px ${CARD_COLORS[card.type].border}`,
                boxShadow: `0 3px 0 rgba(0,0,0,0.2)`,
              }}
            >
              {card.type === "definition" ? "📖" : card.type === "example" ? "🌍" : "🔗"}{" "}
              {CARD_LABELS[card.type]}
            </div>

            {/* 卡片正文 */}
            <div
              style={{
                fontSize: 16,
                color: "#492310",
                lineHeight: 1.6,
                fontFamily: "'Zpix', 'Press Start 2P', 'Microsoft YaHei', monospace",
              }}
            >
              {card.text}
            </div>
          </div>

          {/* 操作按钮行 */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 12, color: "#492310", opacity: 0.7 }}>
              {showConfirm === false && !canAdvance ? "读完这张卡…" : ""}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              {currentIdx > 0 && (
                <PixelButton variant="secondary" onClick={() => setCurrentIdx((i) => i - 1)}>
                  ← 上一张
                </PixelButton>
              )}
              <PixelButton onClick={handleNext} disabled={!canAdvance}>
                {currentIdx < cards.length - 1 ? "下一张 →" : "选一张关键卡 →"}
              </PixelButton>
            </div>
          </div>
        </div>
      ) : (
        /* —— 轻量确认：三选一 —— */
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 14, color: "#492310", lineHeight: 1.5 }}>
            进入下一层前，选一张你觉得最关键的卡。
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {cards.map((c) => {
              const color = CARD_COLORS[c.type];
              const isSelected = selectedChoice === c.type;
              return (
                <button
                  key={c.type}
                  onClick={() => handleSelect(c.type)}
                  style={{
                    ...pixelBtnBase(color.bg, color.border, color.border, color.text),
                    padding: "12px 8px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    minHeight: 80,
                    ...(isSelected
                      ? {
                          outline: "4px solid #da9100",
                          outlineOffset: 2,
                          transform: "translateY(-4px)",
                        }
                      : {}),
                  }}
                  onMouseDown={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform = "translateY(4px)";
                  }}
                  onMouseUp={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform = isSelected
                      ? "translateY(-4px)"
                      : "translateY(0)";
                  }}
                  onMouseOut={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform = isSelected
                      ? "translateY(-4px)"
                      : "translateY(0)";
                  }}
                >
                  <span style={{ fontSize: 24 }}>
                    {c.type === "definition" ? "📖" : c.type === "example" ? "🌍" : "🔗"}
                  </span>
                  <span style={{ fontSize: 14 }}>{CARD_LABELS[c.type]}</span>
                </button>
              );
            })}
          </div>

          {selectedChoice && (
            <div style={{ textAlign: "center", fontSize: 12, color: "#492310", opacity: 0.7 }}>
              已选择「{CARD_LABELS[selectedChoice as keyof typeof CARD_LABELS]}」—— 正在收入图鉴…
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WhatCards;
