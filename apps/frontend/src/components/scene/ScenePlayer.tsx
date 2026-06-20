/**
 * 过场动画播放器
 *
 * 完全平移 index_1_video.html ~ index_7_video.html 的实现
 * 每个 sceneIndex（1–7）对应一个自包含的场景：
 *   - 16:9 舞台，双重木质/金属边框
 *   - 专用 CSS 粒子 / 动态特效
 *   - 星露谷风格木质对话框 + 逐字打字机 + 点击推进剧情
 *   - 最后一句结束后调用 onComplete
 */

import React, { useCallback, useEffect, useRef, useState } from "react";

// ─── 场景静态配置 ──────────────────────────────────────────────────────────
interface SceneConfig {
  bg: string;
  speaker: string;
  script: string[];
  /** 最后一句后的 endText */
  endText: string;
  charImage?: string;
  /** CSS 关键帧名称（避免全局冲突加前缀） */
  sceneId: string;
}

const SCENES: Record<number, SceneConfig> = {
  1: {
    sceneId: "s1",
    bg: "/video_background/screen_1_background.png",
    speaker: "智者老爷爷",
    charImage: "/scenes/cave_fire/gate_npc.png",
    script: [
      "（众人围坐在跳动的篝火旁，原本冰冷的洞穴渐渐暖和起来……）",
      "看啊，火光照亮了墙上的远古图腾。此时此刻，我们这些原本毫无血缘关系的陌生人，竟能为了同一个信念聚在这里。",
      "这就是语言的力量，这就是我们共同笃信的故事……",
      "那么，我的孩子们，我想问你们一个问题：\n是什么，让智人和其他动物有了根本的不同？",
    ],
    endText: "（等待你的回答……）",
  },
  2: {
    sceneId: "s2",
    bg: "/video_background/screen_2_background.png",
    speaker: "疲惫的老农夫",
    charImage: "/scenes/grain_field/gate_npc.png",
    script: [
      "（烈日炙烤着大地，身后的粮仓明明已经堆满了吃不完的小麦……）",
      "可为什么，我每天还要从日出弯腰劳作到日落？拔不完的杂草，挑不完的水……",
      "明明我们驯化了小麦，获得了更多的食物，可我们的日子却变得比以前更琐碎、更痛苦。",
      "告诉我，这究竟是为什么？\n为什么定居务农的我们，反而比到处流浪的野兽和猎人还要累？",
    ],
    endText: "（小麦正在风中摇曳，等待着你的回答……）",
  },
  3: {
    sceneId: "s3",
    bg: "/video_background/screen_3_background.png",
    speaker: "沉思的市集商人",
    charImage: "/scenes/market_trade/gate_npc.png",
    script: [
      "（喧闹的皮埃尔市集里，两个素不相识、甚至语言不通的陌生人相遇了……）",
      "他们没有剑拔弩张，也没有互相掠夺。仅仅凭借一枚小小的、印着古怪花纹的金币，就完成了交易。",
      "摆在柜台上的，是沉甸甸、能填饱肚子的新鲜蔬菜，和能开山辟地的铁制工具。",
      "可他拿走的，仅仅是一枚金币，或者未来更轻飘飘的一张纸。\n这难道不是魔法吗？",
      "告诉我，是什么赋予了这枚金属如此可怕的法力？\n为什么所有人都会一致相信，一张无法果腹的纸，能买到最真实的食物？",
    ],
    endText: "（金币在阳光下熠熠生辉，等待着你的回答……）",
  },
  4: {
    sceneId: "s4",
    bg: "/video_background/screen_4_background.png",
    speaker: "手持火把的神秘祭司",
    charImage: "/scenes/temple_myth/gate_npc.png",
    script: [
      "（黑夜沉沉，狂风呼啸，几群原本视彼此为死敌、语言不通的陌生人聚集在火堆旁……）",
      "看啊，他们竟然解下了腰间的石斧，放下了沾满血迹的长矛，温顺地席地而坐。",
      "逼迫他们屈服的不是锁链，吸引他们的也不是甘露。仅仅是因为，他们都在注视着岩壁上那个泥土画出的符号。",
      "他们都在聆听我口中所讲述的、关于那个活在云端与雷电中的神明灵兽的神话。",
      "告诉我，这难道不是这个世界上最可怕的巫术吗？",
      "为什么一个看不见、摸不着、甚至根本不存在的虚构谎言……\n却能让成千上万个毫无血缘的陌生人，从此彻底信任彼此，并肩协作？！",
    ],
    endText: "（火焰噼啪作响，远古的神明在阴影中沉默，等待着你的回答……）",
  },
  5: {
    sceneId: "s5",
    bg: "/video_background/screen_5_background.png",
    speaker: "虔诚的石碑书记官",
    charImage: "/scenes/stone_law/gate_npc.png",
    script: [
      "（庄严的帝国大殿内，原本互相制衡的三个阶层破天荒地站在了同一侧……）",
      "手握生杀大权的法官、富可敌国的商人、以及重甲披身的士兵。他们竟然同时向一块石头致敬。",
      "那块石碑上没有写下神明的名字，也没有画着丰盛的食物，它空无一字，只刻着一个古怪的秩序符号。",
      "但这三个掌握着世俗最强力量的人，却甘愿受其驱使，只因为他们共同承认这上面的\u201c规则\u201d。",
      "这难道不是人类历史上最庞大的集体幻觉吗？",
      "告诉我，为什么国家、法律和公司在现实中明明连一个实体细胞都没有……\n却能像故事一样被写在纸上，就能驱使千万人为之生、为之死、为之日夜运转？！",
    ],
    endText: "（抽象符号静静散发着冰蓝色的流光，冷酷地俯瞰着众生……）",
  },
  6: {
    sceneId: "s6",
    bg: "/video_background/screen_6_background.png",
    speaker: "满脸困惑的皇帝信使",
    charImage: "/scenes/empire_gate/gate_npc.png",
    script: [
      "（夕阳如血，帝国的铁骑在一片废墟中踏入大门，他们是不可战胜的胜利者……）",
      "看啊，将军手持着那柄沾满敌人鲜血的长剑，他的靴子践踏着这座古老城市的法则。",
      "可为什么，随着他走过那道阴暗的城门，他身上的精钢铠甲却在被风化、溶解？",
      "他的身后，没有披上我们帝国的猩红战袍，反而换上了被征服者那带有丝绸花纹的古老长衫。",
      "他扔掉了战鼓，拿起了敌人的琴弦；他忘记了家乡的话语，开始念诵这片土地的神明谶言。",
      "告诉我，这难道不是历史最讽刺的诡计吗？\n为什么军事上的绝对征服者，最终却总会被沦为奴隶的被征服者的文化，反向吞噬、彻底改变？！",
    ],
    endText: "（金色的尘埃在空气中沉浮，远古的乐曲悄然响起，同化在无声中继续……）",
  },
  7: {
    sceneId: "s7",
    bg: "/video_background/screen_7_background.png",
    speaker: "观星者",
    script: [
      "（这里记载了先祖们关于星空的全部答案，但每一行都写满了对未知的傲慢。）",
      "（伸手擦除……）",
      "\u201c我不知道。\u201d",
      "（当旧的傲慢被擦掉，空白处竟生出了新的齿轮与透镜。）",
      "为什么承认无知，反而成了人类历史上最强大的力量？",
    ],
    endText: "（星空在沉默中等待着你的答案……）",
  },
};

