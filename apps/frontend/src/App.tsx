import React, { useEffect } from "react";
import { useWorldStore } from "./store/worldStore";
import { sapiensWorld } from "./data/sapiens";
import { WorldMap } from "./components/map/WorldMap";
import { DialogBox } from "./components/dialog/DialogBox";
import { HUD } from "./components/ui/HUD";

export const App: React.FC = () => {
  const { world, loadWorld } = useWorldStore();

  useEffect(() => {
    if (!world) {
      loadWorld(sapiensWorld);
    }
  }, []);

  if (!world) return null;

  return (
    <div
      className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-[#0a0a1a]"
    >
      {/* PixiJS 地图（全屏） */}
      <WorldMap />

      {/* HUD 叠加层 */}
      <HUD />

      {/* 对话框浮层 */}
      <DialogBox />
    </div>
  );
};

export default App;
