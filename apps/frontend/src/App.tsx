import React, { useCallback, useMemo, useState } from "react";
import { getDefaultWorld, PREBUILT_WORLDS } from "./data";
import type { NodeState, World, WorldNode } from "./types/world";
import { WorldMap } from "./components/map/WorldMap";
import { DialogBox } from "./components/dialog/DialogBox";
import { PixelButton } from "./components/common/PixelButton";

/**
 * Knowledge World — main application shell.
 *
 * State here is intentionally small:
 *  - Which world is currently displayed
 *  - The map of node states (unexplored / visited / learning / mastered / transfer)
 *  - Which node (if any) is open in the dialog
 *
 * Everything else is delegated to components or the imperative MapRenderer.
 */
const App: React.FC = () => {
  const [world, setWorld] = useState<World>(() => getDefaultWorld());
  const [nodeStates, setNodeStates] = useState<Record<string, NodeState>>({});
  const [activeNode, setActiveNode] = useState<WorldNode | null>(null);
  const [showWorldPicker, setShowWorldPicker] = useState<boolean>(false);

  // Pre-set start node to "visited" so the entry point is visually open.
  const effectiveNodeStates = useMemo(() => {
    const merged = { ...nodeStates };
    if (!merged[world.startNodeId]) {
      merged[world.startNodeId] = "visited";
    }
    return merged;
  }, [nodeStates, world.startNodeId]);

  const handleNodeClick = useCallback((node: WorldNode) => {
    setActiveNode(node);
  }, []);

  const handleDialogClose = useCallback(() => {
    setActiveNode(null);
  }, []);

  const handleStateChange = useCallback((nodeId: string, state: NodeState) => {
    setNodeStates((prev) => ({ ...prev, [nodeId]: state }));
  }, []);

  const handleSwitchWorld = useCallback((next: World) => {
    setWorld(next);
    setNodeStates({});
    setActiveNode(null);
    setShowWorldPicker(false);
  }, []);

  return (
    <div className="min-h-screen bg-[#fff8e6] text-[#1a1226]">
      <div className="mx-auto max-w-[1400px] px-4 py-6">
        <header className="flex flex-col gap-4 border-b-4 border-[#1a1226] pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="font-pixel text-sm text-[#6b5b95]">Knowledge World · 认知探索系统</div>
            <h1 className="font-pixel text-2xl md:text-3xl mt-2">{world.title}</h1>
            <p className="mt-2 font-body text-lg max-w-2xl">{world.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <PixelButton
              variant="secondary"
              onClick={() => setShowWorldPicker((v) => !v)}
            >
              切换世界
            </PixelButton>
            <PixelButton
              onClick={() =>
                window.open("https://github.com/", "_blank", "noopener,noreferrer")
              }
            >
              关于
            </PixelButton>
          </div>
        </header>

        {showWorldPicker && (
          <section className="mt-4 rounded border-4 border-[#1a1226] bg-[#fff8e6] p-4 shadow-[4px_4px_0_0_#1a1226]">
            <div className="font-pixel text-sm mb-3">选择一个知识世界</div>
            <div className="grid gap-3 md:grid-cols-3">
              {PREBUILT_WORLDS.map((w) => {
                const isActive = w.worldId === world.worldId;
                return (
                  <button
                    key={w.worldId}
                    onClick={() => handleSwitchWorld(w)}
                    className={[
                      "rounded border-4 border-[#1a1226] p-4 text-left font-body transition-transform hover:-translate-y-[2px] shadow-[4px_4px_0_0_#1a1226]",
                      isActive ? "bg-[#f5b642]" : "bg-white",
                    ].join(" ")}
                  >
                    <div className="font-pixel text-sm mb-1">{w.title}</div>
                    <div className="text-sm text-[#6b5b95]">{w.subtitle}</div>
                    <div className="text-xs text-[#6b5b95] mt-2">
                      共 {w.layers.reduce((sum, l) => sum + l.nodes.length, 0)} 个节点
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <main className="mt-6">
          <WorldMap
            world={world}
            onNodeClick={handleNodeClick}
            nodeStates={effectiveNodeStates}
          />
          <p className="mt-3 text-sm text-[#6b5b95] font-body">
            点击地图上的节点来开始一次苏格拉底式对话。完成理解后节点会亮起，周围的迷雾会消散。
          </p>
        </main>

        <DialogBox
          node={activeNode}
          onClose={handleDialogClose}
          onStateChange={handleStateChange}
        />

        <footer className="mt-10 border-t-4 border-[#1a1226] pt-4 text-xs text-[#6b5b95] font-body">
          © {new Date().getFullYear()} Knowledge World — 不是学习知识，而是解锁认知地图。
        </footer>
      </div>
    </div>
  );
};

export default App;
