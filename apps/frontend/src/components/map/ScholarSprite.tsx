/**
 * 学者化身 PixiJS Sprite（PixiJS v7 + @pixi/react v7）
 */

import React, { useCallback, useEffect, useRef } from "react";
import { AnimatedSprite, Container, Graphics, useApp } from "@pixi/react";
import * as PIXI from "pixi.js";

interface ScholarSpriteProps {
  x: number;
  y: number;
  direction: "idle" | "left" | "right" | "up" | "down";
  isWalking: boolean;
  onArrived?: () => void;
}

const SPRITE_PATHS: Record<ScholarSpriteProps["direction"], string> = {
  idle: "/characters/scholar_apprentice_sprite_walk_down_4f_clean.png",
  left: "/characters/scholar_apprentice_sprite_walk_left_4f_clean.png",
  right: "/characters/scholar_apprentice_sprite_walk_right_4f_clean.png",
  up: "/characters/scholar_apprentice_sprite_walk_up_4f_clean.png",
  down: "/characters/scholar_apprentice_sprite_walk_down_4f_clean.png",
};

const FRAME_W = 64;
const FRAME_H = 64;

/** 为指定 spritesheet 创建 4 帧 textures */
function makeWalkTextures(app: PIXI.Application, path: string): PIXI.Texture[] {
  const base = PIXI.utils.TextureCache[path];
  if (!base) return Array(4).fill(PIXI.Texture.WHITE);
  return Array.from({ length: 4 }, (_, i) =>
    new PIXI.Texture(base.baseTexture, new PIXI.Rectangle(i * FRAME_W, 0, FRAME_W, FRAME_H)),
  );
}

export const ScholarSprite: React.FC<ScholarSpriteProps> = ({
  x,
  y,
  direction,
  isWalking,
}) => {
  const app = useApp();
  const textures = React.useMemo(
    () => makeWalkTextures(app, SPRITE_PATHS[direction]),
    [app, direction],
  );

  return (
    <Container x={x} y={y}>
      <Graphics
        draw={(g) => {
          g.clear();
          g.beginFill(0x000000, 0.3);
          g.drawEllipse(0, 52, 16, 6);
          g.endFill();
        }}
      />
      <AnimatedSprite
        textures={textures}
        isPlaying={isWalking}
        animationSpeed={0.1}
        anchor={0.5}
      />
    </Container>
  );
};

export default ScholarSprite;
