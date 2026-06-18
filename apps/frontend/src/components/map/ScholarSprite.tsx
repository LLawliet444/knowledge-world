/**
 * 学者化身（主角） - PixiJS v7 + @pixi/react
 *
 * 所有精灵图均为水平排列（1 行 4 列）。
 * 每帧宽 = 图片宽 / 4，帧高 = 图片高。
 * 根据实际纹理尺寸动态计算裁剪区域和缩放比例。
 */

import { Container, Graphics, Sprite } from "@pixi/react";
import * as PIXI from "pixi.js";
import React, { useEffect, useState } from "react";

interface ScholarSpriteProps {
  x: number;
  y: number;
  direction: "idle" | "left" | "right" | "up" | "down";
  isWalking: boolean;
}

const SPRITE_PATHS: Record<ScholarSpriteProps["direction"], string> = {
  idle: "/characters/scholar_stand.png",
  left: "/characters/scholar_apprentice_sprite_walk_left_4f_clean.png",
  right: "/characters/scholar_uploaded_walk_right_4f_sheet.png",
  up: "/characters/scholar_apprentice_sprite_walk_up_4f_clean.png",
  down: "/characters/scholar_apprentice_sprite_walk_down_4f_clean.png",
};

// 目标高度（px），宽度按比例自适应
const DISPLAY_H = 160;

export const ScholarSprite: React.FC<ScholarSpriteProps> = ({
  x,
  y,
  direction,
  isWalking,
}) => {
  const [frameIndex, setFrameIndex] = useState(0);
  const [, setTick] = useState(0);

  // 1) 把精灵图加入 PIXI 纹理缓存，并等待加载完成
  useEffect(() => {
    const path = SPRITE_PATHS[direction];
    PIXI.Texture.from(path);

    let cancelled = false;
    const check = () => {
      if (cancelled) return;
      const cached = PIXI.utils.TextureCache[path];
      if (cached && cached.baseTexture && cached.baseTexture.valid) {
        setTick((t) => t + 1);
        return;
      }
      window.setTimeout(check, 80);
    };
    check();
    return () => {
      cancelled = true;
    };
  }, [direction]);

  // 2) 走路动画：每 90ms 换一帧（约 4.4 帧/秒）
  useEffect(() => {
    if (!isWalking) {
      setFrameIndex(0);
      return;
    }
    const id = window.setInterval(() => {
      setFrameIndex((i) => (i + 1) % 4);
    }, 90);
    return () => window.clearInterval(id);
  }, [isWalking]);

  // 3) 从实际纹理动态计算帧大小和缩放
  const path = SPRITE_PATHS[direction];
  const cached = PIXI.utils.TextureCache[path];

  const spriteW = cached?.baseTexture?.valid ? cached.baseTexture.width : 192;
  const spriteH = cached?.baseTexture?.valid ? cached.baseTexture.height : 48;

  const isIdle = direction === "idle";
  const frameW = isIdle ? spriteW : spriteW / 4;
  const frameH = spriteH;
  const scale = DISPLAY_H / frameH;

  let frameTexture: PIXI.Texture | null = null;
  if (cached && cached.baseTexture && cached.baseTexture.valid) {
    const fx = isIdle ? 0 : frameIndex * frameW;
    frameTexture = new PIXI.Texture(
      cached.baseTexture,
      new PIXI.Rectangle(fx, 0, frameW, frameH),
    );
  }

  const displayW = frameW * scale;
  const shadowY = displayW * 0.21;
  const shadowW = displayW * 0.3;
  const shadowH = displayW * 0.05;
  const haloR = displayW * 0.55;

  return (
    <Container x={x} y={y}>
      {/* 阴影 - 椭圆 */}
      <Graphics
        draw={(g) => {
          g.clear();
          g.beginFill(0x000000, 0.55);
          g.drawEllipse(0, shadowY, shadowW, shadowH);
          g.endFill();
        }}
      />
      {/* 金色呼吸光晕 */}
      <Graphics
        draw={(g) => {
          g.clear();
          g.beginFill(0xffd66a, 0.25);
          g.drawEllipse(0, 0, haloR, haloR);
          g.endFill();
        }}
      />
      {/* 主角精灵 */}
      {frameTexture && (
        <Sprite
          texture={frameTexture}
          anchor={{ x: 0.5, y: 0.78 }}
          scale={{ x: scale, y: scale }}
        />
      )}
      {/* 纹理未加载时显示红色圆圈（调试占位） */}
      {!frameTexture && (
        <Graphics
          draw={(g) => {
            g.clear();
            g.beginFill(0xff4444, 0.9);
            g.drawCircle(0, 0, 30);
            g.endFill();
          }}
        />
      )}
    </Container>
  );
};

export default ScholarSprite;
