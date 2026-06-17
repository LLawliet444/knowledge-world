/**
 * What 层翻卡阅读 + 轻量确认
 *
 * PRD §4.2.5：三张卡（定义/例子/连接）逐张展示
 * 每张卡首次展示后 2 秒内不能点"下一张"
 * 三张读完 → 轻量确认（选一张最关键）→ What 层完成
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { WhatCard } from "../../types/world";

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

const CARD_COLORS = {
  definition: "#e8b34f",
  example: "#5d9c3f",
  bridge: "#6b5b95",
} as const;

const CARD_ICONS = {
  definition: "📖",
  example: "🌍",
  bridge: "🔗",
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
  const [showHint, setShowHint] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 每张卡延迟 2 秒才允许点"下一张"
  useEffect(() => {
    setCanAdvance(false);
    setShowHint(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setCanAdvance(true);
      setShowHint(true);
    }, 2000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
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
    // 延迟触发完成，让用户看到选择
    setTimeout(() => {
      onComplete(type);
    }, 600);
  }, [onComplete]);

  const card = cards[currentIdx];

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* 老学者开场白 */}
      {currentIdx === 0 && (
        <div className="font-body text-lg text-[#3a1f0a] leading-snug italic">
          {mentorIntro}
        </div>
      )}

      {/* 进度指示 */}
      <div className="flex gap-2">
        {cards.map((_, i) => (
          <div
            key={i}
            className={[
              "h-2 flex-1 rounded-full border-2 border-[#3a1f0a] transition-all duration-300",
              i < currentIdx ? "bg-[#78d98b]" : i === currentIdx ? "bg-[#f5b642]" : "bg-[#e8d5f7]",
            ].join(" ")}
          />
        ))}
      </div>

      {/* 翻卡区域 */}
      {!showConfirm ? (
        <div className="flex flex-col gap-3">
          {/* 卡片 */}
          <div
            className="relative rounded-lg border-4 border-[#3a1f0a] bg-[#fff8e6] p-5 shadow-[4px_4px_0_0_#3a1f0a] min-h-[120px]"
            style={{ borderTopColor: CARD_COLORS[card.type] }}
          >
            {/* 类型标签 */}
            <div
              className="absolute -top-4 left-4 px-3 py-1 rounded border-2 border-[#3a1f0a] bg-[#fff8e6] font-pixel text-xs text-[#1a1226]"
              style={{ borderColor: CARD_COLORS[card.type], color: CARD_COLORS[card.type] }}
            >
              {CARD_ICONS[card.type]} {CARD_LABELS[card.type]}
            </div>
            <p className="font-body text-xl text-[#1a1226] leading-relaxed pt-2">
              {card.text}
            </p>
          </div>

          {/* 操作行 */}
          <div className="flex items-center justify-between">
            {/* 提示 */}
            <div className="font-pixel text-xs text-[#3a1f0a]/60">
              {showHint && !canAdvance ? "读完这张卡，再继续探索…" : ""}
            </div>

            <div className="flex gap-2">
              {/* 上一张 */}
              {currentIdx > 0 && (
                <button
                  className="px-4 py-2 rounded border-4 border-[#3a1f0a] bg-[#fff8e6] font-pixel text-xs text-[#1a1226] shadow-[3px_3px_0_0_#3a1f0a] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_0_#3a1f0a] transition-transform disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0"
                  onClick={() => setCurrentIdx((i) => i - 1)}
                >
                  ← 上一张
                </button>
              )}
              {/* 下一张 */}
              <button
                className="px-4 py-2 rounded border-4 border-[#3a1f0a] bg-[#f5d8a0] font-pixel text-xs text-[#1a1226] shadow-[3px_3px_0_0_#3a1f0a] hover:-translate-x-[-1px] hover:-translate-y-[-1px] hover:shadow-[4px_4px_0_0_#3a1f0a] transition-transform disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0"
                onClick={handleNext}
                disabled={!canAdvance}
              >
                {currentIdx < cards.length - 1 ? "下一张 →" : "选一张关键卡 →"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* 轻量确认：三选一 */
        <div className="flex flex-col gap-3">
          <div className="font-body text-lg text-[#3a1f0a] leading-snug">
            进入下一层前，选一张你觉得最关键的卡。
          </div>
          <div className="grid grid-cols-3 gap-3">
            {cards.map((c) => (
              <button
                key={c.type}
                onClick={() => handleSelect(c.type)}
                className={[
                  "flex flex-col items-center gap-2 p-4 rounded-lg border-4 border-[#3a1f0a] bg-[#fff8e6] shadow-[3px_3px_0_0_#3a1f0a] hover:-translate-y-1 transition-transform min-h-[80px]",
                  selectedChoice === c.type
                    ? "ring-4 ring-[#f5b642] scale-105"
                    : "",
                ].join(" ")}
              >
                <span className="text-3xl">{CARD_ICONS[c.type]}</span>
                <span
                  className="font-pixel text-xs text-[#1a1226]"
                  style={{ color: CARD_COLORS[c.type] }}
                >
                  {CARD_LABELS[c.type]}
                </span>
              </button>
            ))}
          </div>
          {selectedChoice && (
            <div className="text-center font-body text-[#3a1f0a]/70 text-sm">
              已选择「{CARD_LABELS[selectedChoice as keyof typeof CARD_LABELS]}」——正在收入图鉴…
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WhatCards;
