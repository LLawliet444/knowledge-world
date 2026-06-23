/**
 * HUD：左上世界标题 + 右上迷雾消散百分比
 */

import React, { useCallback } from "react";
import { useWorldStore } from "../../store/worldStore";
import { useDialogStore } from "../../store/dialogStore";
import { LAYER_ORDER } from "../../constants/biome";
import { getDepthGateStatus } from "../../utils/depthGate";
import type { LayerType } from "../../types/world";

const DEPTH_LABELS: Record<LayerType, string> = {
  what: "认知层",
  how: "理解层",
  why: "因果层",
  system: "系统层",
};

export const HUD: React.FC = () => {
  const { world, currentDepth, fogPercentage, nodeProgress, switchDepth } = useWorldStore();
  const { close } = useDialogStore();

  const handleCycleDepth = useCallback(() => {
    if (!world) return;
    // 找下一个可用的深度
    for (let i = 1; i <= LAYER_ORDER.length; i++) {
      const candidate = LAYER_ORDER[(LAYER_ORDER.indexOf(currentDepth) + i) % LAYER_ORDER.length];
      const status = getDepthGateStatus(candidate, currentDepth, nodeProgress, world);
      if (status !== "locked") {
        close();
        switchDepth(candidate);
        return;
      }
    }
  }, [world, currentDepth, nodeProgress, close, switchDepth]);

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

      {/* 左上角：世界标题 + 深度 chip */}
      <div className="absolute left-4 top-4 z-50">
        <div className="rounded border-4 border-[#1a1226] bg-[#fff8e6]/95 px-3 py-2 shadow-[3px_3px_0_0_#1a1226]">
          <div className="font-pixel text-base text-[#1a1226] leading-none mb-2">
            {world.title}
          </div>
          <button
            onClick={handleCycleDepth}
            className="font-pixel text-[10px] text-[#3a1f0a] px-2 py-0.5 border-2 border-[#1a1226] bg-[#e8d5f7] hover:bg-[#d8c5e7] active:translate-x-[1px] active:translate-y-[1px]"
            title="点击切换到下一个可用深度"
          >
            🌱 {DEPTH_LABELS[currentDepth]}
          </button>
        </div>
      </div>
    </>
  );
};

export default HUD;
