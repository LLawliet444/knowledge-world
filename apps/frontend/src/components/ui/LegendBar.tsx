/**
 * 底部图例条
 *
 * 显示 5 项图例：当前所在 / 可前往 / 已通关 / 未通关 / 主线索
 * 居中贴底
 */

import React from "react";

const ITEMS: { icon: string; label: string; color: string }[] = [
  { icon: "📍", label: "当前所在", color: "#fff8e6" },
  { icon: "→", label: "可前往", color: "#fff8e6" },
  { icon: "✅", label: "已通关", color: "#dff0e4" },
  { icon: "🔒", label: "未通关", color: "#e8d5f7" },
  { icon: "◆", label: "主线索", color: "#fff8e6" },
];

export const LegendBar: React.FC = () => {
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        bottom: 16,
        transform: "translateX(-50%)",
        zIndex: 40,
        display: "flex",
        alignItems: "center",
        gap: 16,
        backgroundColor: "rgba(26, 18, 38, 0.65)",
        border: "2px solid #1a1226",
        padding: "6px 16px",
        boxShadow: "2px 2px 0 rgba(0,0,0,0.4)",
        pointerEvents: "none",
      }}
    >
      {ITEMS.map((item, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontFamily: "'Zpix', 'Press Start 2P', monospace",
            fontSize: 10,
            color: "#fff8e6",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 14,
              height: 14,
              backgroundColor: item.color,
              border: "1px solid #1a1226",
              fontSize: 9,
            }}
          >
            {item.icon}
          </span>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
};

export default LegendBar;
