/**
 * 学者化身（主角） - PixiJS v7 + @pixi/react
 *
 * 使用与 NodeSprite 一致的渲染模式：
 *   - 通过 PIXI.Texture.from(path) 将精灵图加载到 PIXI.utils.TextureCache
 *   - 从缓存获取纹理后，条件渲染 <Sprite>
 *   - 通过 state 切换 frame，实现 4 帧走路动画
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
  idle: "/characters/scholar_apprentice_sprite_walk_right_4f_clean.png",
  left: "/characters/scholar_apprentice_sprite_walk_left_4f_clean.png",
  right: "/characters/scholar_apprentice_sprite_walk_right_4f_clean.png",
  up: "/characters/scholar_apprentice_sprite_walk_up_4f_clean.png",
  down: "/characters/scholar_apprentice_sprite_walk_down_4f_clean.png",
};

// 精灵图：1024x1024，2x2 网格，每帧 512x512
const FRAME_W = 512;
const FRAME_H = 512;
// 显示尺寸：在 1920x1080 的地图上约 850 像素宽，保证非常显眼
// 精灵图中角色实际占 200-250 像素 / 512 帧 = ~45%，所以 850 * 0.45 ≈ 380 像素高
const DISPLAY_W = 150;
const SCALE = DISPLAY_W / FRAME_W; // ~1.66

export const ScholarSprite: React.FC<ScholarSpriteProps> = ({
  x,
  y,
  direction,
  isWalking,
}) => {
  const [frameIndex, setFrameIndex] = useState(0);
  // tick 用于在纹理加载完成后强制触发重新渲染
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

  // 3) 切出当前帧的纹理
  const path = SPRITE_PATHS[direction];
  const cached = PIXI.utils.TextureCache[path];
  let frameTexture: PIXI.Texture | null = null;
  if (cached && cached.baseTexture && cached.baseTexture.valid) {
    // 根据 frameIndex 计算 frame 位置（2x2 网格）
    const fx = (frameIndex % 2) * FRAME_W;
    const fy = Math.floor(frameIndex / 2) * FRAME_H;
    frameTexture = new PIXI.Texture(
      cached.baseTexture,
      new PIXI.Rectangle(fx, fy, FRAME_W, FRAME_H),
    );
  }

  // 阴影和光晕的几何参数
  // anchor.y=0.78：锚点对齐精灵图中角色的脚底位置
  // 阴影紧贴脚底下方，避免漂浮感
  const shadowY = DISPLAY_W * 0.21;
  const shadowW = DISPLAY_W * 0.3;
  const shadowH = DISPLAY_W * 0.05;
  const haloR = DISPLAY_W * 0.55;

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
      {/* 主角精灵 - 条件渲染，确保纹理就绪 */}
      {frameTexture && (
        <Sprite
          texture={frameTexture}
          anchor={{ x: 0.5, y: 0.78 }}
          scale={{ x: SCALE, y: SCALE }}
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
