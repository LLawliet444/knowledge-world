import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import type { World, WorldNode, NodeState } from "../../types/world";
import { NODE_STYLES, getNodeIcon } from "../../constants/node";

interface WorldMapProps {
  world: World;
  onNodeClick: (node: WorldNode) => void;
  nodeStates: Record<string, NodeState>;
}

/**
 * Pixel-RPG style world map.
 *
 * The map uses `world_map_sapiens.jpg` (or whatever the world specifies) as a
 * full-bleed background. Nodes are absolutely positioned percentage badges on
 * top, and a pixel-art character sprite walks between them when the player
 * clicks a reachable node.
 *
 * Walk animation:
 *   - Choose the walk spritesheet that matches the dominant movement axis
 *     (left/right/up/down 4-frame spritesheets)
 *   - Use GSAP to tween the character's percentage position
 *   - While walking, cycle through the 4 frames with setInterval (~120ms/frame)
 *   - On arrival, stop the walk animation and open the dialog
 */
export const WorldMap: React.FC<WorldMapProps> = ({
  world,
  onNodeClick,
  nodeStates,
}) => {
  const characterRef = useRef<HTMLDivElement | null>(null);

  // Position is stored as percentages; rendered as left:x% / top:y%.
  const [charPos, setCharPos] = useState<{ x: number; y: number }>(() => ({
    x: world.startPosition.x,
    y: world.startPosition.y,
  }));

  // A GSAP-friendly object: we tween this and mirror the values to state.
  const posProxyRef = useRef<{ x: number; y: number }>({
    x: world.startPosition.x,
    y: world.startPosition.y,
  });

  const [currentNodeId, setCurrentNodeId] = useState<string>(world.startNodeId);
  const [facing, setFacing] = useState<"idle" | "left" | "right" | "up" | "down">("idle");
  const [walkFrame, setWalkFrame] = useState(0);
  const [isWalking, setIsWalking] = useState(false);

  const allNodes = useMemo(
    () => world.layers.flatMap((l) => l.nodes),
    [world],
  );

  // Build the set of reachable node ids:
  //   - The current node is always reachable (opens instantly)
  //   - Neighbors of any mastered/transfer node are reachable
  //   - Neighbors of the current node are reachable
  const reachableIds = useMemo(() => {
    const ids = new Set<string>([currentNodeId]);
    for (const n of allNodes) {
      if (nodeStates[n.id] === "mastered" || nodeStates[n.id] === "transfer") {
        ids.add(n.id);
        for (const neighbor of n.neighbors) ids.add(neighbor);
      }
    }
    const current = allNodes.find((n) => n.id === currentNodeId);
    if (current) {
      for (const neighbor of current.neighbors) ids.add(neighbor);
    }
    return ids;
  }, [allNodes, currentNodeId, nodeStates]);

  // React to world switching — reset character position to the new start.
  useEffect(() => {
    posProxyRef.current.x = world.startPosition.x;
    posProxyRef.current.y = world.startPosition.y;
    setCharPos({ x: world.startPosition.x, y: world.startPosition.y });
    setCurrentNodeId(world.startNodeId);
  }, [world.worldId, world.startPosition.x, world.startPosition.y]);

  // Frame cycling while the character is walking.
  useEffect(() => {
    if (!isWalking) return;
    let frame = 0;
    let cancelled = false;
    const id = window.setInterval(() => {
      if (cancelled) return;
      frame = (frame + 1) % 4;
      setWalkFrame(frame);
    }, 130);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [isWalking]);

  const handleNodeClick = useCallback(
    (node: WorldNode) => {
      if (isWalking) return;

      const from = posProxyRef.current;
      const to = {
        x: (node.x as number) ?? 50,
        y: (node.y as number) ?? 50,
      };
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Already on this node — open dialog directly.
      if (distance < 1.5) {
        onNodeClick(node);
        return;
      }

      const horizontalDominant = Math.abs(dx) > Math.abs(dy);
      const direction: "left" | "right" | "up" | "down" = horizontalDominant
        ? dx > 0 ? "right" : "left"
        : dy > 0 ? "down" : "up";
      setFacing(direction);
      setIsWalking(true);

      const duration = Math.max(0.8, distance / 15);

      gsap.to(posProxyRef.current, {
        x: to.x,
        y: to.y,
        duration,
        ease: "none",
        onUpdate: () => {
          setCharPos({ x: posProxyRef.current.x, y: posProxyRef.current.y });
        },
        onComplete: () => {
          setIsWalking(false);
          setFacing("idle");
          setCurrentNodeId(node.id);
          onNodeClick(node);
        },
      });
    },
    [isWalking, onNodeClick],
  );

  const spriteSrc =
    facing === "left"
      ? "/characters/scholar_apprentice_sprite_walk_left_4f_clean.png"
      : facing === "right"
      ? "/characters/scholar_apprentice_sprite_walk_right_4f_clean.png"
      : facing === "up"
      ? "/characters/scholar_apprentice_sprite_walk_up_4f_clean.png"
      : "/characters/scholar_apprentice_sprite_walk_down_4f_clean.png";

  return (
    <div
      className="relative w-full overflow-hidden rounded border-4 border-[#3a1f0a] shadow-[6px_6px_0_0_#1a1226]"
      style={{
        aspectRatio: "16 / 9",
        backgroundImage: `url(${world.mapImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: "#f5d8a0",
        imageRendering: "auto",
      }}
    >
      {/* Map-level banner: the world title */}
      <div className="absolute left-4 top-3 z-[5] rounded border-4 border-[#1a1226] bg-[#fff8e6]/90 px-3 py-1 font-pixel text-xs text-[#1a1226] shadow-[3px_3px_0_0_#1a1226]">
        {world.title}
      </div>

      {/* Nodes */}
      {allNodes.map((node) => {
        const state: NodeState =
          nodeStates[node.id] ??
          (node.id === world.startNodeId ? "visited" : "unexplored");
        const style = NODE_STYLES[state];
        const isReachable = reachableIds.has(node.id);
        const isCurrent = node.id === currentNodeId;

        const iconSrc =
          state === "unexplored"
            ? "/nodes/node_unknown.png"
            : getNodeIcon(node.iconType);

        const haloColor =
          state === "mastered"
            ? "rgba(120, 217, 139, 0.85)"
            : state === "transfer"
            ? "rgba(142, 108, 255, 0.85)"
            : state === "learning"
            ? "rgba(245, 182, 66, 0.7)"
            : state === "visited"
            ? "rgba(255, 236, 166, 0.6)"
            : "rgba(120, 90, 40, 0.55)";

        return (
          <button
            key={node.id}
            onClick={() => handleNodeClick(node)}
            disabled={!isReachable || isWalking}
            className={[
              "absolute z-[6] flex flex-col items-center -translate-x-1/2 -translate-y-1/2",
              isReachable ? "cursor-pointer" : "cursor-not-allowed",
              "transition-transform",
              isReachable && !isWalking ? "hover:scale-110" : "",
            ].join(" ")}
            style={{
              left: `${node.x ?? 50}%`,
              top: `${node.y ?? 50}%`,
            }}
          >
            {/* Glow halo */}
            <span
              aria-hidden
              className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                background: `radial-gradient(circle, ${haloColor} 0%, transparent 70%)`,
              }}
            />
            {/* Node icon tile */}
            <span
              className={[
                "relative flex items-center justify-center rounded border-4 border-[#1a1226] bg-[#fff8e6] shadow-[3px_3px_0_0_#1a1226]",
                isCurrent ? "ring-4 ring-[#f5b642]" : "",
              ].join(" ")}
              style={{ width: 44, height: 44 }}
            >
              <img
                src={iconSrc}
                alt={node.name}
                draggable={false}
                style={{ width: 32, height: 32, imageRendering: "pixelated" }}
              />
            </span>
            {/* Node label */}
            <span
              className={[
                "mt-1 whitespace-nowrap rounded border-2 border-[#1a1226] bg-[#fff8e6] px-2 py-[2px] font-pixel text-[10px] text-[#1a1226]",
              ].join(" ")}
            >
              {node.name}
            </span>
          </button>
        );
      })}

      {/* Character sprite */}
      <div
        ref={characterRef}
        aria-hidden
        className="absolute z-[8] pointer-events-none"
        style={{
          left: `${charPos.x}%`,
          top: `${charPos.y}%`,
          transform: "translate(-50%, -85%)",
          width: 72,
          height: 72,
        }}
      >
        <span
          aria-hidden
          className="absolute left-1/2 top-[92%] h-3 w-12 -translate-x-1/2 rounded-full bg-black/35"
        />
        <div
          className="h-full w-full"
          style={{
            backgroundImage: `url(${spriteSrc})`,
            backgroundRepeat: "no-repeat",
            backgroundSize: "400% 100%",
            backgroundPosition: `${walkFrame * (100 / 3)}% 0`,
            imageRendering: "pixelated",
          }}
        />
      </div>
    </div>
  );
};

export default WorldMap;
