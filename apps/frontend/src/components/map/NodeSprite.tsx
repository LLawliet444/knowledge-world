/**
 * 节点 Sprite（PixiJS v7）
 *
 * 渲染：关卡 NPC 头像 + 谜题标题 + 状态光晕
 * 不显示节点名（PRD §4.2.3 明确要求）
 */

import React, { useCallback } from "react";
import { Container, Sprite, Text } from "@pixi/react";
import * as PIXI from "pixi.js";
import type { WorldNode, DepthState } from "../../types/world";
import { NODE_VISUAL, NODE_CLEAR_HALO_COLOR } from "../../constants/node";

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
  const haloColor = nodeClear ? NODE_CLEAR_HALO_COLOR : parseInt(visual.haloColor.replace("#", ""), 16);

  const handleClick = useCallback(() => {
    if (visual.cursor === "pointer" && onClick) {
      onClick(node);
    }
  }, [visual.cursor, onClick, node]);

  const eventMode = visual.cursor === "pointer" ? "static" : "none";
  const cursor =
    visual.cursor === "pointer"
      ? "pointer"
      : visual.cursor === "not-allowed"
      ? "not-allowed"
      : "default";

  const npcTexture = PIXI.utils.TextureCache[node.gateNpc.avatar];
  const haloTexture = PIXI.utils.TextureCache["/ui/halo_available.png"];

  return (
    <Container
      x={node.position.x}
      y={node.position.y}
      alpha={visual.dimmed ? 0.4 : 1}
      eventMode={eventMode}
      cursor={cursor}
      interactive={eventMode === "static"}
      onclick={handleClick}
    >
      {/* 光晕 */}
      {haloTexture && (
        <Sprite
          texture={haloTexture}
          tint={haloColor}
          alpha={visual.haloAlpha}
          anchor={0.5}
          scale={1.4}
        />
      )}

      {/* 节点头像（关卡 NPC） */}
      {npcTexture && (
        <Sprite texture={npcTexture} anchor={0.5} scale={80 / 128} />
      )}

      {/* 当前节点金色描边 */}
      {isCurrent && haloTexture && (
        <Sprite
          texture={haloTexture}
          tint={0xf5b642}
          alpha={0.9}
          anchor={0.5}
          scale={1.7}
        />
      )}

      {/* 谜题标题文字 */}
      <Text
        text={node.mysteryQuestion}
        anchor={0.5}
        y={50}
        style={{
          fontFamily: "Press Start 2P, monospace",
          fontSize: 9,
          fill: 0x1a1226,
          wordWrap: true,
          wordWrapWidth: 160,
          align: "center",
        }}
      />
    </Container>
  );
};

export default NodeSprite;
