/**
 * 主地图组件（PixiJS v7 + @pixi/react v7）
 *
 * 使用 Stage 作为根组件，内部通过 Container 放置地图元素。
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Stage, Container } from "@pixi/react";
import gsap from "gsap";

import { useWorldStore } from "../../store/worldStore";
import { useDialogStore } from "../../store/dialogStore";
import { useUiStore } from "../../store/uiStore";
import { getVisibleNodes } from "../../utils/depthGate";
import { preloadPixiTextures } from "../../utils/preloadTextures";
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

  const posProxy = useRef({ x: scholarPos.x, y: scholarPos.y });

  // 预加载 PixiJS 纹理（只需加载一次）
  useEffect(() => {
    if (!world) return;
    const avatarPaths = world.nodes.map((n) => n.gateNpc.avatar);
    const sceneKeys = world.nodes
      .map((n) => n.introScene.visualHint)
      .filter(Boolean);
    preloadPixiTextures(avatarPaths, sceneKeys);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 世界切换时重置学者位置
  useEffect(() => {
    if (!world) return;
    const start = world.nodes.find((n) => n.id === world.startNodeId);
    if (start) {
      posProxy.current = { x: start.position.x, y: start.position.y };
      moveScholar(start.position.x, start.position.y);
      setCurrentNodeId(world.startNodeId);
    }
  }, [world?.worldId]);

  // 同步 posProxy
  useEffect(() => {
    posProxy.current = { x: scholarPos.x, y: scholarPos.y };
  }, [scholarPos]);

  const visibleIds = world
    ? getVisibleNodes(currentDepth, world, nodeProgress)
    : new Set<string>();

  const lockedNodes = world
    ? world.nodes
        .filter((n) => !visibleIds.has(n.id))
        .map((n) => ({ x: n.position.x, y: n.position.y }))
    : [];

  const handleNodeClick = useCallback(
    (node: WorldNode) => {
      if (isWalking) return;

      const fromX = posProxy.current.x;
      const fromY = posProxy.current.y;
      const dx = node.position.x - fromX;
      const dy = node.position.y - fromY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const horizontalDominant = Math.abs(dx) > Math.abs(dy);
      const dir: typeof scholarDir = horizontalDominant
        ? dx > 0 ? "right" : "left"
        : dy > 0 ? "down" : "up";

      setScholarDir(dir);
      setIsWalking(true);
      setCurrentNodeId(node.id);

      const duration = Math.max(0.8, dist / 10);

      gsap.to(posProxy.current, {
        x: node.position.x,
        y: node.position.y,
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

  if (!world) return null;

  return (
    <Stage width={MAP_WIDTH} height={MAP_HEIGHT} background={0xf4d37a}>
      <Container scale={1}>
        <DepthBackground
          currentDepth={currentDepth}
          targetDepth={switchingTargetDepth}
          isSwitching={isSwitchingDepth}
          onSwitchComplete={handleDepthSwitchComplete}
        />

        <FogLayer
          lockedNodes={lockedNodes}
          revealingNode={revealingPos ?? undefined}
          onRevealComplete={() => setRevealingPos(null)}
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

        {isPlayingScene && activeSceneKey && activeNode && (
          <SmallScene
            sceneKey={activeSceneKey}
            sceneText={activeNode.introScene.sceneText}
            durationSec={activeNode.introScene.durationSec}
            onComplete={handleSceneComplete}
          />
        )}
      </Container>
    </Stage>
  );
};

export default WorldMap;
