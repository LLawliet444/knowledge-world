/**
 * 发光路径（PixiJS Graphics + BlurFilter 多层叠加）
 *
 * 视觉分层（外→内），每层都是虚线：
 *   1. 大模糊外光晕（BlurFilter 12，alpha 0.35，深金）
 *   2. 中等模糊中光晕（BlurFilter 5，alpha 0.6，中金）
 *   3. 锐利亮线（无模糊，alpha 0.95，米白）
 *
 * 颜色：金黄/橙色（与地图生物群系风格一致）
 *   - 亮核 #fff2c0
 *   - 中光 #f5b840
 *   - 外光 #d89030
 * 未揭示段：用暗棕色，无发光
 *
 * 虚线：dash 12px, gap 8px（沿段长均分采样）
 * 流动光点：金色小圆点沿已揭示路径匀速推进（带光晕）
 */

import { Graphics } from "@pixi/react";
import { BlurFilter } from "pixi.js";
import React, { useEffect, useMemo, useRef, useState } from "react";

interface GlowingPathProps {
  segments: { x1: number; y1: number; x2: number; y2: number; revealed: boolean }[];
  /** 单次流动动画时长（秒） */
  flowDurationSec?: number;
  /** 虚线：dash + gap 长度（像素） */
  dashLen?: number;
  gapLen?: number;
}

/** 在 (x1,y1)→(x2,y2) 线段上，按 dash/gap 模式采样一系列离散点中心点 */
function sampleDashes(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  dashLen: number,
  gapLen: number,
): { x: number; y: number; rot: number }[] {
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len < 1) return [];
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  const rot = Math.atan2(uy, ux);
  const stride = dashLen + gapLen;
  const out: { x: number; y: number; rot: number }[] = [];
  // 从 gapLen/2 起步：让首段 dash 居中于虚线模式中心
  for (let s = dashLen / 2; s < len; s += stride) {
    const cx = x1 + ux * s;
    const cy = y1 + uy * s;
    out.push({ x: cx, y: cy, rot });
  }
  return out;
}

export const GlowingPath: React.FC<GlowingPathProps> = ({
  segments,
  flowDurationSec = 4,
  dashLen = 12,
  gapLen = 8,
}) => {
  // 流动动画进度 [0, 1] 循环
  const [flowT, setFlowT] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);

  useEffect(() => {
    const tick = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ((ts - startRef.current) / 1000) % flowDurationSec;
      setFlowT(elapsed / flowDurationSec);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      startRef.current = 0;
    };
  }, [flowDurationSec]);

  // 预采样：所有已揭示段上每个 dash 的中心 (x, y, rot)
  const { revealed, dashes, totalLen, segLengths } = useMemo(() => {
    const revealed = segments.filter((s) => s.revealed);
    const dashes = revealed.flatMap((s) => sampleDashes(s.x1, s.y1, s.x2, s.y2, dashLen, gapLen));
    const lens = revealed.map((s) => Math.hypot(s.x2 - s.x1, s.y2 - s.y1));
    const segLengths: number[] = [];
    let acc = 0;
    for (const l of lens) {
      acc += l;
      segLengths.push(acc);
    }
    return { revealed, dashes, totalLen: acc, segLengths };
  }, [segments, dashLen, gapLen]);

  // 当前流动光点位置（沿路径匀速推进）
  const flowPoint = useMemo(() => {
    if (totalLen <= 0) return null;
    const targetDist = flowT * totalLen;
    let acc = 0;
    for (let i = 0; i < revealed.length; i++) {
      const seg = revealed[i];
      const len = segLengths[i] - acc;
      if (targetDist <= segLengths[i]) {
        const localT = (targetDist - acc) / Math.max(len, 1);
        return {
          x: seg.x1 + (seg.x2 - seg.x1) * localT,
          y: seg.y1 + (seg.y2 - seg.y1) * localT,
        };
      }
      acc = segLengths[i];
    }
    const last = revealed[revealed.length - 1];
    return last ? { x: last.x2, y: last.y2 } : null;
  }, [flowT, revealed, totalLen, segLengths]);

  return (
    <>
      {/* 第 1 层：外光晕（虚线，大模糊） */}
      <Graphics
        draw={(g) => {
          g.clear();
          for (const d of dashes) {
            g.beginFill(0xd89030, 0.35);
            // 虚线段：宽矩形（按段方向旋转）
            // 简化：直接画大圆/大矩形作为 dash（不旋转，使用矩形更接近像素风）
            g.drawRect(d.x - dashLen / 2 - 4, d.y - 6, dashLen + 8, 12);
            g.endFill();
          }
        }}
        filters={[new BlurFilter(12)]}
      />
      {/* 第 2 层：中光晕（虚线，中模糊） */}
      <Graphics
        draw={(g) => {
          g.clear();
          for (const d of dashes) {
            g.beginFill(0xf5b840, 0.6);
            g.drawRect(d.x - dashLen / 2 - 2, d.y - 4, dashLen + 4, 8);
            g.endFill();
          }
        }}
        filters={[new BlurFilter(5)]}
      />
      {/* 第 3 层：亮核心（虚线，锐利） */}
      <Graphics
        draw={(g) => {
          g.clear();
          for (const d of dashes) {
            g.beginFill(0xfff2c0, 0.95);
            g.drawRect(d.x - dashLen / 2, d.y - 2, dashLen, 4);
            g.endFill();
          }
        }}
      />
      {/* 暗段：未揭示（实线，弱） */}
      <Graphics
        draw={(g) => {
          g.clear();
          for (const seg of segments) {
            if (seg.revealed) continue;
            g.lineStyle({ width: 3, color: 0x6b4f3a, alpha: 0.25 });
            g.moveTo(seg.x1, seg.y1);
            g.lineTo(seg.x2, seg.y2);
          }
        }}
      />
      {/* 流动光点（带光晕） */}
      {flowPoint && (
        <>
          <Graphics
            draw={(g) => {
              g.clear();
              g.beginFill(0xfff2c0, 0.6);
              g.drawCircle(flowPoint.x, flowPoint.y, 12);
              g.endFill();
            }}
            filters={[new BlurFilter(8)]}
          />
          <Graphics
            draw={(g) => {
              g.clear();
              g.beginFill(0xfff8d0, 1);
              g.drawCircle(flowPoint.x, flowPoint.y, 5);
              g.endFill();
            }}
          />
        </>
      )}
    </>
  );
};

export default GlowingPath;
