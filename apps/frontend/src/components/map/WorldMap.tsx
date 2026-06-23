/**
 * 主地图组件（PixiJS v7 + @pixi/react v7）
 *
 * 使用 Stage 作为根组件，内部通过 Container 放置地图元素。
 */

import { Container, Graphics, Stage } from "@pixi/react";
import gsap from "gsap";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useDialogStore } from "../../store/dialogStore";
import { useWorldStore } from "../../store/worldStore";
import { useBgmStore } from "../../store/bgmStore";
import { getVisibleNodes } from "../../utils/depthGate";
import { preloadPixiTextures } from "../../utils/preloadTextures";
import { NodeLabelLayer } from "./NodeLabelLayer";
import { GlowingPath } from "./GlowingPath";

import { DepthBackground } from "./DepthBackground";
import { DepthTransitionVideo, getTransitionVideoUrl } from "./DepthTransitionVideo";
import { FogLayer } from "./FogLayer";
import NodeSprite from "./NodeSprite";
import ScholarSprite from "./ScholarSprite";

import ScenePlayer, { NODE_SCENE_MAP } from "../scene/ScenePlayer";
import IntroGuide from "../scene/IntroGuide";
import NodeSpeechBubble from "./NodeSpeechBubble";

import type { WorldNode, DialogueLine, WhatScroll } from "../../types/world";

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
    switchDepth,
    finishDepthSwitch,
  } = useWorldStore();

  const { open } = useDialogStore();

  // 层切换过渡视频：切换期间 currentDepth 仍是来源层、switchingTargetDepth 是目标层。
  // 仅当 from→to 存在对应视频时启用视频过渡（what→how / how→why / why→system）。
  const transitionVideoUrl =
    isSwitchingDepth && switchingTargetDepth
      ? getTransitionVideoUrl(currentDepth, switchingTargetDepth)
      : undefined;
  const isVideoTransition = !!transitionVideoUrl;

  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [isWalking, setIsWalking] = useState(false);
  const [scholarDir, setScholarDir] = useState<"idle" | "left" | "right" | "up" | "down">("idle");
  const [revealingPos, setRevealingPos] = useState<{ x: number; y: number } | null>(null);
  const [activeNode, setActiveNode] = useState<WorldNode | null>(null);
  const [activeSceneIndex, setActiveSceneIndex] = useState<number | null>(null);
  const [introGuideData, setIntroGuideData] = useState<{
    dialogue: DialogueLine[];
    scrolls: WhatScroll[];
    wrapUp: DialogueLine[];
  } | null>(null);
  // 气泡 NPC：What 层完成后点击 NPC 时显示，非终问状态
  const [bubbleNode, setBubbleNode] = useState<WorldNode | null>(null);

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

  // scholarPos 变化时（如 restoreSession 恢复到当前节点旁）同步 posProxy，
  // 否则点击节点时 gsap 会从旧的 posProxy 位置开始走
  useEffect(() => {
    posProxy.current.x = scholarPos.x;
    posProxy.current.y = scholarPos.y;
  }, [scholarPos.x, scholarPos.y]);

  // 当前深度的节点坐标辅助函数
  const nodePos = (n: WorldNode) => n.positions[currentDepth];

  // 预加载 PixiJS 纹理（只需加载一次）
  useEffect(() => {
    if (!world) return;
    const avatarPaths = world.nodes.map((n) => n.gateNpc.avatar);
    const iconPaths = world.nodes.flatMap((n) => [n.icon, n.iconNpc]);
    const sceneKeys = world.nodes
      .map((n) => n.introScene.visualHint)
      .filter(Boolean);
    preloadPixiTextures(avatarPaths, iconPaths, sceneKeys);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 世界切换时重置学者位置
  useEffect(() => {
    if (!world) return;
    posProxy.current.x = world.scholarStartByDepth[currentDepth].x;
    posProxy.current.y = world.scholarStartByDepth[currentDepth].y;
    moveScholar(world.scholarStartByDepth[currentDepth].x, world.scholarStartByDepth[currentDepth].y);
    setCurrentNodeId(world.startNodeId);
  }, [world?.worldId]);

  // —— BGM：当前深度变化时播放对应曲目 ——
  useEffect(() => {
    if (!world) return;
    useBgmStore.getState().playFor(currentDepth);
  }, [currentDepth, world?.worldId]);

  // 气泡 NPC 与当前深度联动：切换深度时关闭气泡
  useEffect(() => {
    setBubbleNode(null);
  }, [currentDepth]);

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
        .map((n) => ({ x: nodePos(n).x, y: nodePos(n).y }))
    : [];

  const lockedNodes = world
    ? world.nodes
        .filter((n) => {
          const progress = nodeProgress[n.id];
          const depthState = progress?.[currentDepth] ?? "locked";
          return depthState === "locked";
        })
        .map((n) => ({ x: nodePos(n).x, y: nodePos(n).y }))
    : [];

  const handleNodeClick = useCallback(
    (node: WorldNode) => {
      if (isWalking) return;

      const fromX = posProxy.current.x;
      const fromY = posProxy.current.y;

      // 目标位置：节点左下方（学者站在节点旁边，面朝节点）
      const targetX = nodePos(node).x - 100;
      const targetY = nodePos(node).y + 30;
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
            !!NODE_SCENE_MAP[node.id];

          if (shouldPlayScene) {
            setActiveSceneIndex(NODE_SCENE_MAP[node.id]);
          } else if (
            currentDepth === "what" &&
            progress?.what === "completed" &&
            (progress?.finalQuestion ?? "locked") === "locked"
          ) {
            // What 已完成、终问尚未解锁 → NPC 头顶冒泡（显示终问），不弹对话框
            setBubbleNode(node);
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
    (_depth: typeof currentDepth) => {
      // 视频过渡时由 DepthTransitionVideo 负责调 finishDepthSwitch，
      // 这里（DepthBackground 的溶解回调）不重复触发，避免提前结束视频。
      if (isVideoTransition) return;
      finishDepthSwitch();
    },
    [isVideoTransition, finishDepthSwitch],
  );

  const handleSceneComplete = useCallback(() => {
    if (!activeNode) return;
    useWorldStore.getState().markIntroSceneSeen(activeNode.id);

    const prompts = activeNode.mentorPrompts;
    const hasScrolls = prompts?.whatScrolls && prompts.whatScrolls.length > 0;
    if (hasScrolls) {
      setIntroGuideData({
        dialogue: prompts.whatDialogue ?? [],
        scrolls: prompts.whatScrolls!,
        wrapUp: prompts.whatWrapUp ?? [],
      });
    } else {
      // 向后兼容：无卷轴数据则直接开对话框
      open(activeNode, currentDepth);
      onNodeClick?.(activeNode);
    }
    setActiveSceneIndex(null);
  }, [activeNode, currentDepth, open, onNodeClick]);

  const handleIntroGuideComplete = useCallback(
    (_choice: "definition" | "example" | "bridge") => {
      if (!activeNode || !world) return;
      setIntroGuideData(null);
      const store = useWorldStore.getState();
      store.updateNodeDepthState(activeNode.id, "what", "completed");
      // 解锁当前节点在理解层的迷雾，并自动切换到理解层
      store.updateNodeDepthState(activeNode.id, "how", "available");
      switchDepth("how");
    },
    [activeNode, world, switchDepth],
  );

  const handleIntroGuideSkip = useCallback(() => {
    if (!activeNode) return;
    setIntroGuideData(null);
    open(activeNode, currentDepth);
    onNodeClick?.(activeNode);
  }, [activeNode, currentDepth, open, onNodeClick]);

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

      const midX = (nodePos(a).x + nodePos(b).x) / 2;
      const midY = (nodePos(a).y + nodePos(b).y) / 2;
      const dx = nodePos(b).x - nodePos(a).x;
      const dy = nodePos(b).y - nodePos(a).y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const offset = (i % 2 === 0 ? 1 : -1) * Math.min(80, len * 0.15);
      const bendX = midX + (-dy / len) * offset;
      const bendY = midY + (dx / len) * offset;

      const progress = nodeProgress[a.id];
      const depthState = progress?.[currentDepth] ?? "locked";
      const revealed = depthState !== "locked";

      segs.push({ x1: nodePos(a).x, y1: nodePos(a).y, x2: bendX, y2: bendY, revealed });
      segs.push({ x1: bendX, y1: bendY, x2: nodePos(b).x, y2: nodePos(b).y, revealed });
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

            {/* 发光路径：多层 BlurFilter 叠加 + 流动光点 */}
            <GlowingPath segments={pathSegments} />

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
                  finalQuestion={progress?.finalQuestion ?? "locked"}
                  scholarPos={scholarPos}
                  pos={nodePos(node)}
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

        {/* 节点标签层（HTML 浮层，跟随 stage 一起 transform 缩放） */}
        <NodeLabelLayer />

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

        {/* NPC 头顶气泡层（What 已完成但终问未解锁时） */}
        {bubbleNode && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: MAP_WIDTH,
              height: MAP_HEIGHT,
              zIndex: 10,
            }}
          >
            <NodeSpeechBubble
              node={bubbleNode}
              posX={nodePos(bubbleNode).x}
              posY={nodePos(bubbleNode).y}
              onClose={() => setBubbleNode(null)}
            />
          </div>
        )}
      </div>
    </div>

    {/* 过场动画播放器 */}
    {activeSceneIndex !== null && activeNode && (
      <ScenePlayer
        sceneIndex={activeSceneIndex}
        onComplete={handleSceneComplete}
      />
    )}

    {/* 引导对话 + 卷轴 + 收尾 */}
    {introGuideData && activeNode && (
      <IntroGuide
        dialogue={introGuideData.dialogue}
        scrolls={introGuideData.scrolls}
        wrapUp={introGuideData.wrapUp}
        onComplete={handleIntroGuideComplete}
        onSkip={handleIntroGuideSkip}
      />
    )}

    {/* 层切换过渡视频：全屏播放，播完后进入下一层地图 */}
    {isVideoTransition && switchingTargetDepth && (
      <DepthTransitionVideo
        fromDepth={currentDepth}
        toDepth={switchingTargetDepth}
        onComplete={finishDepthSwitch}
      />
    )}
    </>
  );
};

export default WorldMap;
