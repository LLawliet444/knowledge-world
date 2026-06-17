/**
 * 浓雾覆盖层（HTML Canvas 2D + CSS 绝对定位）
 *
 * 视觉结构：
 *   - 全屏紫灰色雾（渐变背景 + 2500 噪点 + 60 大团雾斑）
 *   - 在"已解锁节点"位置挖圆洞（destination-out 合成模式）
 *   - 在"学者当前位置"也挖一个小洞（使学者可见）
 *   - 正在解锁时：扩散洞动画（半径 40 → 200）
 *   - 锁定节点周围：额外叠加飘动粒子（CSS transform）
 *
 * 生命周期：
 *   - visibleNodes / scholarPos / lockedNodes 变化 → 重绘
 *   - revealingNode 存在 → 按帧重绘（扩散动画）
 *   - 渲染为 <canvas>，通过绝对定位叠在地图上层
 */

import React, { useEffect, useMemo, useRef, useState } from "react";

const MAP_WIDTH = 1920;
const MAP_HEIGHT = 1080;

interface FogLayerProps {
  /** 当前深度下可见（已解锁）节点坐标 */
  visibleNodes: Array<{ x: number; y: number }>;
  /** 锁定节点坐标（在这些节点周围加飘动粒子） */
  lockedNodes: Array<{ x: number; y: number }>;
  /** 学者当前位置（在浓雾中也挖小洞） */
  scholarPos: { x: number; y: number };
  /** 正在解锁的节点（punch-hole 扩散动画） */
  revealingNode?: { x: number; y: number };
  onRevealComplete?: () => void;
}

// —— 锁定节点周围的飘动粒子数据 ——
interface FloatingParticle {
  x: number;
  y: number;
  baseY: number;
  size: number;
  alpha: number;
  phase: number;
  speed: number;
}

function buildParticles(
  lockedNodes: Array<{ x: number; y: number }>,
): FloatingParticle[] {
  const out: FloatingParticle[] = [];
  let seed = 1337;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    return (seed >>> 0) / 0xffffffff;
  };
  for (const n of lockedNodes) {
    for (let i = 0; i < 10; i++) {
      out.push({
        x: n.x + (rand() - 0.5) * 180,
        y: n.y + (rand() - 0.5) * 120,
        baseY: n.y + (rand() - 0.5) * 120,
        size: 18 + rand() * 28,
        alpha: 0.55 + rand() * 0.4,
        phase: rand() * Math.PI * 2,
        speed: 0.5 + rand() * 1.2,
      });
    }
  }
  return out;
}

/**
 * 在 canvas 上绘制一帧浓雾（含节点挖洞 + reveal 扩散 + 学者挖洞）
 */
