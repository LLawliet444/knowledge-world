/**
 * IntroGuide — 节点引导对话 + 卷轴阅读 + 收尾确认
 *
 * 完整覆盖流程：
 *   ① 引导对话（scholar ↔ mentor, 5句）
 *   ② 三张卷轴各自独立点击展开（pick_card.html 风格）
 *   ③ 收尾对话（2句）+ 选择关键卷轴
 */

import React, { useCallback, useRef, useState } from "react";
import type { DialogueLine, WhatScroll } from "../../types/world";

type IntroPhase = "dialogue" | "scroll" | "wrapup" | "confirm";

interface IntroGuideProps {
  dialogue: DialogueLine[];
  scrolls: WhatScroll[];
  wrapUp: DialogueLine[];
  onComplete: (choice: "definition" | "example" | "bridge") => void;
  onSkip: () => void;
}

const SPEAKER_CFG = {
  scholar: { name: "学徒", avatar: "/characters/scholar_stand.png", emoji: "🧑" },
  mentor: { name: "老学者", avatar: "/characters/mentor_old_scholar.png", emoji: "🧙" },
} as const;

// ─── 打字机 Hook ────────────────────────────────────────────────────────────

function useTypeWriter(text: string, speed = 45) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback((newText: string) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setDisplayed("");
    setDone(false);
    let idx = 0;
    timerRef.current = setInterval(() => {
      idx++;
      setDisplayed(newText.substring(0, idx));
      if (idx >= newText.length) {
        if (timerRef.current) clearInterval(timerRef.current);
        setDone(true);
      }
    }, speed);
  }, [speed]);

  const skip = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setDisplayed(text);
    setDone(true);
  }, [text]);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  return { displayed, done, start, skip, cleanup };
}

// ─── 卷轴组件（pick_card.html 风格） ─────────────────────────────────────

const PickScroll: React.FC<{
  scroll: WhatScroll;
  opened: boolean;
  isActive: boolean;
  onClick: (e: React.MouseEvent) => void;
}> = ({ scroll, opened, isActive, onClick }) => {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        cursor: opened ? "default" : "pointer",
        position: "relative",
        transition: "transform 0.2s",
        transform: isActive ? "translateY(-8px)" : "none",
        height: 190,
        flexShrink: 0,
      }}
    >
      {/* 左木轴手柄 */}
      <div
        style={{
          width: 12,
          height: 190,
          background: "linear-gradient(90deg, #8a5a1a, #b56c27, #8a5a1a)",
          borderRadius: 4,
          boxShadow: "2px 0 8px rgba(0,0,0,0.3)",
          flexShrink: 0,
          zIndex: 2,
          position: "relative",
        }}
      />

      {/* 卷轴主体 */}
      <div
        style={{
          height: 170,
          background: opened ? "#fce1b5" : "#c8942a",
          borderLeft: "4px solid #b56c27",
          borderRight: "4px solid #b56c27",
          boxShadow: opened
            ? "inset 0 0 0 2px #da9100, 0 8px 16px rgba(0,0,0,0.25)"
            : "inset 0 0 0 2px #8a5a1a",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          maxWidth: opened ? 260 : 0,
          opacity: opened ? 1 : 0.7,
          transition:
            "max-width 1.2s cubic-bezier(0.22, 1, 0.36, 1), background 0.3s, opacity 0.6s",
          padding: opened ? "8px 14px" : 0,
        }}
      >
        {opened && (
          <>
            <div
              style={{
                fontSize: 11,
                fontWeight: "bold",
                color: "#492310",
                fontFamily: "'Zpix', 'Press Start 2P', monospace",
                marginBottom: 6,
                textAlign: "center",
                whiteSpace: "nowrap",
              }}
            >
              📜 {scroll.title}
            </div>
            <div
              style={{
                fontSize: 10,
                color: "#492310",
                fontFamily: "'Zpix', 'Press Start 2P', monospace",
                lineHeight: 1.6,
                textAlign: "center",
                whiteSpace: "pre-line",
              }}
            >
              {scroll.content}
            </div>
          </>
        )}
      </div>

      {/* 右木轴手柄 */}
      <div
        style={{
          width: 12,
          height: 190,
          background: "linear-gradient(90deg, #8a5a1a, #b56c27, #8a5a1a)",
          borderRadius: 4,
          boxShadow: "-2px 0 8px rgba(0,0,0,0.3)",
          flexShrink: 0,
          zIndex: 2,
          position: "relative",
        }}
      />

      {/* 关闭状态提示 */}
      {!opened && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            fontSize: 9,
            color: "#492310",
            fontWeight: "bold",
            textShadow: "1px 1px 0 #eeb069",
            fontFamily: "'Zpix', 'Press Start 2P', monospace",
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          点击展开
        </div>
      )}
    </div>
  );
};

