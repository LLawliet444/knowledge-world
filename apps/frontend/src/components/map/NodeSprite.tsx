/**
 * 节点 Sprite（PixiJS v7）
 *
 * 渲染：节点主题图标 + 谜题标题 + 状态光晕 + hover/点击交互
 */

import { Container, Sprite, Text } from "@pixi/react";
import * as PIXI from "pixi.js";
import React, { useCallback, useState } from "react";
import { NODE_CLEAR_HALO_COLOR, NODE_VISUAL } from "../../constants/node";
import type { DepthState, WorldNode } from "../../types/world";

interface NodeSpriteProps {
  node: WorldNode;
  state: DepthState;
  isCurrent: boolean;
  nodeClear: boolean;
  onClick?: (node: WorldNode) => void;
}

export const NodeSprite: React.FC<NodeSpriteProps> = ({
  node,
  state,
  isCurrent,
  nodeClear,
  onClick,
}) => {
  const visual = NODE_VISUAL[state];
  const haloColor = nodeClear
    ? NODE_CLEAR_HALO_COLOR
    : parseInt(visual.haloColor.replace("#", ""), 16);
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

  const nodeTexture = PIXI.utils.TextureCache[node.icon];
  const haloTexture = PIXI.utils.TextureCache["/ui/halo_available.png"];

  // 基础尺寸：~36px（128 原图缩到 0.28）
  const iconBaseScale = 12 / 128;
  const iconScale = hover
    ? iconBaseScale * 1.35
    : isCurrent
      ? iconBaseScale * 1.15
      : iconBaseScale;

  // 光晕：hover 更大更亮；当前节点金色呼吸
  const haloBaseScale = iconBaseScale * 2.0;
  const haloScale = hover
    ? haloBaseScale * 1.35
    : isCurrent
      ? haloBaseScale * 1.2
      : haloBaseScale;

  const haloAlphaVal = hover
    ? Math.max(visual.haloAlpha, 0.85)
    : isCurrent
      ? 0.8
      : visual.haloAlpha;

  const haloTint = hover ? 0xfff0c0 : isCurrent ? 0xf5b642 : haloColor;

  return (
    <Container
      x={node.position.x}
      y={node.position.y}
      alpha={visual.dimmed ? (hover ? 0.7 : 0.4) : 1}
      eventMode={eventMode}
      cursor={cursor}
      onclick={handleClick}
      onpointerover={handlePointerOver}
      onpointerout={handlePointerOut}
    >
      {/* 外层光晕 */}
      {haloTexture && (
        <Sprite
          texture={haloTexture}
          tint={haloTint}
          alpha={haloAlphaVal}
          anchor={0.5}
          scale={haloScale}
        />
      )}

      {/* 节点图标 */}
      {nodeTexture && (
        <Sprite texture={nodeTexture} anchor={0.5} scale={iconScale} />
      )}

      {/* 当前节点额外金色描边 */}
      {isCurrent && haloTexture && (
        <Sprite
          texture={haloTexture}
          tint={0xfff0c0}
          alpha={0.5}
          anchor={0.5}
          scale={haloScale * 1.5}
        />
      )}

      {/* hover 时标题显示更清晰；平时只有当前节点显示文字避免拥挤 */}
      {(isCurrent || hover) && (
        <Text
          text={node.mysteryQuestion}
          anchor={0.5}
          y={28}
          style={new PIXI.TextStyle({
            fontFamily: "Press Start 2P, monospace",
            fontSize: 7,
            fill: hover ? 0x3a1f0a : 0x1a1226,
            wordWrap: true,
            wordWrapWidth: 140,
            align: "center",
          })}
        />
      )}
    </Container>
  );
};

export default NodeSprite;
