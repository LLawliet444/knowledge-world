/**
 * 层切换过渡视频
 *
 * 当用户完成当前层、自动进入下一层时，全屏播放对应过渡视频。
 * 流程：
 *   1. 黑屏淡入（约 0.6s），同时 BGM 淡出并暂停
 *   2. 全屏播放过渡视频
 *   3. 视频播完后视频画面淡出（约 0.4s），纯黑停留（约 0.3s）
 *   4. 调用 onComplete（由 WorldMap 触发 finishDepthSwitch 进入下一层地图，
 *      currentDepth 变化后 WorldMap 的 BGM useEffect 会自动 playFor 重新播放音乐）
 *
 * 视频文件位于 assets/vedio/（publicDir=../../assets，访问路径 /vedio/xxx.mp4）：
 *   what→how : what-how.mp4
 *   how→why  : how-why.mp4
 *   why→system: why-system.mp4
 */

import React, { useEffect, useRef, useState } from "react";
import { useBgmStore } from "../../store/bgmStore";
import type { LayerType } from "../../types/world";

interface DepthTransitionVideoProps {
  /** 来源层（当前层） */
  fromDepth: LayerType;
  /** 目标层（下一层） */
  toDepth: LayerType;
  onComplete: () => void;
}

/** 层切换视频路径映射：from→to */
const TRANSITION_VIDEO: Record<string, string> = {
  "what-how": "/vedio/what-how.mp4",
  "how-why": "/vedio/how-why.mp4",
  "why-system": "/vedio/why-system.mp4",
};

/** 查询某次层切换是否有对应的过渡视频，有则返回 URL，无则返回 undefined */
export function getTransitionVideoUrl(
  fromDepth: LayerType,
  toDepth: LayerType,
): string | undefined {
  return TRANSITION_VIDEO[`${fromDepth}-${toDepth}`];
}

/** 黑屏淡入 + 音乐淡出时长（ms） */
const FADE_DURATION = 600;
/** 视频播完后画面淡出时长（ms） */
const VIDEO_FADE_OUT = 400;
/** 视频淡出后纯黑停留时长（ms） */
const BLACK_HOLD = 300;

type Phase = "fadeToBlack" | "playing" | "ending";

export const DepthTransitionVideo: React.FC<DepthTransitionVideoProps> = ({
  fromDepth,
  toDepth,
  onComplete,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<Phase>("fadeToBlack");
  const [blackOpacity, setBlackOpacity] = useState(0);
  const [videoOpacity, setVideoOpacity] = useState(1);
  const completedRef = useRef(false);
  const originalVolumeRef = useRef(0.4);

  const key = `${fromDepth}-${toDepth}`;
  const src = TRANSITION_VIDEO[key];

  // 阶段 1：黑屏淡入 + BGM 淡出，完成后进入播放阶段
  useEffect(() => {
    if (phase !== "fadeToBlack") return;

    const bgm = useBgmStore.getState();
    const originalVolume = bgm.volume;
    originalVolumeRef.current = originalVolume;
    const startTime = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / FADE_DURATION);
      // 黑屏透明度 0 → 1
      setBlackOpacity(t);
      // 音乐音量原值 → 0
      bgm.setVolume(originalVolume * (1 - t));

      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        // 音乐停掉，恢复 store 音量供下一层 playFor 使用
        bgm.pause();
        bgm.setVolume(originalVolume);
        setPhase("playing");
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
    };
  }, [phase]);

  // 阶段 2：视频加载并播放，播完进入结束阶段
  useEffect(() => {
    if (phase !== "playing") return;
    const v = videoRef.current;
    if (!v) return;

    const playPromise = v.play();
    if (playPromise) {
      playPromise.catch(() => {
        // 自动播放被拦截（无 user gesture）→ 直接完成，避免卡死
        finish();
      });
    }

    const handleEnded = () => setPhase("ending");
    v.addEventListener("ended", handleEnded);

    return () => {
      v.removeEventListener("ended", handleEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // 阶段 3：视频画面淡出 → 纯黑停留 → 完成切换
  useEffect(() => {
    if (phase !== "ending") return;

    const startTime = performance.now();
    let raf = 0;
    let timer: number | undefined;

    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / VIDEO_FADE_OUT);
      // 视频画面透明度 1 → 0，露出黑底
      setVideoOpacity(1 - t);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        // 纯黑停留一段时间后再切换地图
        timer = window.setTimeout(() => finish(), BLACK_HOLD);
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      if (timer) window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // 统一的完成出口，保证只触发一次
  const finish = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  };

  // 视频缺失或路径未配置 → 直接完成
  if (!src) {
    finish();
    return null;
  }

  // 点击跳过：恢复音乐音量后直接进入下一层
  const handleSkip = () => {
    const bgm = useBgmStore.getState();
    bgm.setVolume(originalVolumeRef.current);
    finish();
  };

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "#000",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
      }}
      onClick={handleSkip}
    >
      {/* 黑屏遮罩：淡入阶段从透明渐变到全黑，播放/结束阶段保持全黑底 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "#000",
          opacity: blackOpacity,
          pointerEvents: "none",
        }}
      />
      {/* 视频仅在播放阶段挂载，结束阶段淡出露出黑底 */}
      {phase !== "fadeToBlack" && (
        <video
          ref={videoRef}
          src={src}
          autoPlay
          playsInline
          style={{
            position: "relative",
            maxWidth: "100%",
            maxHeight: "100%",
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: videoOpacity,
          }}
        />
      )}
      {/* 跳过提示（仅播放阶段显示） */}
      {phase === "playing" && (
        <div
          style={{
            position: "absolute",
            bottom: 24,
            right: 32,
            color: "rgba(255,255,255,0.6)",
            fontSize: 14,
            fontFamily: "'Zpix', 'Microsoft YaHei', monospace",
            textShadow: "1px 1px 2px #000",
            pointerEvents: "none",
          }}
        >
          点击跳过
        </div>
      )}
    </div>
  );
};

export default DepthTransitionVideo;
