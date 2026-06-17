/**
 * 小场景播放器（PixiJS v7）
 *
 * 首次进入节点 What 层时播放 5-8 秒像素小舞台
 */

import React, { useEffect, useRef } from "react";
import { Container, Sprite, Text, Graphics } from "@pixi/react";
import gsap from "gsap";
import * as PIXI from "pixi.js";

const MAP_WIDTH = 1920;
const MAP_HEIGHT = 1080;
const MAP_CENTER_X = MAP_WIDTH / 2;
const MAP_CENTER_Y = MAP_HEIGHT / 2;

interface SmallSceneProps {
  sceneKey: string;
  sceneText: string;
  durationSec: number;
  onComplete: () => void;
}

function getSceneAsset(sceneKey: string, filename: string): string {
  return `/scenes/${sceneKey}/${filename}`;
}

export const SmallScene: React.FC<SmallSceneProps> = ({
  sceneKey,
  sceneText,
  durationSec,
  onComplete,
}) => {
  const containerRef = useRef<PIXI.Container>(null);

  useEffect(() => {
    // 播放结束淡出
    const timer = setTimeout(() => {
      if (containerRef.current) {
        gsap.to(containerRef.current, {
          alpha: 0,
          duration: 0.8,
          ease: "power2.out",
          onComplete: onComplete,
        });
      } else {
        onComplete();
      }
    }, durationSec * 1000);
    return () => clearTimeout(timer);
  }, [durationSec, onComplete]);

  // 初始化淡入
  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { alpha: 0 },
        { alpha: 1, duration: 0.5, ease: "power2.in" },
      );
    }
  }, []);

  // 根据场景 key 匹配正确的背景图文件名
  const SCENE_BG_MAP: Record<string, string> = {
    cave_fire: "cave_bg.png",
    empire_gate: "empire_bg.png",
    grain_field: "field_bg.png",
    market_trade: "market_bg.png",
    stargazing: "stargazing_bg.png",
    stone_law: "stone_bg.png",
    temple_myth: "temple_bg.png",
  };
  const bgFile = SCENE_BG_MAP[sceneKey] ?? "cave_bg.png";
  const bgTexture = PIXI.utils.TextureCache[getSceneAsset(sceneKey, bgFile)];
  const focusTexture = PIXI.utils.TextureCache[getSceneAsset(sceneKey, "focus_symbol.png")];

  return (
    <Container ref={containerRef} x={MAP_CENTER_X} y={MAP_CENTER_Y} alpha={0}>
      {/* 全屏黑色背景 */}
      <Graphics
        draw={(g) => {
          g.clear();
          g.beginFill(0x0a0a1a, 0.88);
          g.drawRect(-MAP_CENTER_X, -MAP_CENTER_Y, MAP_WIDTH, MAP_HEIGHT);
          g.endFill();
        }}
      />

      {/* 场景背景图 */}
      {bgTexture ? (
        <Sprite texture={bgTexture} anchor={0.5} scale={1.2} />
      ) : (
        <Graphics
          draw={(g) => {
            g.clear();
            g.beginFill(0x2a1a0a);
            g.drawRect(-500, -200, 1000, 400);
            g.endFill();
          }}
        />
      )}

      {/* focus symbol */}
      {focusTexture && (
        <Sprite texture={focusTexture} anchor={0.5} y={-80} alpha={0.7} />
      )}

      {/* 场景描述文字 */}
      <Text
        text={sceneText}
        anchor={0.5}
        y={200}
        style={new PIXI.TextStyle({
          fontFamily: "VT323, monospace",
          fontSize: 24,
          fill: 0xfff8e6,
          wordWrap: true,
          wordWrapWidth: 700,
          align: "center",
        })}
      />

      {/* 底部装饰：场景名 */}
      <Text
        text={`「${sceneKey}」场景`}
        anchor={0.5}
        y={480}
        style={new PIXI.TextStyle({
          fontFamily: "Press Start 2P, monospace",
          fontSize: 10,
          fill: 0xf5b642,
          align: "center",
        })}
      />
    </Container>
  );
};

export default SmallScene;
