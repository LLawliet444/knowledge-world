/**
 * 节点 Sprite（PixiJS v7）
 *
 * 渲染：节点主题图标 + hover/点击交互
 */

import { Container, Graphics, Sprite } from "@pixi/react";
import * as PIXI from "pixi.js";
import { BlurFilter } from "pixi.js";
import React, { useCallback, useEffect, useState } from "react";
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

  // 纹理刚加入缓存但图片尚未解码时，frame 默认为 1×1，texture.height=1（不是 0）。
  // 此时若按 height 归一化会得到 scale=144，导致 Sprite 撑满全屏形成遮罩。
  // 用 valid 标志判断纹理是否真正可用；监听 update 事件在解码完成后触发重渲染。
  const [textureReady, setTextureReady] = useState(false);
  useEffect(() => {
    setTextureReady(false);
    if (!nodeTexture) return;
    if (nodeTexture.valid) {
      setTextureReady(true);
      return;
    }
    const onUpdate = () => setTextureReady(true);
    nodeTexture.on("update", onUpdate);
    return () => {
      nodeTexture.off("update", onUpdate);
    };
  }, [nodeTexture]);

  // NPC 图标和抽象图标用不同缩放
  // NPC：按纹理实际高度归一化到统一显示高度，避免不同原图尺寸（如 864×1024 vs 256×256）导致显示大小不一
  // icon（抽象图标）：原图均为 1024×1024，保持固定 scale
  const NPC_TARGET_HEIGHT = 144; // 与第一个节点（864×1024 × 18/128）一致
  const FALLBACK_NPC_SCALE = 18 / 128;
  const npcScale =
    textureReady && nodeTexture && nodeTexture.height > 1
      ? NPC_TARGET_HEIGHT / nodeTexture.height
      : FALLBACK_NPC_SCALE;
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
      {/* 发光光圈（NPC 脚下 / icon 脚下） */}
      <NpcHalo
        isNpcMode={isNpcMode}
        isLocked={state === "locked"}
        isCurrent={isCurrent}
        nodeClear={nodeClear}
        finalQuestion={finalQuestion}
      />

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

/**
 * 节点脚下发光光圈
 *
 * 4 层叠加（外→内）：
 *   1. 大模糊外光晕（半径 70, alpha 0.35, BlurFilter 16）
 *   2. 中模糊中光晕（半径 50, alpha 0.55, BlurFilter 8）
 *   3. 锐利内圈（半径 38, alpha 0.85）
 *   4. 高光小点（半径 20, alpha 0.5）
 *
 * 颜色策略：
 *   - NPC 模式 + 可交互（已解锁但未通关 / 可前往 / 当前所在）：金黄 #f5b840
 *   - NPC 模式 + 锁定：暗紫 #6b5b95
 *   - icon 模式（终问通过 → nodeClear）：金黄（与 NPC 模式同）
 *
 * 位置：节点图标脚下（y = +50）
 */
const NpcHalo: React.FC<{
  isNpcMode: boolean;
  isLocked: boolean;
  isCurrent: boolean;
  nodeClear: boolean;
  finalQuestion: "locked" | "available" | "completed";
}> = ({ isNpcMode, isLocked }) => {
  // 颜色：锁定用暗紫，其余用金黄
  const outerColor = isLocked ? 0x6b5b95 : 0xd89030;
  const midColor = isLocked ? 0x8a7bb0 : 0xf5b840;
  const innerColor = isLocked ? 0xa89bc8 : 0xfff2c0;
  const highlightColor = isLocked ? 0xc4b8e0 : 0xfff8d0;

  // 锁定时整体更暗
  const baseAlpha = isLocked ? 0.5 : 1;

  return (
    <Container x={0} y={65} alpha={baseAlpha}>
      {/* 第 1 层：外光晕（大模糊） */}
      <Graphics
        draw={(g) => {
          g.clear();
          g.beginFill(outerColor, 0.35);
          g.drawEllipse(0, 0, 70, 22);
          g.endFill();
        }}
        filters={[new BlurFilter(16)]}
      />
      {/* 第 2 层：中光晕（中模糊） */}
      <Graphics
        draw={(g) => {
          g.clear();
          g.beginFill(midColor, 0.55);
          g.drawEllipse(0, 0, 50, 16);
          g.endFill();
        }}
        filters={[new BlurFilter(8)]}
      />
      {/* 第 3 层：锐利内圈 */}
      <Graphics
        draw={(g) => {
          g.clear();
          g.beginFill(innerColor, 0.85);
          g.drawEllipse(0, 0, 38, 12);
          g.endFill();
        }}
      />
      {/* 第 4 层：高光小点 */}
      <Graphics
        draw={(g) => {
          g.clear();
          g.beginFill(highlightColor, 0.5);
          g.drawEllipse(0, 0, 20, 7);
          g.endFill();
        }}
      />
    </Container>
  );
};

