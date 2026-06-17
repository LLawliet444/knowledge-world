/**
 * HUD：迷雾消散百分比 + 深度切换器入口
 */

import React, { useCallback } from "react";
import { useWorldStore } from "../../store/worldStore";
import { useDialogStore } from "../../store/dialogStore";
import { getDepthGateStatus } from "../../utils/depthGate";
import { LAYER_ORDER } from "../../constants/biome";
import type { LayerType } from "../../types/world";

const DEPTH_ICONS: Record<LayerType, string> = {
  what: "🌱",
  how: "⚙️",
  why: "🔍",
  system: "🌌",
};

const DEPTH_LABELS: Record<LayerType, string> = {
  what: "认知层",
  how: "理解层",
  why: "因果层",
  system: "系统层",
};

export const HUD: React.FC = () => {
  const { world, currentDepth, fogPercentage, switchDepth, nodeProgress } = useWorldStore();
  const { close } = useDialogStore();

  const handleSwitch = useCallback(
    (depth: LayerType) => {
      if (depth === currentDepth) return;
      close(); // 关闭对话框
      switchDepth(depth);
    },
    [currentDepth, close, switchDepth],
  );

  if (!world) return null;

  return (
    <>
      {/* 右上角：迷雾消散百分比 */}
      <div className="absolute right-4 top-4 z-50 flex flex-col items-end gap-1">
        <div
          className="rounded border-4 border-[#1a1226] bg-[#fff8e6]/90 px-3 py-1 shadow-[3px_3px_0_0_#1a1226]"
        >
          <div className="font-pixel text-[10px] text-[#3a1f0a]/70 mb-1">认知迷雾已消散</div>
          <div className="font-pixel text-xl text-[#6b5b95] leading-none">
            {fogPercentage}%
          </div>
        </div>
        {/* 进度条 */}
        <div
          className="h-3 w-48 rounded-full border-2 border-[#1a1226] bg-[#e8d5f7] overflow-hidden"
        >
          <div
            className="h-full rounded-full bg-[#6b5b95] transition-all duration-700"
            style={{ width: `${fogPercentage}%` }}
          />
        </div>
      </div>

      {/* 左上角：世界标题 */}
      <div className="absolute left-4 top-4 z-50">
        <div className="rounded border-4 border-[#1a1226] bg-[#fff8e6]/90 px-3 py-1 shadow-[3px_3px_0_0_#1a1226]">
          <div className="font-pixel text-xs text-[#1a1226] leading-tight">
            {world.title}
          </div>
          <div className="font-pixel text-[10px] text-[#3a1f0a]/60 mt-1">
            {DEPTH_LABELS[currentDepth]}
          </div>
        </div>
      </div>

      {/* 右下角：深度切换器（简洁上下箭头 */}
      <div className="absolute right-4 bottom-4 z-50 flex flex-col items-center gap-0.5">
        <div className="font-pixel text-[10px] text-[#3a1f0a]/70 mb-0.5">深度切换</div>

        {/* 向上按钮 */}
        <button
          onClick={() => {
            const idx = LAYER_ORDER.indexOf(currentDepth);
            if (idx > 0) handleSwitch(LAYER_ORDER[idx - 1]);
          }}
          disabled={(() => {
            const idx = LAYER_ORDER.indexOf(currentDepth);
            if (idx <= 0) return true;
            const prev = LAYER_ORDER[idx - 1];
            const prevStatus = getDepthGateStatus(prev, currentDepth, nodeProgress, world);
            return prevStatus === "locked";
          })()}
          className="flex items-center justify-center w-10 h-8 rounded border-4 border-[#1a1226] bg-[#fff8e6] text-[#1a1226] shadow-[2px_2px_0_0_#1a1226] hover:shadow-[3px_3px_0_0_#1a1226] hover:-translate-x-[1px] hover:-translate-y-[1px] disabled:bg-[#e8d5f7] disabled:text-[#3a1f0a]/40 disabled:cursor-not-allowed disabled:hover:shadow-[2px_2px_0_0_#1a1226] disabled:hover:translate-x-0 disabled:hover:translate-y-0 active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_0_#1a1226]">
          <span className="font-pixel text-sm">▲</span>
        </button>

        {/* 当前层标签 */}
        <div className="flex items-center gap-1 px-2 py-0.5 rounded border-4 border-[#1a1226] bg-[#f5b642] text-[#1a1226] shadow-[2px_2px_0_0_#1a1226] font-pixel text-[10px]">
          <span className="text-xs">{DEPTH_ICONS[currentDepth]}</span>
          <span>{DEPTH_LABELS[currentDepth]}</span>
        </div>

        {/* 向下按钮 */}
        <button
          onClick={() => {
            const idx = LAYER_ORDER.indexOf(currentDepth);
            if (idx < LAYER_ORDER.length - 1) handleSwitch(LAYER_ORDER[idx + 1]);
          }}
          disabled={(() => {
            const idx = LAYER_ORDER.indexOf(currentDepth);
            if (idx >= LAYER_ORDER.length - 1) return true;
            const next = LAYER_ORDER[idx + 1];
            const nextStatus = getDepthGateStatus(next, currentDepth, nodeProgress, world);
            return nextStatus === "locked";
          })()}
          className="flex items-center justify-center w-10 h-8 rounded border-4 border-[#1a1226] bg-[#fff8e6] text-[#1a1226] shadow-[2px_2px_0_0_#1a1226] hover:shadow-[3px_3px_0_0_#1a1226] hover:-translate-x-[1px] hover:-translate-y-[1px] disabled:bg-[#e8d5f7] disabled:text-[#3a1f0a]/40 disabled:cursor-not-allowed disabled:hover:shadow-[2px_2px_0_0_#1a1226] disabled:hover:translate-x-0 disabled:hover:translate-y-0 active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_0_#1a1226]">
          <span className="font-pixel text-sm">▼</span>
        </button>
      </div>
    </>
  );
};

export default HUD;
