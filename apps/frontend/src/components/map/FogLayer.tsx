/**
 * 迷雾粒子层（PixiJS v7）
 *
 * - 未解锁节点周围堆叠紫蓝色粒子
 * - punch-hole：从节点中心向外扩散的孔洞动画
 */

import React, { useEffect, useRef } from "react";
import { Container, Sprite, Graphics } from "@pixi/react";
import * as PIXI from "pixi.js";

interface FogLayerProps {
  /** 当前深度中被锁定的节点坐标列表 */
  lockedNodes: Array<{ x: number; y: number }>;
  /** 正在消散动画的节点坐标 */
  revealingNode?: { x: number; y: number };
  onRevealComplete?: () => void;
}

const PARTICLE_COUNT = 15;
const fogTexture = () => PIXI.utils.TextureCache["/fog/fog_particle_1.png"];

function buildParticles(lockedNodes: Array<{ x: number; y: number }>) {
  const particles: Array<{ x: number; y: number; angle: number; dist: number; size: number; alpha: number }> = [];
  let seed = 42;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    return (seed >>> 0) / 0xffffffff;
  };
  for (const node of lockedNodes) {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: node.x,
        y: node.y,
        angle: rand() * Math.PI * 2,
        dist: 20 + rand() * 40,
        size: 20 + rand() * 28,
        alpha: 0.35 + rand() * 0.45,
      });
    }
  }
  return particles;
}

export const FogLayer: React.FC<FogLayerProps> = ({
  lockedNodes,
  revealingNode,
  onRevealComplete,
}) => {
  const particles = React.useMemo(() => buildParticles(lockedNodes), [
    lockedNodes.map((n) => `${n.x},${n.y}`).join("|"),
  ]);
  const progressRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!revealingNode) return;

    progressRef.current = 0;
    const startTime = performance.now();
    const duration = 1200;

    const tick = () => {
      const elapsed = performance.now() - startTime;
      progressRef.current = Math.min(elapsed / duration, 1);
      if (progressRef.current < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        onRevealComplete?.();
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [revealingNode?.x, revealingNode?.y]);

  if (lockedNodes.length === 0) return null;

  const tex = fogTexture();

  return (
    <Container>
      {particles.map((p, i) => {
        const progress = revealingNode ? progressRef.current : 0;
        const dist = p.dist + progress * 80;
        const alpha = Math.max(0, p.alpha * (1 - progress));
        const px = p.x + Math.cos(p.angle) * dist;
        const py = p.y + Math.sin(p.angle) * dist;

        return tex ? (
          <Sprite
            key={i}
            texture={tex}
            x={px}
            y={py}
            alpha={alpha}
            anchor={0.5}
            scale={p.size / 48}
            tint={0x6b5b95}
          />
        ) : (
          <Graphics
            key={i}
            x={px}
            y={py}
            draw={(g) => {
              g.clear();
              g.beginFill(0x6b5b95, alpha);
              g.drawCircle(0, 0, p.size / 2);
              g.endFill();
            }}
          />
        );
      })}

      {/* punch-hole 中心遮罩 */}
      {revealingNode && (
        <Graphics
          x={revealingNode.x}
          y={revealingNode.y}
          draw={(g) => {
            const progress = progressRef.current;
            g.clear();
            g.beginFill(0x3d2f5c, 0.75 * (1 - progress));
            g.drawCircle(0, 0, progress * 100);
            g.endFill();
          }}
        />
      )}
    </Container>
  );
};

export default FogLayer;