// ─── 主组件 ─────────────────────────────────────────────────────────────────

const IntroGuide: React.FC<IntroGuideProps> = ({
  dialogue,
  scrolls,
  wrapUp,
  onComplete,
  onSkip,
}) => {
  const [phase, setPhase] = useState<IntroPhase>("dialogue");
  const [lineIdx, setLineIdx] = useState(0);
  const [openedMask, setOpenedMask] = useState<boolean[]>([
    false,
    false,
    false,
  ]);
  const [activeScrollIdx, setActiveScrollIdx] = useState(0);
  const [showConfirmBtn, setShowConfirmBtn] = useState(false);
  const [confirmPhase, setConfirmPhase] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  // 打字机
  const typer = useTypeWriter("", 45);

  // 最新打字机文本
  const getTypeText = useCallback(() => {
    if (phase === "scroll") {
      return scrolls[activeScrollIdx]?.mentorVoice ?? "";
    }
    const lines = phase === "dialogue" ? dialogue : wrapUp;
    return lines[lineIdx]?.text ?? "";
  }, [phase, activeScrollIdx, scrolls, lineIdx, dialogue, wrapUp]);

  const text = getTypeText();

  // 切换文本时重启打字机
  const prevTextRef = useRef("");
  if (text !== prevTextRef.current) {
    prevTextRef.current = text;
    typer.start(text);
  }

  const activeSpeaker =
    phase === "scroll" ? "mentor" : (phase === "dialogue" ? dialogue : wrapUp)[lineIdx]?.speaker ?? "mentor";

  const allOpened = openedMask.every(Boolean);

  // ── 点击背景推进 ───
  const handleClick = useCallback(() => {
    if (phase === "confirm") return;

    if (!typer.done) {
      typer.skip();
      return;
    }

    if (phase === "dialogue") {
      if (lineIdx < dialogue.length - 1) {
        setLineIdx((i) => i + 1);
      } else {
        setPhase("scroll");
      }
      return;
    }

    if (phase === "scroll") {
      if (allOpened) {
        // 所有卷轴已展开 → 进入收尾
        setPhase("wrapup");
        setLineIdx(0);
      }
      // 还有未展开的卷轴：点击背景不做任何事，用户需点击卷轴
      return;
    }

    if (phase === "wrapup") {
      if (lineIdx < wrapUp.length - 1) {
        setLineIdx((i) => i + 1);
      } else {
        setShowConfirmBtn(true);
      }
      return;
    }
  }, [phase, typer, lineIdx, dialogue.length, allOpened, wrapUp.length]);

  // ── 点击卷轴展开 ───
  const handleScrollClick = useCallback(
    (idx: number) => {
      if (openedMask[idx]) return; // 已展开的忽略
      const next = [...openedMask];
      next[idx] = true;
      setOpenedMask(next);
      setActiveScrollIdx(idx);
    },
    [openedMask],
  );

  const handleStartConfirm = useCallback(() => {
    setConfirmPhase(true);
    setPhase("confirm");
  }, []);

  const handleSelect = useCallback(
    (type: "definition" | "example" | "bridge") => {
      setSelected(type);
      setTimeout(() => onComplete(type), 500);
    },
    [onComplete],
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        cursor: phase === "confirm" ? "default" : "pointer",
        fontFamily: "'Zpix', 'Press Start 2P', 'Microsoft YaHei', monospace",
      }}
      onClick={handleClick}
    >
      {/* 跳过按钮 */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          // 跳过当前阶段，进入选择卷轴（scroll）
          // 永不调用 onSkip（那会打开已废弃的老对话框）
          if (phase === "dialogue") {
            setPhase("scroll");
            return;
          }
          if (phase === "scroll") {
            // 已在卷轴阶段：跳过阅读，进入收尾
            setOpenedMask([true, true, true]);
            setPhase("wrapup");
            setLineIdx(0);
            return;
          }
          if (phase === "wrapup") {
            setShowConfirmBtn(true);
            return;
          }
          // confirm 阶段不处理
        }}
        style={{
          position: "absolute",
          top: 16,
          right: 24,
          background: "none",
          border: "none",
          color: "#c8a87a",
          fontSize: 13,
          cursor: "pointer",
          textShadow: "2px 2px 2px rgba(0,0,0,0.8)",
          zIndex: 100,
        }}
      >
        [ 跳过引导 ]
      </button>

      {/* ── 卷轴区 ── */}
      {phase === "scroll" && (
        <div
          style={{
            display: "flex",
            gap: 48,
            alignItems: "center",
            justifyContent: "center",
            width: "90%",
            maxWidth: 960,
            marginBottom: 20,
            flexWrap: "wrap",
          }}
        >
          {scrolls.map((s, i) => (
            <PickScroll
              key={s.type}
              scroll={s}
              opened={openedMask[i]}
              isActive={i === activeScrollIdx}
              onClick={(e) => { e.stopPropagation(); handleScrollClick(i); }}
            />
          ))}
        </div>
      )}

      {/* ── 底部对话区 ── */}
      {phase !== "confirm" && (
        <div
          style={{
            width: "90%",
            maxWidth: 900,
            marginBottom: "5%",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 40,
              justifyContent: "center",
              marginBottom: -8,
              position: "relative",
              zIndex: 2,
            }}
          >
            <SpeakerAvatar
              cfg={SPEAKER_CFG.scholar}
              active={activeSpeaker === "scholar"}
            />
            <SpeakerAvatar
              cfg={SPEAKER_CFG.mentor}
              active={activeSpeaker === "mentor"}
            />
          </div>

          <div
            style={{
              backgroundColor: "#fce1b5",
              border: "4px solid #b56c27",
              boxShadow: "0 0 0 4px #eeb069, 0 8px 0 rgba(0,0,0,0.4)",
              padding: "20px 28px",
              minHeight: 110,
              position: "relative",
              zIndex: 1,
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 4, left: 4, right: 4, bottom: 4,
                border: "2px solid #da9100",
                pointerEvents: "none",
              }}
            />

            <div
              style={{
                fontSize: 14,
                color: "#803800",
                marginBottom: 8,
                fontWeight: "bold",
                textShadow: "1px 1px 0px #fff",
              }}
            >
              {activeSpeaker === "scholar"
                ? `${SPEAKER_CFG.scholar.emoji} ${SPEAKER_CFG.scholar.name}`
                : `${SPEAKER_CFG.mentor.emoji} ${SPEAKER_CFG.mentor.name}`}
            </div>

            {/* 卷轴阶段提示 */}
            {phase === "scroll" && !allOpened && !openedMask[activeScrollIdx] && (
              <div
                style={{
                  fontSize: 14,
                  color: "#803800",
                  lineHeight: 1.6,
                  fontStyle: "italic",
                }}
              >
                点击上方卷轴展开查看
              </div>
            )}

            {(phase === "scroll" && openedMask[activeScrollIdx]) || phase !== "scroll" ? (
              <div
                style={{
                  fontSize: 14,
                  color: "#492310",
                  lineHeight: 1.6,
                  whiteSpace: "pre-line",
                }}
              >
                {typer.displayed}
              </div>
            ) : null}

            {!typer.done && openedMask[activeScrollIdx] && (
              <div
                style={{
                  position: "absolute",
                  bottom: 12,
                  right: 20,
                  fontSize: 11,
                  color: "#803800",
                  opacity: 0.5,
                }}
              >
                点击跳过
              </div>
            )}

            {typer.done && !showConfirmBtn && (
              <div
                style={{
                  position: "absolute",
                  bottom: 12,
                  right: 20,
                  fontSize: 12,
                  color: "#803800",
                  fontWeight: "bold",
                  opacity: 0.7,
                  animation: "ig-arrow-bounce 0.4s infinite alternate",
                }}
              >
                {phase === "scroll"
                  ? allOpened
                    ? "阅读完毕 →"
                    : "打开下一张卷轴"
                  : "点击继续 →"}
              </div>
            )}

            {showConfirmBtn && typer.done && (
              <div
                style={{
                  position: "absolute",
                  bottom: 12,
                  right: 20,
                  pointerEvents: "auto",
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartConfirm();
                  }}
                  style={{
                    backgroundColor: "#d67a29",
                    color: "#fff",
                    border: "4px solid #492310",
                    padding: "8px 18px",
                    fontSize: 14,
                    fontFamily: "inherit",
                    textShadow: "2px 2px 0 #492310",
                    boxShadow: "inset -3px -3px 0 #b86214, inset 3px 3px 0 #ffc685",
                    cursor: "pointer",
                  }}
                >
                  选一张最关键的卷轴 →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 三选一确认 ── */}
      {confirmPhase && (
        <div
          style={{
            width: "90%",
            maxWidth: 800,
            marginBottom: "15%",
            pointerEvents: "auto",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              backgroundColor: "#fce1b5",
              border: "4px solid #b56c27",
              boxShadow: "0 0 0 4px #eeb069",
              padding: "24px",
            }}
          >
            <div
              style={{
                fontSize: 14,
                color: "#492310",
                marginBottom: 16,
                textAlign: "center",
              }}
            >
              选一张你觉得最关键的卷轴，作为深入下去的起点
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 16,
              }}
            >
              {scrolls.map((s) => {
                const isSel = selected === s.type;
                return (
                  <button
                    key={s.type}
                    onClick={() => handleSelect(s.type)}
                    disabled={selected !== null}
                    style={{
                      backgroundColor: "#fff7e6",
                      border: `4px solid ${isSel ? "#da9100" : "#8a5a1a"}`,
                      boxShadow: "0 0 0 4px #eeb069",
                      padding: "16px 12px",
                      cursor: selected !== null ? "default" : "pointer",
                      opacity: selected !== null && !isSel ? 0.5 : 1,
                      transform: isSel ? "translateY(-4px)" : "none",
                      transition: "all 0.2s",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8,
                      fontFamily: "inherit",
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: "#5e564a",
                        color: "#fff",
                        padding: "4px 10px",
                        border: "2px solid #3e3529",
                        fontSize: 12,
                        textShadow: "1px 1px 0 #3e3529",
                      }}
                    >
                      📜 {s.title}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#492310",
                        lineHeight: 1.5,
                        whiteSpace: "pre-line",
                      }}
                    >
                      {s.content.length > 50
                        ? s.content.substring(0, 50) + "…"
                        : s.content}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes ig-arrow-bounce {
          0% { opacity: 0.4; transform: translateY(0); }
          100% { opacity: 1; transform: translateY(6px); }
        }
      `}</style>
    </div>
  );
};

// ─── 头像子组件 ───────────────────────────────────────────────────────────

const SpeakerAvatar: React.FC<{
  cfg: { name: string; avatar: string; emoji: string };
  active: boolean;
}> = ({ cfg, active }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 4,
      opacity: active ? 1 : 0.35,
      transition: "opacity 0.3s ease",
    }}
  >
    <div
      style={{
        width: 80,
        height: 80,
        backgroundColor: "#fce1b5",
        border: active ? "4px solid #da9100" : "4px solid #b56c27",
        boxShadow: active
          ? "0 0 0 3px #eeb069, 0 0 12px rgba(218,145,0,0.4)"
          : "0 0 0 3px #eeb069",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <img
        src={cfg.avatar}
        alt={cfg.name}
        draggable={false}
        style={{ width: 64, height: 64, imageRendering: "pixelated" }}
      />
    </div>
    <span
      style={{
        fontSize: 11,
        color: "#fce1b5",
        textShadow: "2px 2px 0 #492310",
        fontWeight: "bold",
      }}
    >
      {cfg.name}
    </span>
  </div>
);

export default IntroGuide;
