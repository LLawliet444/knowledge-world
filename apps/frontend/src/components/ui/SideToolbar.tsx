/**
 * 右侧工具栏
 *
 * 从上到下：探索 / 笔记 / 观察 / 设置 / 深度切换 / BGM / 重置
 * 每个按钮：圆角矩形 + 图标 + 中文标签
 */

import React, { useCallback } from "react";
import { useWorldStore } from "../../store/worldStore";
import { useDialogStore } from "../../store/dialogStore";
import { useBgmStore } from "../../store/bgmStore";
import { LAYER_ORDER } from "../../constants/biome";
import { getDepthGateStatus } from "../../utils/depthGate";
import type { LayerType } from "../../types/world";

interface ToolItem {
  icon: string;
  label: string;
  onClick?: () => void;
  title?: string;
  danger?: boolean;
}

const ToolButton: React.FC<ToolItem> = ({ icon, label, onClick, title, danger }) => (
  <button
    onClick={onClick}
    title={title}
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 2,
      width: 56,
      height: 56,
      backgroundColor: "#fff8e6",
      border: "3px solid #1a1226",
      color: "#1a1226",
      boxShadow: "2px 2px 0 0 #1a1226",
      cursor: onClick ? "pointer" : "default",
      fontFamily: "'Zpix', 'Press Start 2P', monospace",
    }}
    className={onClick ? "hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_0_#1a1226] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_0_#1a1226]" : "opacity-50"}
  >
    <span style={{ fontSize: 18, lineHeight: 1 }}>{icon}</span>
    <span style={{ fontSize: 9, lineHeight: 1, marginTop: 2 }}>{label}</span>
  </button>
);

const DepthArrow: React.FC<{
  direction: "up" | "down";
  disabled: boolean;
  onClick: () => void;
}> = ({ direction, disabled, onClick }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: 56,
      height: 28,
      backgroundColor: disabled ? "#e8d5f7" : "#fff8e6",
      border: "2px solid #1a1226",
      color: disabled ? "rgba(58,31,10,0.4)" : "#1a1226",
      boxShadow: disabled ? "none" : "1px 1px 0 0 #1a1226",
      cursor: disabled ? "not-allowed" : "pointer",
      fontFamily: "'Zpix', 'Press Start 2P', monospace",
      fontSize: 12,
    }}
  >
    {direction === "up" ? "▲" : "▼"}
  </button>
);

export const SideToolbar: React.FC = () => {
  const { world, currentDepth, switchDepth, nodeProgress, resetProgress } = useWorldStore();
  const { close } = useDialogStore();
  const { isPlaying, pause, resume } = useBgmStore();

  const handleSwitch = useCallback(
    (depth: LayerType) => {
      if (depth === currentDepth) return;
      close();
      switchDepth(depth);
    },
    [currentDepth, close, switchDepth],
  );

  if (!world) return null;

  const idx = LAYER_ORDER.indexOf(currentDepth);
  const prev = idx > 0 ? LAYER_ORDER[idx - 1] : null;
  const next = idx < LAYER_ORDER.length - 1 ? LAYER_ORDER[idx + 1] : null;
  const prevLocked = prev
    ? getDepthGateStatus(prev, currentDepth, nodeProgress, world) === "locked"
    : true;
  const nextLocked = next
    ? getDepthGateStatus(next, currentDepth, nodeProgress, world) === "locked"
    : true;

  return (
    <div
      style={{
        position: "absolute",
        right: 16,
        bottom: 16,
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <ToolButton icon="🧭" label="探索" title="探索" />
        <ToolButton icon="📒" label="笔记" title="笔记" />
        <ToolButton icon="🔍" label="观察" title="观察" />
        <ToolButton icon="⚙️" label="设置" title="设置" />
      </div>

      <div
        style={{
          width: 56,
          height: 2,
          backgroundColor: "#1a1226",
          margin: "4px auto",
        }}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
        <DepthArrow
          direction="up"
          disabled={!prev || prevLocked}
          onClick={() => prev && !prevLocked && handleSwitch(prev)}
        />
        <DepthArrow
          direction="down"
          disabled={!next || nextLocked}
          onClick={() => next && !nextLocked && handleSwitch(next)}
        />
      </div>

      <div
        style={{
          width: 56,
          height: 2,
          backgroundColor: "#1a1226",
          margin: "4px auto",
        }}
      />

      <ToolButton
        icon={isPlaying ? "🔊" : "🔇"}
        label="BGM"
        title={isPlaying ? "关闭 BGM" : "播放 BGM"}
        onClick={() => (isPlaying ? pause() : resume())}
      />
      <ToolButton
        icon="↺"
        label="重置"
        title="重置探索进度"
        onClick={() => {
          if (!world) return;
          if (confirm("确定要重置所有探索进度吗？这将清空缓存并回到认知层起点。")) {
            close();
            resetProgress(world);
          }
        }}
      />
    </div>
  );
};

export default SideToolbar;
