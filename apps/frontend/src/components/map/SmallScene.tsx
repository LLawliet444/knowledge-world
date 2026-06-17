/**
 * 第一幕过场动画
 *
 * 完全照搬 index_1_video.html 的实现：
 *   - 16:9 舞台（stage）
 *   - 多层叠加：背景 / 火光 / 火星粒子 / 角色 / 氛围暗紫色遮罩
 *   - 星露谷风格木质对话框：羊皮纸底色 + 深红木边 + 金色内衬
 *   - 逐字打字机
 *   - 点击推进剧情
 *   - 最后一句后 fade out，调用 onComplete()
 */

import React, { useEffect, useRef, useState } from "react";

interface SmallSceneProps {
  sceneKey?: string;
  sceneText?: string;
  durationSec?: number;
  onComplete?: () => void;
}

export const SmallScene: React.FC<SmallSceneProps> = ({ onComplete }) => {
  const sparksContainerRef = useRef<HTMLDivElement>(null);
  const storytellerRef = useRef<HTMLDivElement>(null);
  const dialogBoxRef = useRef<HTMLDivElement>(null);
  const textTargetRef = useRef<HTMLDivElement>(null);
  const nextIndicatorRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const [script] = useState<string[]>([
    "（众人围坐在跳动的篝火旁，原本冰冷的洞穴渐渐暖和起来……）",
    "看啊，火光照亮了墙上的远古图腾。此时此刻，我们这些原本毫无血缘关系的陌生人，竟能为了同一个信念聚在这里。",
    "这就是语言的力量，这就是我们共同笃信的故事……",
    "那么，我的孩子们，我想问你们一个问题：\n是什么，让智人和其他动物有了根本的不同？",
  ]);

  const currentStepRef = useRef(0);
  const typingTimersRef = useRef<number[]>([]);
  const sparkTimersRef = useRef<number[]>([]);

  // 清理所有打字计时器
  const clearTypingTimers = () => {
    for (const t of typingTimersRef.current) window.clearTimeout(t);
    typingTimersRef.current = [];
  };

  // 清理粒子相关
  const clearSparkTimers = () => {
    for (const t of sparkTimersRef.current) window.clearTimeout(t);
    sparkTimersRef.current = [];
    if (sparksContainerRef.current) sparksContainerRef.current.innerHTML = "";
  };

  // 打字机
  const typeWriter = (text: string, index: number = 0) => {
    if (!textTargetRef.current) return;
    if (nextIndicatorRef.current) nextIndicatorRef.current.style.display = "none";
    if (index < text.length) {
      textTargetRef.current.textContent = text.substring(0, index + 1);
      const t = window.setTimeout(() => typeWriter(text, index + 1), 40);
      typingTimersRef.current.push(t);
    } else {
      if (nextIndicatorRef.current) nextIndicatorRef.current.style.display = "block";
    }
  };

  // 启动：完全照搬 index_1_video.html 的 startStory
  useEffect(() => {
    // --- 1. 火星粒子生成 ---
    const spawnInterval = window.setInterval(() => {
      if (!sparksContainerRef.current) return;
      const spark = document.createElement("div");
      spark.className = "small-scene-spark";
      spark.style.left = 47 + Math.random() * 4 + "%";
      spark.style.bottom = 50 + Math.random() * 4 + "%";
      spark.style.animationDuration = 1.5 + Math.random() * 1.5 + "s";
      sparksContainerRef.current.appendChild(spark);
      const t = window.setTimeout(() => spark.remove(), 3000);
      sparkTimersRef.current.push(t);
    }, 300);
    sparkTimersRef.current.push(spawnInterval);

    // --- 2. 1.5s 后老爷爷淡入 ---
    const t1 = window.setTimeout(() => {
      if (storytellerRef.current) {
        storytellerRef.current.style.opacity = "1";
      }
    }, 1500);
    sparkTimersRef.current.push(t1);

    // --- 3. 3.5s 后对话框弹出 + 打印第一句 ---
    const t2 = window.setTimeout(() => {
      if (dialogBoxRef.current) {
        dialogBoxRef.current.style.opacity = "1";
        dialogBoxRef.current.style.transform = "translateY(0)";
      }
      typeWriter(script[currentStepRef.current]);
    }, 3500);
    sparkTimersRef.current.push(t2);

    // --- 4. 点击对话框推进 ---
    const handleClick = () => {
      clearTypingTimers();
      if (currentStepRef.current < script.length - 1) {
        currentStepRef.current += 1;
        typeWriter(script[currentStepRef.current]);
      } else {
        // 最后一句 → 渐隐 + 调用 onComplete
        if (textTargetRef.current) textTargetRef.current.textContent = "（等待你的回答……）";
        if (nextIndicatorRef.current) nextIndicatorRef.current.style.display = "none";
        if (dialogBoxRef.current) {
          dialogBoxRef.current.style.boxShadow = "0 0 0 4px #eeb069, 0 0 20px #ff9d21";
        }
        // 整体 fade out
        const fadeT = window.setTimeout(() => {
          if (stageRef.current) stageRef.current.style.opacity = "0";
          const endT = window.setTimeout(() => {
            onComplete?.();
          }, 900);
          sparkTimersRef.current.push(endT);
        }, 800);
        sparkTimersRef.current.push(fadeT);
      }
    };

    const box = dialogBoxRef.current;
    if (box) box.addEventListener("click", handleClick);

    // --- 5. 兜底：如果用户一直不点击，30 秒后自动结束 ---
    const hardT = window.setTimeout(() => {
      if (stageRef.current) stageRef.current.style.opacity = "0";
      const endT = window.setTimeout(() => onComplete?.(), 900);
      sparkTimersRef.current.push(endT);
    }, 30000);
    sparkTimersRef.current.push(hardT);

    // cleanup
    return () => {
      if (box) box.removeEventListener("click", handleClick);
      clearTypingTimers();
      clearSparkTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== 内联样式（严格沿用 index_1_video.html 的 CSS）=====
  const stageStyle: React.CSSProperties = {
    position: "fixed",
    left: 0,
    top: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "#05020c",
    overflow: "hidden",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "'Zpix', monospace",
    zIndex: 9999,
    imageRendering: "pixelated",
    opacity: 1,
    transition: "opacity 0.8s ease-out",
  };

  const stageInnerStyle: React.CSSProperties = {
    position: "relative",
    width: "100vw",
    height: "56.25vw",
    maxWidth: "100vh",
    maxHeight: "56.25vh",
    backgroundColor: "#1a1016",
    boxShadow: "0 10px 30px rgba(0,0,0,0.8)",
    imageRendering: "pixelated",
  };

  const layerStyle: React.CSSProperties = {
    position: "absolute",
    width: "100%",
    height: "100%",
    top: 0,
    left: 0,
  };

  const bgLayerStyle: React.CSSProperties = {
    ...layerStyle,
    backgroundImage: "url('/video_background/screen_1_background.png')",
    backgroundSize: "cover",
    backgroundPosition: "center",
  };

  const ambientOverlayStyle: React.CSSProperties = {
    ...layerStyle,
    background: "radial-gradient(circle at 25% 70%, rgba(0,0,0,0) 10%, rgba(15, 8, 30, 0.85) 60%)",
    mixBlendMode: "multiply",
    pointerEvents: "none",
  };

  const fireLightStyle: React.CSSProperties = {
    position: "absolute",
    left: "23%",
    top: "62%",
    width: 250,
    height: 250,
    transform: "translate(-50%, -50%)",
    background:
      "radial-gradient(circle, rgba(255,145,40,0.4) 0%, rgba(255,80,0,0.1) 40%, rgba(0,0,0,0) 70%)",
    mixBlendMode: "screen",
    pointerEvents: "none",
    animation: "small-scene-fire-breath 0.15s infinite alternate",
  };

  const storytellerStyle: React.CSSProperties = {
    position: "absolute",
    left: "11%",
    top: "64%",
    width: 80,
    height: 80,
    backgroundImage: "url('/characters/npc_old_scholar_avatar.png')",
    backgroundSize: "contain",
    backgroundRepeat: "no-repeat",
    transform: "scaleX(-1)",
    opacity: 0,
    transition: "opacity 1.5s ease-in-out",
  };

  const storytellerShadowStyle: React.CSSProperties = {
    content: '""',
    position: "absolute",
    bottom: 0,
    left: "15%",
    width: "70%",
    height: 12,
    background: "rgba(0, 0, 0, 0.4)",
    borderRadius: "50%",
  };

  const dialogBoxStyle: React.CSSProperties = {
    position: "absolute",
    bottom: "5%",
    left: "5%",
    right: "5%",
    height: "25%",
    backgroundColor: "#fce1b5",
    border: "4px solid #b56c27",
    boxShadow: "0 0 0 4px #eeb069, 0 8px 0 rgba(0,0,0,0.4)",
    zIndex: 100,
    padding: "20px 30px",
    display: "flex",
    flexDirection: "column",
    opacity: 0,
    transform: "translateY(20px)",
    transition: "all 0.5s ease-out",
    cursor: "pointer",
  };

  const goldInnerFrameStyle: React.CSSProperties = {
    position: "absolute",
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    border: "2px solid #da9100",
    pointerEvents: "none",
  };

  const speakerNameStyle: React.CSSProperties = {
    fontSize: "1.2rem",
    color: "#803800",
    marginBottom: 8,
    fontWeight: "bold",
    textShadow: "1px 1px 0px #fff",
  };

  const dialogTextStyle: React.CSSProperties = {
    fontSize: "1.1rem",
    color: "#492310",
    lineHeight: 1.5,
    whiteSpace: "pre-line",
  };

  const nextArrowStyle: React.CSSProperties = {
    position: "absolute",
    bottom: 12,
    right: 20,
    width: 0,
    height: 0,
    borderLeft: "8px solid transparent",
    borderRight: "8px solid transparent",
    borderTop: "12px solid #492310",
    animation: "small-scene-arrow-bounce 0.4s infinite alternate",
    display: "none",
  };

  return (
    <div style={stageStyle} ref={stageRef}>
      {/* 注入关键帧动画（火光呼吸 + 火星上升 + 箭头跳动） */}
      <style>
        {`
          @keyframes small-scene-fire-breath {
            0% { transform: translate(-50%, -50%) scale(0.95); opacity: 0.9; }
            100% { transform: translate(-50%, -50%) scale(1.05); opacity: 1; }
          }
          @keyframes small-scene-spark-rise {
            0% { transform: translateY(0) translateX(0); opacity: 1; }
            50% { transform: translateY(-50px) translateX(10px); opacity: 0.8; }
            100% { transform: translateY(-120px) translateX(-5px); opacity: 0; }
          }
          @keyframes small-scene-arrow-bounce {
            0% { transform: translateY(0); }
            100% { transform: translateY(5px); }
          }
          .small-scene-spark {
            position: absolute;
            width: 4px; height: 4px;
            background-color: #ff9d21;
            box-shadow: 0 0 4px #ff3c00;
            z-index: 4;
            animation: small-scene-spark-rise 2.5s linear infinite;
          }
        `}
      </style>

      <div style={stageInnerStyle}>
        {/* 背景层 */}
        <div style={bgLayerStyle} />

        {/* 火光 */}
        <div style={fireLightStyle} />

        {/* 粒子容器 */}
        <div ref={sparksContainerRef} style={{ ...layerStyle, zIndex: 4, pointerEvents: "none" }} />

        {/* 角色层 */}
        <div ref={storytellerRef} style={storytellerStyle}>
          <div style={storytellerShadowStyle} />
        </div>

        {/* 氛围遮罩 */}
        <div style={ambientOverlayStyle} />

        {/* 木质对话框 */}
        <div ref={dialogBoxRef} style={dialogBoxStyle}>
          <div style={goldInnerFrameStyle} />
          <div style={speakerNameStyle}>智者老爷爷</div>
          <div ref={textTargetRef} style={dialogTextStyle} />
          <div ref={nextIndicatorRef} style={nextArrowStyle} />
        </div>
      </div>
    </div>
  );
};

export default SmallScene;