function drawFogFrame(
  ctx: CanvasRenderingContext2D,
  visibleNodes: Array<{ x: number; y: number }>,
  revealingNode: { x: number; y: number } | null,
  revealProgress: number,
  scholarPos: { x: number; y: number },
  timeMs: number,
  fogPatches: Array<{ x: number; y: number; r: number; drift: number }>,
) {
  ctx.clearRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

  // 1) 薄雾背景：偏蓝紫色调，模拟"认知迷雾"
  const bg = ctx.createLinearGradient(0, 0, 0, MAP_HEIGHT);
  bg.addColorStop(0, "rgba(110, 120, 160, 0.45)");
  bg.addColorStop(0.5, "rgba(100, 105, 150, 0.52)");
  bg.addColorStop(1, "rgba(85, 90, 135, 0.55)");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

  // 2) 细密噪点（~2000 个，更低透明度，像尘埃）
  ctx.save();
  for (let i = 0; i < 2000; i++) {
    const x = (i * 137.508) % MAP_WIDTH;
    const y = (i * 89.7 + timeMs * 0.0008) % MAP_HEIGHT;
    const r = 1 + ((i * 5) % 3);
    const a = 0.03 + ((i * 3) % 9) / 70;
    ctx.fillStyle = `rgba(220, 225, 240, ${a})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 3) 大团雾斑（调低不透明度，色调与薄雾协调）
  ctx.save();
  for (const p of fogPatches) {
    const drift = Math.sin(timeMs * 0.0003 + p.drift) * 10;
    const cx = p.x + drift;
    const cy = p.y + Math.cos(timeMs * 0.00025 + p.drift) * 10;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, p.r);
    grad.addColorStop(0, "rgba(160, 165, 200, 0.22)");
    grad.addColorStop(0.5, "rgba(120, 125, 170, 0.12)");
    grad.addColorStop(1, "rgba(80, 85, 130, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 4) 节点挖洞（destination-out）
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  for (const n of visibleNodes) {
    const r = 230;
    const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r);
    grad.addColorStop(0, "rgba(0,0,0, 1)");
    grad.addColorStop(0.5, "rgba(0,0,0, 0.88)");
    grad.addColorStop(1, "rgba(0,0,0, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 5) 正在解锁节点：扩散洞动画（更大的扩展半径）
  if (revealingNode) {
    const r = 60 + revealProgress * 220;
    const grad = ctx.createRadialGradient(
      revealingNode.x,
      revealingNode.y,
      0,
      revealingNode.x,
      revealingNode.y,
      r + 80,
    );
    grad.addColorStop(0, "rgba(0,0,0, 1)");
    grad.addColorStop(0.5, "rgba(0,0,0, 0.96)");
    grad.addColorStop(1, "rgba(0,0,0, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(revealingNode.x, revealingNode.y, r + 80, 0, Math.PI * 2);
    ctx.fill();
  }

  // 6) 学者洞（较大，让学者和附近的路径可见）
  {
    const r = 150;
    const grad = ctx.createRadialGradient(
      scholarPos.x,
      scholarPos.y,
      0,
      scholarPos.x,
      scholarPos.y,
      r,
    );
    grad.addColorStop(0, "rgba(0,0,0, 1)");
    grad.addColorStop(0.5, "rgba(0,0,0, 0.9)");
    grad.addColorStop(1, "rgba(0,0,0, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(scholarPos.x, scholarPos.y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export const FogLayer: React.FC<FogLayerProps> = ({
  visibleNodes,
  lockedNodes,
  scholarPos,
  revealingNode,
  onRevealComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const progressRef = useRef(0);
  const activeRef = useRef(true);
  const [, forceTick] = useState(0);

  // —— 预生成 60 个大团雾斑位置（不变） ——
  const fogPatches = useMemo(() => {
    const out: Array<{ x: number; y: number; r: number; drift: number }> = [];
    let seed = 42;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) & 0xffffffff;
      return (seed >>> 0) / 0xffffffff;
    };
    for (let i = 0; i < 60; i++) {
      out.push({
        x: rand() * MAP_WIDTH,
        y: rand() * MAP_HEIGHT,
        r: 80 + rand() * 160,
        drift: rand() * Math.PI * 2,
      });
    }
    return out;
  }, []);

  // —— 预生成锁定节点的飘动粒子数据（不变） ——
  const particles = useMemo(() => buildParticles(lockedNodes), [
    lockedNodes.map((n) => `${n.x},${n.y}`).join("|"),
  ]);

  // —— 主循环：每帧重绘浓雾 ——
  useEffect(() => {
    activeRef.current = true;
    const startTime = performance.now();
    let localProgress = 0;

    const tick = () => {
      if (!activeRef.current) return;
      const now = performance.now();

      // reveal 动画进度
      if (revealingNode) {
        const elapsed = now - startTime;
        localProgress = Math.min(elapsed / 1400, 1);
        progressRef.current = localProgress;
        if (localProgress >= 1 && onRevealComplete) {
          onRevealComplete();
          // 只调用一次
          (onRevealComplete as unknown) = null;
        }
      }

      // 绘制浓雾
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d")!;
        drawFogFrame(
          ctx,
          visibleNodes,
          revealingNode ?? null,
          localProgress,
          scholarPos,
          now,
          fogPatches,
        );
      }

      // 更新粒子浮动（通过 React state 触发重渲染）
      forceTick((v) => (v + 1) % 1000);

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      activeRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    visibleNodes.map((n) => `${n.x},${n.y}`).join("|"),
    revealingNode?.x,
    revealingNode?.y,
    scholarPos.x,
    scholarPos.y,
    fogPatches.length,
    onRevealComplete,
  ]);

  // 当前时间（用于粒子飘动）
  const nowT = performance.now();

  return (
    <div
      className="fog-overlay pointer-events-none"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 20,
      }}
    >
      {/* 1) 主浓雾 canvas：按地图比例缩放覆盖整个 Stage */}
      <canvas
        ref={canvasRef}
        width={MAP_WIDTH}
        height={MAP_HEIGHT}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          display: "block",
        }}
      />

      {/* 2) 锁定节点周围的飘动粒子小圆（紫灰色） */}
      {particles.map((p, i) => {
        const bob = Math.sin(nowT * 0.002 * p.speed + p.phase) * 6;
        const alpha =
          p.alpha *
          (0.85 + 0.15 * Math.cos(nowT * 0.003 + p.phase));
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${((p.x / MAP_WIDTH) * 100).toFixed(4)}%`,
              top: `${(((p.baseY + bob) / MAP_HEIGHT) * 100).toFixed(4)}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              borderRadius: "50%",
              transform: "translate(-50%, -50%)",
              background:
                "radial-gradient(circle, rgba(200,184,224,0.75) 0%, rgba(150,130,180,0.35) 55%, rgba(100,85,140,0) 100%)",
              opacity: alpha,
              pointerEvents: "none",
            }}
          />
        );
      })}
    </div>
  );
};

export default FogLayer;
