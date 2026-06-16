import React, { useEffect, useRef, useState } from "react";
import type { World, WorldNode, NodeState } from "../../types/world";
import { MapRenderer } from "../../engine/MapRenderer";

interface WorldMapProps {
  world: World;
  onNodeClick: (node: WorldNode) => void;
  /** Map of node id → current state. Used to drive visual state. */
  nodeStates: Record<string, NodeState>;
}

/**
 * React wrapper around the imperative MapRenderer class.
 *
 * Responsibilities:
 *  - Owns a <canvas> element that fills the available space
 *  - Forwards world and node state updates to the renderer
 *  - Handles responsive resize by observing ResizeObserver
 */
export const WorldMap: React.FC<WorldMapProps> = ({
  world,
  onNodeClick,
  nodeStates,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<MapRenderer | null>(null);
  const [ready, setReady] = useState(false);

  // Initialize once per mount.
  useEffect(() => {
    if (!canvasRef.current) return;
    const renderer = new MapRenderer({ onNodeClick });
    rendererRef.current = renderer;

    // Set initial size based on the container.
    const container = containerRef.current;
    if (container) {
      const w = container.clientWidth;
      const h = Math.max(540, Math.min(900, Math.round(w * 9 / 16)));
      canvasRef.current.width = w;
      canvasRef.current.height = h;
      renderer.resize(w, h);
    }

    renderer
      .setCanvas(canvasRef.current)
      .then(() => {
        renderer.updateWorld(world);
        renderer.updateNodeStates(nodeStates);
        renderer.start();
        setReady(true);
      })
      .catch(() => {
        // Even if preloading partially fails, try to render with what we have.
        renderer.updateWorld(world);
        renderer.updateNodeStates(nodeStates);
        renderer.start();
        setReady(true);
      });

    // Handle responsive resizes.
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const w = Math.floor(entry.contentRect.width);
      const h = Math.max(540, Math.min(900, Math.round(w * 9 / 16)));
      if (canvasRef.current && rendererRef.current) {
        canvasRef.current.width = w;
        canvasRef.current.height = h;
        rendererRef.current.resize(w, h);
      }
    });
    if (container) observer.observe(container);

    return () => {
      observer.disconnect();
      rendererRef.current?.stop();
      rendererRef.current = null;
    };
    // Intentionally empty deps: only run on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Feed world changes into the renderer (e.g., user switches worlds).
  useEffect(() => {
    const r = rendererRef.current;
    if (!r) return;
    r.updateWorld(world);
  }, [world]);

  // Push node-state updates (e.g., after an AI diagnosis).
  useEffect(() => {
    const r = rendererRef.current;
    if (!r) return;
    r.updateNodeStates(nodeStates);
  }, [nodeStates]);

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded border-4 border-[#1a1226] bg-[#fff8e6] shadow-[6px_6px_0_0_#1a1226]"
    >
      <canvas
        ref={canvasRef}
        className="block w-full"
        style={{ imageRendering: "pixelated" }}
        aria-label={`知识地图：${world.title}`}
      />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#fff8e6]/80 font-pixel text-sm text-[#1a1226]">
          正在为你绘制地图…
        </div>
      )}
    </div>
  );
};

export default WorldMap;
