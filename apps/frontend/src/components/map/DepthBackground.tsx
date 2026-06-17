/**
 * 四层深度背景（PixiJS v7）
 *
 * 四张背景图预加载，深度切换时 alpha tween 做交叉溶解
 */

import React, { useEffect, useRef } from "react";
import { Container, Graphics, Sprite } from "@pixi/react";
import gsap from "gsap";
import * as PIXI from "pixi.js";
import type { LayerType } from "../../types/world";
import { DEPTH_BG_IMAGE } from "../../constants/biome";

const MAP_WIDTH = 1920;
const MAP_HEIGHT = 1080;
const MAP_CENTER_X = MAP_WIDTH / 2;
const MAP_CENTER_Y = MAP_HEIGHT / 2;

interface DepthBackgroundProps {
  currentDepth: LayerType;
  targetDepth: LayerType | null;
  isSwitching: boolean;
  onSwitchComplete?: (depth: LayerType) => void;
}

export const DepthBackground: React.FC<DepthBackgroundProps> = ({
  currentDepth,
  targetDepth,
  isSwitching,
  onSwitchComplete,
}) => {
  const containerRef = useRef<PIXI.Container>(null);

  useEffect(() => {
    if (!isSwitching || !targetDepth || !containerRef.current) return;

    gsap.to(containerRef.current, {
      alpha: 0,
      duration: 0.5,
      ease: "power2.in",
      onComplete: () => {
        onSwitchComplete?.(targetDepth);
        gsap.to(containerRef.current, {
          alpha: 1,
          duration: 0.5,
          ease: "power2.out",
        });
      },
    });
  }, [isSwitching, targetDepth]);

  const bgTexture = PIXI.utils.TextureCache[DEPTH_BG_IMAGE[currentDepth]];

  return (
    <Container ref={containerRef}>
      {bgTexture ? (
        <Sprite
          texture={bgTexture}
          x={MAP_CENTER_X}
          y={MAP_CENTER_Y}
          width={MAP_WIDTH}
          height={MAP_HEIGHT}
          anchor={0.5}
        />
      ) : (
        <Graphics
          draw={(g) => {
            g.clear();
            g.beginFill(0xf4d37a);
            g.drawRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
            g.endFill();
          }}
        />
      )}
    </Container>
  );
};

export default DepthBackground;