// ─── 节点 ID → 场景映射 ────────────────────────────────────────────────────
export const NODE_SCENE_MAP: Record<string, number> = {
  n_cog_rev: 1,
  n_agri_rev: 2,
  n_money: 3,
  n_imagined_order: 4,
  n_capitalism: 5,
  n_empire: 6,
  n_sci_rev: 7,
};

// ─── 组件 ──────────────────────────────────────────────────────────────────
interface ScenePlayerProps {
  sceneIndex: number;
  onComplete: () => void;
}

const ScenePlayer: React.FC<ScenePlayerProps> = ({ sceneIndex, onComplete }) => {
  const config = SCENES[sceneIndex];

  const dialogRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const charRef = useRef<HTMLDivElement>(null);
  const particleContainerRef = useRef<HTMLDivElement>(null);
  const gearRef = useRef<HTMLDivElement>(null);

  const stepRef = useRef(0);
  const typingTimers = useRef<number[]>([]);
  const particleTimers = useRef<number[]>([]);

  const [dialogVisible, setDialogVisible] = useState(false);
  const [charVisible, setCharVisible] = useState(false);
  const [endGlow, setEndGlow] = useState<string | undefined>(undefined);

  const clearTimers = useCallback(() => {
    for (const t of typingTimers.current) window.clearTimeout(t);
    typingTimers.current = [];
    for (const t of particleTimers.current) window.clearTimeout(t);
    particleTimers.current = [];
  }, []);

  const typeWriter = useCallback((text: string, idx = 0) => {
    if (!textRef.current) return;
    if (nextRef.current) nextRef.current.style.display = "none";
    if (idx < text.length) {
      textRef.current.textContent = text.substring(0, idx + 1);
      const t = window.setTimeout(() => typeWriter(text, idx + 1), 40);
      typingTimers.current.push(t);
    } else {
      if (nextRef.current) nextRef.current.style.display = "block";
    }
  }, []);

  // 粒子系统：场景 1 篝火火星
  const spawnSpark = useCallback(() => {
    if (!particleContainerRef.current) return;
    const p = document.createElement("div");
    p.className = `${config.sceneId}-spark`;
    p.style.left = `${47 + Math.random() * 4}%`;
    p.style.bottom = `${50 + Math.random() * 4}%`;
    const dur = 1.5 + Math.random() * 1.5;
    p.style.animationDuration = `${dur}s`;
    particleContainerRef.current.appendChild(p);
    const t = window.setTimeout(() => p.remove(), dur * 1000);
    particleTimers.current.push(t);
  }, [config.sceneId]);

  // 粒子系统：场景 2 汗水（从 NPC 头部滴落，NPC 位于 right:8%/bottom:30%，120×120）
  const spawnSweat = useCallback(() => {
    if (!particleContainerRef.current) return;
    const p = document.createElement("div");
    p.className = `${config.sceneId}-sweat`;
    p.style.left = `${74 + Math.random() * 5}%`;
    p.style.top = `${48 + Math.random() * 4}%`;
    const dur = 0.8 + Math.random() * 0.5;
    p.style.animationDuration = `${dur}s`;
    particleContainerRef.current.appendChild(p);
    const t = window.setTimeout(() => p.remove(), 1200);
    particleTimers.current.push(t);
  }, [config.sceneId]);

  // 粒子系统：场景 3 金币闪烁
  const spawnCoinGlint = useCallback(() => {
    if (!particleContainerRef.current) return;
    const p = document.createElement("div");
    p.className = `${config.sceneId}-coinglint`;
    p.style.left = `${44 + Math.random() * 6}%`;
    p.style.top = `${53 + Math.random() * 5}%`;
    particleContainerRef.current.appendChild(p);
    const t = window.setTimeout(() => p.remove(), 1000);
    particleTimers.current.push(t);
  }, [config.sceneId]);

  // 粒子系统：场景 6 历史尘埃
  const spawnDust = useCallback(() => {
    if (!particleContainerRef.current) return;
    const p = document.createElement("div");
    p.className = `${config.sceneId}-dust`;
    const size = Math.random() * 4 + 2;
    p.style.width = `${size}px`;
    p.style.height = `${size}px`;
    p.style.left = `${Math.random() * 100}%`;
    const dur = Math.random() * 3 + 3;
    p.style.animationDuration = `${dur}s`;
    particleContainerRef.current.appendChild(p);
    const t = window.setTimeout(() => p.remove(), dur * 1000);
    particleTimers.current.push(t);
  }, [config.sceneId]);

  // 粒子系统：场景 7 擦除残影
  const spawnEraseDust = useCallback(() => {
    if (!stageRef.current) return;
    for (let i = 0; i < 30; i++) {
      const p = document.createElement("div");
      p.className = `${config.sceneId}-erase`;
      p.style.left = `${Math.random() * 80 + 10}%`;
      p.style.top = `${Math.random() * 60 + 10}%`;
      stageRef.current.appendChild(p);
      const t = window.setTimeout(() => p.remove(), 1000);
      particleTimers.current.push(t);
    }
  }, [config.sceneId]);

  // 配置粒子启动
  const startParticles = useCallback(() => {
    let interval: number | undefined;

    if (sceneIndex === 1) {
      interval = window.setInterval(spawnSpark, 300);
    } else if (sceneIndex === 2) {
      interval = window.setInterval(spawnSweat, 600);
    } else if (sceneIndex === 3) {
      interval = window.setInterval(spawnCoinGlint, 500);
    } else if (sceneIndex === 6) {
      interval = window.setInterval(spawnDust, 150);
    }

    if (interval !== undefined) {
      particleTimers.current.push(interval);
    }
  }, [sceneIndex, spawnSpark, spawnSweat, spawnCoinGlint, spawnDust]);

  // 主 useEffect：启动导演流程
  useEffect(() => {
    stepRef.current = 0;
    clearTimers();

    startParticles();

    const timers: number[] = [];

    if (sceneIndex === 1) {
      // 1.5s 后角色淡入
      timers.push(window.setTimeout(() => setCharVisible(true), 1500));
      // 3.5s 后对话框弹出
      timers.push(
        window.setTimeout(() => {
          setDialogVisible(true);
          typeWriter(config.script[0]);
        }, 3500),
      );
    } else if (sceneIndex === 7) {
      // 场景 7：没有淡入过渡，直接显示
      setDialogVisible(true);
      // 用 setTimeout 确保 ref 就绪
      timers.push(
        window.setTimeout(() => {
          triggerScene7(0);
        }, 100),
      );
    } else {
      // 其他场景：直接显示对话框和角色
      if (charRef.current) setCharVisible(true);
      setDialogVisible(true);
      timers.push(
        window.setTimeout(() => {
          typeWriter(config.script[0]);
        }, 500),
      );
    }

    // 点击对话框推进剧情
    const handleClick = () => {
      clearTimers();
      typingTimers.current = [];

      const step = stepRef.current;
      if (sceneIndex === 7) {
        triggerScene7(step + 1);
        return;
      }

      if (step < config.script.length - 1) {
        stepRef.current = step + 1;
        typeWriter(config.script[step + 1]);
      } else {
        endScene();
      }
    };

    const box = dialogRef.current;
    if (box) box.addEventListener("click", handleClick);

    // 30 秒超时自动结束
    const hardT = window.setTimeout(() => {
      endScene();
    }, 30000);
    particleTimers.current.push(hardT);

    return () => {
      if (box) box.removeEventListener("click", handleClick);
      clearTimers();
      for (const t of timers) window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 场景 7 专用触发
  const triggerScene7 = useCallback(
    (step: number) => {
      stepRef.current = step;
      if (!textRef.current) return;
      if (step < config.script.length) {
        textRef.current.textContent = config.script[step];
        if (step === 1) spawnEraseDust();
        if (step === 3 && gearRef.current) {
          gearRef.current.style.opacity = "1";
          gearRef.current.style.transform = "scale(1.2)";
        }
      } else {
        endScene();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.script, spawnEraseDust],
  );

  // 结束场景
  const endScene = useCallback(() => {
    clearTimers();
    if (textRef.current) textRef.current.textContent = config.endText;
    if (nextRef.current) nextRef.current.style.display = "none";
    setEndGlow(
      sceneIndex === 1
        ? "0 0 20px #ff9d21"
        : sceneIndex === 2
          ? "0 0 20px #ff3c00"
          : sceneIndex === 3
            ? "0 0 25px #ffdf3b"
            : sceneIndex === 4
              ? "0 0 25px #ff5100"
              : sceneIndex === 5
                ? "0 0 25px #8cd2ff"
                : sceneIndex === 6
                  ? "0 0 25px #dad120"
                  : "0 0 25px #aaddff",
    );

    // 0.8s 后渐隐
    const fadeT = window.setTimeout(() => {
      if (stageRef.current) stageRef.current.style.opacity = "0";
      const endT = window.setTimeout(() => onComplete(), 900);
      particleTimers.current.push(endT);
    }, 800);
    particleTimers.current.push(fadeT);
  }, [clearTimers, config.endText, onComplete, sceneIndex]);

  if (!config) return null;

  // ─── 场景特有 CSS ──────────────────────────────────────────────────────
  const sid = config.sceneId;

  return (
    <div
      ref={stageRef}
      style={{
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
      }}
    >
      <style>{`
        /* ─── 通用关键帧 ─── */
        @keyframes ${sid}-fire-breath {
          0% { transform: translate(-50%, -50%) scale(0.95); opacity: 0.9; }
          100% { transform: translate(-50%, -50%) scale(1.05); opacity: 1; }
        }
        @keyframes ${sid}-arrow-bounce {
          0% { transform: translateY(0); }
          100% { transform: translateY(5px); }
        }

        /* ─── 场景 1：篝火火星 ─── */
        .${sid}-spark {
          position: absolute;
          width: 4px; height: 4px;
          background-color: #ff9d21;
          box-shadow: 0 0 4px #ff3c00;
          z-index: 4;
          animation: ${sid}-spark-rise 2.5s linear infinite;
        }
        @keyframes ${sid}-spark-rise {
          0% { transform: translateY(0) translateX(0); opacity: 1; }
          50% { transform: translateY(-50px) translateX(10px); opacity: 0.8; }
          100% { transform: translateY(-120px) translateX(-5px); opacity: 0; }
        }

        /* ─── 场景 2：汗水 ─── */
        .${sid}-sweat {
          position: absolute;
          width: 3px; height: 5px;
          background-color: #aae2ff;
          z-index: 102;
          animation: ${sid}-sweat-drop 1.2s cubic-bezier(0.6, -0.28, 0.735, 0.045) infinite;
        }
        @keyframes ${sid}-sweat-drop {
          0% { transform: translateY(0) scaleY(1); opacity: 0; }
          30% { opacity: 1; }
          100% { transform: translateY(30px) scaleY(1.5); opacity: 0; }
        }

        /* ─── 场景 3：金币闪烁 ─── */
        .${sid}-coinglint {
          position: absolute;
          width: 6px; height: 6px;
          background-color: #fff;
          box-shadow: 0 0 6px #ffdf3b, 0 0 12px #ff9600;
          z-index: 6;
          animation: ${sid}-sparkle 1s infinite steps(4);
        }
        @keyframes ${sid}-sparkle {
          0%, 100% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.5) rotate(45deg); opacity: 1; }
        }

        /* ─── 场景 4：图腾呼吸 ─── */
        .${sid}-totem {
          position: absolute;
          left: 40%; top: 12%;
          width: 80px; height: 80px;
          z-index: 4;
          background: radial-gradient(circle, rgba(145, 255, 0, 0.8) 0%, rgba(255, 200, 0, 0) 70%);
          mix-blend-mode: screen;
          animation: ${sid}-totem-glow 3s infinite ease-in-out;
        }
        @keyframes ${sid}-totem-glow {
          0%, 100% { transform: translateX(-50%) scale(0.9); opacity: 0.4; }
          50% { transform: translateX(-50%) scale(1.2); opacity: 0.9; filter: drop-shadow(0 0 15px #00ff15); }
        }
        .${sid}-fire-flicker {
          animation: ${sid}-flicker 0.15s infinite alternate ease-in-out;
        }
        @keyframes ${sid}-flicker {
          0% { opacity: 0.85; transform: scale(1); }
          100% { opacity: 1; transform: scale(1.01); }
        }
        .${sid}-char {
          animation: ${sid}-float 1.5s infinite alternate ease-in-out;
        }
        @keyframes ${sid}-float {
          0% { transform: translateX(-50%) translateY(0); }
          100% { transform: translateX(-50%) translateY(-2px); }
        }

        /* ─── 场景 5：石碑符号呼吸 ─── */
        .${sid}-monument {
          position: absolute;
          left: 50%; top: 36%;
          width: 70px; height: 70px;
          z-index: 4;
          background: radial-gradient(circle, #ffffff 0%, #00a2ff 40%, rgba(0, 100, 255, 0) 70%);
          mix-blend-mode: screen;
          animation: ${sid}-symbol-pulse 2.5s infinite ease-in-out;
        }
        @keyframes ${sid}-symbol-pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(0.85); opacity: 0.4; }
          50% { transform: translate(-50%, -50%) scale(1.15); opacity: 0.8; filter: drop-shadow(0 0 12px #8cd2ff); }
        }

        /* ─── 场景 6：历史尘埃 ─── */
        .${sid}-dust {
          position: absolute;
          background-color: rgba(255, 215, 0, 0.4);
          box-shadow: 0 0 6px #ffd700;
          border-radius: 50%;
          z-index: 4;
          animation: ${sid}-dust-float 4s linear infinite;
        }
        @keyframes ${sid}-dust-float {
          0% { transform: translateY(110%) translateX(0) scale(1); opacity: 0; }
          50% { opacity: 0.7; }
          100% { transform: translateY(-10%) translateX(30px) scale(0.5); opacity: 0; }
        }

        /* ─── 场景 7：擦除残影 ─── */
        .${sid}-erase {
          position: absolute;
          background: #dcdcdc;
          width: 4px; height: 4px;
          pointer-events: none;
          z-index: 6;
          animation: ${sid}-erase-out 1s forwards;
        }
        @keyframes ${sid}-erase-out {
          to { opacity: 0; transform: translateY(20px); }
        }

        /* ─── 角色呼吸动画（场景 2） ─── */
        .${sid}-breath {
          animation: ${sid}-heavy-breathe 0.8s infinite alternate ease-in-out;
        }
        @keyframes ${sid}-heavy-breathe {
          0% { transform: translateX(-50%) scaleY(1); }
          100% { transform: translateX(-50%) scaleY(0.93) translateY(4px); }
        }

        /* ─── 角色微点头（场景 3） ─── */
        .${sid}-nod {
          animation: ${sid}-merchant-nod 1.2s infinite alternate ease-in-out;
        }
        @keyframes ${sid}-merchant-nod {
          0% { transform: translateY(0); }
          100% { transform: translateY(3px); }
        }

        /* ─── 场景 5 角色 ─── */
        .${sid}-scribe-float {
          animation: ${sid}-scribe-float 1.8s infinite alternate ease-in-out;
        }
        @keyframes ${sid}-scribe-float {
          0% { transform: translateY(0); }
          100% { transform: translateY(3px); }
        }

        /* ─── 场景 6 角色 ─── */
        .${sid}-emperor-float {
          animation: ${sid}-emperor-float 2s infinite alternate ease-in-out;
        }
        @keyframes ${sid}-emperor-float {
          0% { transform: translateY(0); }
          100% { transform: translateY(3px); }
        }

        /* ─── 场景 1 角色 ─── */
        .${sid}-storyteller-float {
          animation: ${sid}-char-float 2s infinite ease-in-out;
        }
        @keyframes ${sid}-char-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
      `}</style>

      {/* ─── 舞台内框 ─── */}
      <div
        style={{
          position: "relative",
          width: "100vw",
          height: "56.25vw",
          maxWidth: "100vh",
          maxHeight: "56.25vh",
          backgroundColor: sceneIndex === 2 ? "#ffd56b" : sceneIndex === 3 ? "#7c4c24" : sceneIndex === 7 ? "#0f0f12" : "#1a1016",
          boxShadow:
            sceneIndex === 2
              ? "none"
              : sceneIndex === 7
                ? "inset 0 0 0 8px #4a4a4a, inset 0 0 0 14px #1a1a1a, 0 15px 40px rgba(0,0,0,0.9)"
                : "inset 0 0 0 8px #b56c27, inset 0 0 0 14px #492310, 0 15px 40px rgba(0,0,0,0.9)",
          border: sceneIndex === 2 ? "6px solid #492310" : "none",
          outline: sceneIndex === 2 ? "6px solid #b56c27" : "none",
          imageRendering: "pixelated",
          overflow: "hidden",
        }}
      >
        {/* ─── 背景 ─── */}
        <div
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            top: 0,
            left: 0,
            backgroundImage: `url(${config.bg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            zIndex: 2,
          }}
        />

        {/* ─── 特效层 ─── */}
        {/* 场景 1：篝火光源 */}
        {sceneIndex === 1 && (
          <div
            style={{
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
              zIndex: 3,
              animation: `${sid}-fire-breath 0.15s infinite alternate`,
            }}
          />
        )}

        {/* 场景 1 粒子容器 */}
        {sceneIndex === 1 && (
          <div
            ref={particleContainerRef}
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              top: 0,
              left: 0,
              zIndex: 4,
              pointerEvents: "none",
            }}
          />
        )}

        {/* 场景 4：图腾呼吸 */}
        {sceneIndex === 4 && <div className={`${sid}-totem`} />}

        {/* 场景 5：石碑符号 */}
        {sceneIndex === 5 && <div className={`${sid}-monument`} />}

        {/* 场景 7：科学齿轮 */}
        {sceneIndex === 7 && (
          <div
            ref={gearRef}
            style={{
              position: "absolute",
              right: "38%",
              top: "15%",
              width: 120,
              height: 120,
              background:
                "radial-gradient(circle, #aaddff 0%, rgba(0,0,0,0) 70%)",
              opacity: 0,
              transition: "opacity 2s ease-in, transform 2s ease-in-out",
              zIndex: 7,
            }}
          />
        )}

        {/* 场景 2 粒子容器（z-index 高于角色层 101，确保汗水在 NPC 之上） */}
        {(sceneIndex === 2 || sceneIndex === 3 || sceneIndex === 6) && (
          <div
            ref={particleContainerRef}
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              top: 0,
              left: 0,
              zIndex: 110,
              pointerEvents: "none",
            }}
          />
        )}

        {/* ─── 角色层 ─── */}
        {sceneIndex !== 7 && config.charImage && (
          <div
            ref={charRef}
            style={{
              position: "absolute",
              bottom: "30%",
              right: "8%",
              width: 120,
              height: 120,
              backgroundImage: `url(${config.charImage})`,
              backgroundSize: "contain",
              backgroundRepeat: "no-repeat",
              zIndex: 101,
              transition: "opacity 1.5s ease-in-out",
              opacity: charVisible ? 1 : 0,
              pointerEvents: "none",
              transform: "scaleX(-1)",
            }}
            className={
              sceneIndex === 1
                ? `${sid}-storyteller-float`
                : sceneIndex === 2
                  ? `${sid}-breath`
                  : sceneIndex === 3
                    ? `${sid}-nod`
                    : sceneIndex === 4
                      ? `${sid}-char`
                      : sceneIndex === 5
                        ? `${sid}-scribe-float`
                        : sceneIndex === 6
                          ? `${sid}-emperor-float`
                          : ""
            }
          >
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: "15%",
                width: "70%",
                height: 12,
                background: "rgba(0, 0, 0, 0.4)",
                borderRadius: "50%",
                zIndex: -1,
              }}
            />
          </div>
        )}

        {/* ─── 氛围遮罩 ─── */}
        <div
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            top: 0,
            left: 0,
            pointerEvents: "none",
            zIndex: sceneIndex === 1 ? 10 : 5,
            ...(sceneIndex === 1
              ? {
                  background:
                    "radial-gradient(circle at 25% 70%, rgba(0,0,0,0) 10%, rgba(15, 8, 30, 0.85) 60%)",
                  mixBlendMode: "multiply",
                }
              : sceneIndex === 2
                ? {
                    background:
                      "linear-gradient(180deg, rgba(255, 200, 50, 0.15) 0%, rgba(73, 35, 16, 0.3) 100%)",
                  }
                : sceneIndex === 3
                  ? {
                      background:
                        "radial-gradient(circle at 50% 50%, rgba(255, 220, 100, 0.1) 0%, rgba(26, 15, 8, 0.4) 100%)",
                    }
                  : sceneIndex === 4
                    ? {
                        background:
                          "radial-gradient(circle at 50% 65%, rgba(255, 132, 38, 0.25) 0%, rgba(10, 6, 15, 0.4) 100%)",
                        mixBlendMode: "overlay" as const,
                      }
                    : sceneIndex === 5
                      ? {
                          background:
                            "radial-gradient(circle at 50% 40%, rgba(100, 180, 255, 0.15) 0%, rgba(12, 10, 18, 0.45) 100%)",
                          mixBlendMode: "overlay" as const,
                        }
                      : sceneIndex === 6
                        ? {
                            background:
                              "linear-gradient(180deg, rgba(139, 0, 0, 0.15) 0%, rgba(218, 165, 32, 0.2) 100%)",
                            mixBlendMode: "overlay" as const,
                          }
                        : {}),
          }}
          className={sceneIndex === 4 ? `${sid}-fire-flicker` : undefined}
        />

        {/* ─── 对话框 ─── */}
        <div
          ref={dialogRef}
          style={{
            position: "absolute",
            bottom: sceneIndex === 7 ? "6%" : "5%",
            left: "5%",
            right: "5%",
            height: "auto",
            minHeight: sceneIndex === 7 ? 120 : 100,
            maxHeight: "35%",
            backgroundColor: sceneIndex === 7 ? "#e0e0e0" : "#fce1b5",
            border: `4px solid ${sceneIndex === 7 ? "#333" : "#b56c27"}`,
            boxShadow: endGlow
              ? endGlow
              : sceneIndex === 7
                ? "0 8px 0 rgba(0,0,0,0.3)"
                : "0 0 0 4px #eeb069, 0 8px 0 rgba(0,0,0,0.4)",
            zIndex: 100,
            padding: sceneIndex === 7 ? "20px" : "20px 30px",
            display: "flex",
            flexDirection: "column",
            opacity: dialogVisible ? 1 : 0,
            transform: dialogVisible ? "translateY(0)" : "translateY(20px)",
            transition: sceneIndex === 1 ? "all 0.5s ease-out" : "opacity 0.5s ease-out",
            cursor: "pointer",
          }}
        >
          {/* 金色/亮色内框（场景 7 不用） */}
          {sceneIndex !== 7 && (
            <div
              style={{
                position: "absolute",
                top: 4,
                left: 4,
                right: 4,
                bottom: 4,
                border: "2px solid #da9100",
                pointerEvents: "none",
              }}
            />
          )}

          <div
            style={{
              fontSize: "1.2rem",
              color: sceneIndex === 7 ? "#1a1a1a" : "#803800",
              marginBottom: sceneIndex === 7 ? 5 : 8,
              fontWeight: "bold",
              textShadow: sceneIndex === 7 ? "none" : "1px 1px 0px #fff",
            }}
          >
            {config.speaker}
          </div>
          <div
            ref={textRef}
            style={{
              fontSize: "1.1rem",
              color: sceneIndex === 7 ? "#333" : "#492310",
              lineHeight: 1.5,
              whiteSpace: "pre-line",
            }}
          />
          {sceneIndex !== 7 && (
            <div
              ref={nextRef}
              style={{
                position: "absolute",
                bottom: 12,
                right: 20,
                width: 0,
                height: 0,
                borderLeft: "8px solid transparent",
                borderRight: "8px solid transparent",
                borderTop: "12px solid #492310",
                animation: `${sid}-arrow-bounce 0.4s infinite alternate`,
                display: "none",
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ScenePlayer;
