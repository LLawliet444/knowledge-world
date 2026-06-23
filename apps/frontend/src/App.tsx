import React, { useEffect } from "react";
import { useWorldStore } from "./store/worldStore";
import { sapiensWorld } from "./data/sapiens";
import { WorldMap } from "./components/map/WorldMap";
import { DialogBox } from "./components/dialog/DialogBox";
import { HUD } from "./components/ui/HUD";
import { SideToolbar } from "./components/ui/SideToolbar";
import { LegendBar } from "./components/ui/LegendBar";

export const App: React.FC = () => {
  const { world, loadWorld, sessionId, restoreSession } = useWorldStore();

  useEffect(() => {
    if (!world) {
      loadWorld(sapiensWorld);
    }
  }, []);

  // 世界加载后，若有 sessionId 则从后端恢复进度（刷新页面场景）
  useEffect(() => {
    if (world && sessionId) {
      restoreSession();
    }
  }, [world, sessionId, restoreSession]);

  if (!world) return null;

  return (
    <div
      className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-[#0a0a1a]"
    >
      {/* PixiJS 地图（全屏，含节点标签浮层） */}
      <WorldMap />

      {/* 顶部 HUD */}
      <HUD />

      {/* 右侧工具栏 */}
      <SideToolbar />

      {/* 底部图例 */}
      <LegendBar />

      {/* 对话框浮层 */}
      <DialogBox />
    </div>
  );
};

export default App;
