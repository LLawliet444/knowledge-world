/**
 * 节点 Sprite（PixiJS v7）
 *
 * 渲染：节点主题图标 + hover/点击交互
 */

import { Container, Sprite } from "@pixi/react";
import * as PIXI from "pixi.js";
import React, { useCallback, useState } from "react";
import { NODE_VISUAL } from "../../constants/node";
import type { DepthState, WorldNode } from "../../types/world";

interface NodeSpriteProps {
  node: WorldNode;
  state: DepthState;
  isCurrent: boolean;
  nodeClear: boolean;
  finalQuestion: "locked" | "available" | "completed";
  scholarPos: { x: number; y: number };
  pos: { x: number; y: number };
  onClick?: (node: WorldNode) => void;
}

export const NodeSprite: React.FC<NodeSpriteProps> = ({
  node,
  state,
  isCurrent,
  nodeClear,
  finalQuestion,
  scholarPos,
  pos,
  onClick,
}) => {
  const visual = NODE_VISUAL[state];
  const [hover, setHover] = useState(false);

  const interactive = visual.cursor === "pointer";
  const eventMode = interactive ? "static" : "none";
  const cursor = interactive
    ? "pointer"
    : visual.cursor === "not-allowed"
      ? "not-allowed"
      : "default";

  const handleClick = useCallback(() => {
    if (!interactive || !onClick) return;
    onClick(node);
  }, [interactive, onClick, node]);

  const handlePointerOver = useCallback(() => {
    if (interactive) setHover(true);
  }, [interactive]);
  const handlePointerOut = useCallback(() => {
    if (interactive) setHover(false);
  }, [interactive]);

  // finalQuestion 完成后显示原始 icon，否则显示 NPC iconNpc
  const isNpcMode = finalQuestion !== "completed";
  const displayIcon = isNpcMode ? node.iconNpc : node.icon;
  const nodeTexture = PIXI.utils.TextureCache[displayIcon];

  // NPC 图标和抽象图标用不同缩放
  const npcScale = 18 / 128;
  const iconScale = isNpcMode
    ? (hover ? npcScale * 1.2 : npcScale)
    : 12 / 128;

  // NPC 面朝学者：原图均面朝左，学者在节点右侧时镜像翻转
  const flipX = isNpcMode && scholarPos.x > pos.x ? -1 : 1;

  return (
    <Container
      x={pos.x}
      y={pos.y}
      alpha={visual.dimmed ? (hover ? 0.7 : 0.4) : 1}
      eventMode={eventMode}
      cursor={cursor}
      onclick={handleClick}
      onpointerover={handlePointerOver}
      onpointerout={handlePointerOut}
    >
      {/* 节点图标 */}
      {nodeTexture && (
        <Sprite
          texture={nodeTexture}
          anchor={0.5}
          scale={{ x: flipX * iconScale, y: iconScale }}
        />
      )}
    </Container>
  );
};

export default NodeSprite;
