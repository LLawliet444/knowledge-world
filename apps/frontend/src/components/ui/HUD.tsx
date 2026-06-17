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
      <div className="absolute right-4 top-4 z-20 flex flex-col items-end gap-1">
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
      <div className="absolute left-4 top-4 z-20">
        <div className="rounded border-4 border-[#1a1226] bg-[#fff8e6]/90 px-3 py-1 shadow-[3px_3px_0_0_#1a1226]">
          <div className="font-pixel text-xs text-[#1a1226] leading-tight">
            {world.title}
          </div>
          <div className="font-pixel text-[10px] text-[#3a1f0a]/60 mt-1">
            {DEPTH_LABELS[currentDepth]}
          </div>
        </div>
      </div>

      {/* 右上角：深度切换器入口 */}
      <div className="absolute right-4 bottom-4 z-20 flex flex-col gap-1 items-end">
        <div className="font-pixel text-[10px] text-[#3a1f0a]/70 mb-1">深度切换</div>
        <div className="flex flex-col gap-1">
          {LAYER_ORDER.map((depth) => {
            const status = getDepthGateStatus(depth, currentDepth, nodeProgress, world);
            const isActive = depth === currentDepth;
            const isLocked = status === "locked";
            const isCompleted = status === "completed";

            return (
              <button
                key={depth}
                onClick={() => handleSwitch(depth)}
                disabled={isActive || isLocked}
                className={[
                  "flex items-center gap-2 px-3 py-1.5 rounded border-4 border-[#1a1226] shadow-[2px_2px_0_0_#1a1226] transition-transform",
                  "font-pixel text-xs",
                  isActive
                    ? "bg-[#f5b642] text-[#1a1226] cursor-default"
                    : isLocked
                    ? "bg-[#e8d5f7] text-[#3a1f0a]/40 cursor-not-allowed"
                    : isCompleted
                    ? "bg-[#78d98b] text-[#1a1226] hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[3px_3px_0_0_#1a1226]"
                    : "bg-[#fff8e6] text-[#1a1226] hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[3px_3px_0_0_#1a1226]",
                ].join(" ")}
              >
                <span className="text-base">{DEPTH_ICONS[depth]}</span>
                <span>{DEPTH_LABELS[depth]}</span>
                {isLocked && <span className="text-xs opacity-60">🔒</span>}
                {isCompleted && <span className="text-xs">✓</span>}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default HUD;
