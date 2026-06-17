/**
 * 主地图组件（PixiJS v7 + @pixi/react v7）
 *
 * 使用 Stage 作为根组件，内部通过 Container 放置地图元素。
 */

import { Container, Graphics, Stage } from "@pixi/react";
import gsap from "gsap";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useDialogStore } from "../../store/dialogStore";
import { useUiStore } from "../../store/uiStore";
import { useWorldStore } from "../../store/worldStore";
import { getVisibleNodes } from "../../utils/depthGate";
import { preloadPixiTextures } from "../../utils/preloadTextures";

import { DepthBackground } from "./DepthBackground";
import { FogLayer } from "./FogLayer";
import NodeSprite from "./NodeSprite";
import ScholarSprite from "./ScholarSprite";
import { SmallScene } from "./SmallScene";

import type { WorldNode } from "../../types/world";

const MAP_WIDTH = 1920;
const MAP_HEIGHT = 1080;

export const WorldMap: React.FC<{ onNodeClick?: (node: WorldNode) => void }> = ({
  onNodeClick,
}) => {
  const {
    world,
    currentDepth,
    isSwitchingDepth,
    switchingTargetDepth,
    nodeProgress,
    scholarPos,
    moveScholar,
    finishDepthSwitch,
  } = useWorldStore();

  const { open } = useDialogStore();
  const {
    isPlayingScene,
    activeSceneKey,
    sceneCloseCallback,
    endScene,
  } = useUiStore();

  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [isWalking, setIsWalking] = useState(false);
  const [scholarDir, setScholarDir] = useState<"idle" | "left" | "right" | "up" | "down">("idle");
  const [revealingPos, setRevealingPos] = useState<{ x: number; y: number } | null>(null);
  const [activeNode, setActiveNode] = useState<WorldNode | null>(null);

  // —— cover 模式：等比缩放铺满整个窗口 ——
  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight });
  const stageScale = Math.max(viewport.w / MAP_WIDTH, viewport.h / MAP_HEIGHT);
  const scaledWidth = MAP_WIDTH * stageScale;
  const scaledHeight = MAP_HEIGHT * stageScale;

  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const posProxy = useRef({ x: scholarPos.x, y: scholarPos.y });

  // 预加载 PixiJS 纹理（只需加载一次）
  useEffect(() => {
    if (!world) return;
    const avatarPaths = world.nodes.map((n) => n.gateNpc.avatar);
    const iconPaths = world.nodes.map((n) => n.icon);
    const sceneKeys = world.nodes
      .map((n) => n.introScene.visualHint)
      .filter(Boolean);
    preloadPixiTextures(avatarPaths, iconPaths, sceneKeys);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 世界切换时重置学者位置
  useEffect(() => {
    if (!world) return;
    posProxy.current.x = world.scholarStart.x;
    posProxy.current.y = world.scholarStart.y;
    moveScholar(world.scholarStart.x, world.scholarStart.y);
    setCurrentNodeId(world.startNodeId);
  }, [world?.worldId]);

  const visibleIds = world
    ? getVisibleNodes(currentDepth, world, nodeProgress)
    : new Set<string>();

  // —— 浓雾挖洞节点：当前深度下 state != "locked" 的节点 ——
  const fogClearNodes = world
    ? world.nodes
        .filter((n) => {
          const progress = nodeProgress[n.id];
          const depthState = progress?.[currentDepth] ?? "locked";
          return depthState !== "locked";
        })
        .map((n) => ({ x: n.position.x, y: n.position.y }))
    : [];

  const lockedNodes = world
    ? world.nodes
        .filter((n) => {
          const progress = nodeProgress[n.id];
          const depthState = progress?.[currentDepth] ?? "locked";
          return depthState === "locked";
        })
        .map((n) => ({ x: n.position.x, y: n.position.y }))
    : [];

  const handleNodeClick = useCallback(
    (node: WorldNode) => {
      if (isWalking) return;

      const fromX = posProxy.current.x;
      const fromY = posProxy.current.y;

      // 目标位置：节点左下方（学者站在节点旁边，面朝节点）
      const targetX = node.position.x - 100;
      const targetY = node.position.y + 30;
      const dx = targetX - fromX;
      const dy = targetY - fromY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const horizontalDominant = Math.abs(dx) > Math.abs(dy);
      const dir: typeof scholarDir = horizontalDominant
        ? dx > 0 ? "right" : "left"
        : dy > 0 ? "down" : "up";

      setScholarDir(dir);
      setIsWalking(true);
      setCurrentNodeId(node.id);

      // 速度：每 150 像素约 1 秒，距离 400 像素约 2.7 秒
      const duration = Math.max(0.5, dist / 150);

      gsap.to(posProxy.current, {
        x: targetX,
        y: targetY,
        duration,
        ease: "none",
        onUpdate: () => {
          moveScholar(posProxy.current.x, posProxy.current.y);
        },
        onComplete: () => {
          setIsWalking(false);
          setScholarDir("idle");
          setActiveNode(node);

          const progress = nodeProgress[node.id];
          const shouldPlayScene =
            currentDepth === "what" &&
            progress?.introScene === "unseen" &&
            !!node.introScene.visualHint;

          if (shouldPlayScene) {
            useUiStore.getState().playScene(node.introScene.visualHint, () => {
              useWorldStore.getState().markIntroSceneSeen(node.id);
              open(node, currentDepth);
              onNodeClick?.(node);
            });
          } else {
            open(node, currentDepth);
            onNodeClick?.(node);
          }
        },
      });
    },
    [isWalking, nodeProgress, currentDepth, open, moveScholar, onNodeClick],
  );

  const handleDepthSwitchComplete = useCallback(
    (depth: typeof currentDepth) => {
      finishDepthSwitch();
    },
    [finishDepthSwitch],
  );

  const handleSceneComplete = useCallback(() => {
    endScene();
    sceneCloseCallback?.();
  }, [endScene, sceneCloseCallback]);

  // 计算路径链（按 nextDiscoveryId 把节点串起来）
  const pathChain = useMemo(() => {
    if (!world) return [] as WorldNode[];
    const byId = new Map(world.nodes.map((n) => [n.id, n]));
    const start = world.nodes.find((n) => n.id === world.startNodeId) ?? world.nodes[0];
    const result: WorldNode[] = [];
    let current: WorldNode | undefined = start;
    const visited = new Set<string>();
    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      result.push(current);
      current = current.nextDiscoveryId
        ? byId.get(current.nextDiscoveryId)
        : undefined;
    }
    // 如果链很短，兜底：未访问的节点按 neighbors 连接
    if (result.length < world.nodes.length) {
      for (const n of world.nodes) {
        if (!visited.has(n.id)) result.push(n);
      }
    }
    return result;
  }, [world]);

  // 把相邻节点连起来（包含拐点以形成曲折路径）
  const pathSegments = useMemo(() => {
    const segs: { x1: number; y1: number; x2: number; y2: number; revealed: boolean }[] = [];
    for (let i = 0; i < pathChain.length - 1; i++) {
      const a = pathChain[i];
      const b = pathChain[i + 1];
      if (!a || !b) continue;

      // 在两点之间加一个小"拐点"，让路径像曲线路径，避免看起来全是直线
      // 取中点 + 轻微垂直偏移
      const midX = (a.position.x + b.position.x) / 2;
      const midY = (a.position.y + b.position.y) / 2;
      const dx = b.position.x - a.position.x;
      const dy = b.position.y - a.position.y;
      // 垂直方向（与 dx,dy 成 90°）的小偏移
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const offset = (i % 2 === 0 ? 1 : -1) * Math.min(80, len * 0.15);
      const bendX = midX + (-dy / len) * offset;
      const bendY = midY + (dx / len) * offset;

      // 判断这段路径是否已"解锁"（前一个节点的某个状态）
      const progress = nodeProgress[a.id];
      const depthState = progress?.[currentDepth] ?? "locked";
      const revealed = depthState !== "locked";

      segs.push({ x1: a.position.x, y1: a.position.y, x2: bendX, y2: bendY, revealed });
      segs.push({ x1: bendX, y1: bendY, x2: b.position.x, y2: b.position.y, revealed });
    }
    return segs;
  }, [pathChain, nodeProgress, currentDepth]);

  if (!world) return null;

  return (
    <>
      <div
        className="world-map-container"
        style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}
      >
      {/* PixiJS Stage，用 CSS transform 等比缩放铺满整个窗口（cover 模式） */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: MAP_WIDTH,
          height: MAP_HEIGHT,
          transform: `translate(-50%, -50%) scale(${stageScale})`,
          transformOrigin: "center center",
        }}
      >
        <Stage
          width={MAP_WIDTH}
          height={MAP_HEIGHT}
          className="world-map-canvas"
          options={{ background: 0xf4d37a }}
        >
          <Container scale={1}>
            <DepthBackground
              currentDepth={currentDepth}
              targetDepth={switchingTargetDepth}
              isSwitching={isSwitchingDepth}
              onSwitchComplete={handleDepthSwitchComplete}
            />

            {/* 路径线：像素风的曲折虚线连接各节点 */}
            <Graphics
              draw={(g) => {
                g.clear();
                for (const seg of pathSegments) {
                  g.lineStyle({
                    width: 4,
                    color: seg.revealed ? 0x8b5a2b : 0x6b4f3a,
                    alpha: seg.revealed ? 0.55 : 0.25,
                  });
                  // 画主路径
                  g.moveTo(seg.x1, seg.y1);
                  g.lineTo(seg.x2, seg.y2);
                }

                // 在路径上画像素"小脚印"节点间
                for (const seg of pathSegments) {
                  if (!seg.revealed) continue;
                  const steps = 4;
                  for (let s = 1; s < steps; s++) {
                    const t = s / steps;
                    const px = seg.x1 + (seg.x2 - seg.x1) * t;
                    const py = seg.y1 + (seg.y2 - seg.y1) * t;
                    g.lineStyle({ width: 0, color: 0x000000, alpha: 0 });
                    g.beginFill(0xa87640, 0.6);
                    g.drawRect(px - 3, py - 3, 6, 6);
                    g.endFill();
                  }
                }
              }}
            />

            {world.nodes.map((node) => {
              const progress = nodeProgress[node.id];
              const depthState = progress?.[currentDepth] ?? "locked";
              return (
                <NodeSprite
                  key={node.id}
                  node={node}
                  state={depthState}
                  isCurrent={node.id === currentNodeId}
                  nodeClear={progress?.nodeClear ?? false}
                  onClick={handleNodeClick}
                />
              );
            })}

            <ScholarSprite
              x={scholarPos.x}
              y={scholarPos.y}
              direction={scholarDir}
              isWalking={isWalking}
            />
          </Container>
        </Stage>

        {/* 浓雾层：同样 cover 模式等比缩放，与 Stage 对齐 */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: MAP_WIDTH,
            height: MAP_HEIGHT,
            pointerEvents: "none",
          }}
        >
          <FogLayer
            visibleNodes={fogClearNodes}
            lockedNodes={lockedNodes}
            scholarPos={scholarPos}
            revealingNode={revealingPos ?? undefined}
            onRevealComplete={() => setRevealingPos(null)}
          />
        </div>
      </div>
    </div>

    {/* 第一幕过场动画（DOM 层，完全覆盖在地图之上） */}
    {isPlayingScene && activeSceneKey && activeNode && (
      <SmallScene
        sceneKey={activeSceneKey}
        sceneText={activeNode.introScene.sceneText}
        durationSec={activeNode.introScene.durationSec}
        onComplete={handleSceneComplete}
      />
    )}
    </>
  );
};

export default WorldMap;
