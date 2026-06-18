/**
 * 主对话框组件 —— 星露谷像素风
 *
 * 设计参考 index.html sd-board：
 *   - 外层：羊皮纸底色 #fce1b5 + 双重像素木边框（深#b56c27 + 浅#eeb069）
 *   - 内框：2px 金色 #da9100 描边
 *   - 顶部缎带：橙色 #d67a29 + 白字阴影
 *   - 底部区域：NPC + 老学者立绘 + 对话内容区
 *
 * What 层新增 mentor_intro 阶段：
 *   开场小场景结束后不直接展示翻卡，而是让老学者先说一段引导对话，
 *   逐句介绍定义 / 例子 / 连接三个概念，最后一句话后进入翻卡阅读。
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDialogStore, type MentorDialogueLine } from "../../store/dialogStore";
import { useWorldStore } from "../../store/worldStore";
import { getQuestion, getFeedback } from "../../api/nodes";
import { WhatCards } from "./WhatCards";
import { FeedbackCard } from "./FeedbackCard";
import { MentorAvatar } from "./MentorAvatar";
import { PixelButton } from "../common/PixelButton";
import type { WhatCard } from "../../types/world";

export const DialogBox: React.FC = () => {
  const {
    phase,
    currentNode,
    depth,
    round,
    question,
    followups,
    feedback,
    feedbackLevel,
    depthState,
    mentorLines,
    setLoading,
    setMentorIntro,
    setReading,
    setQuestion,
    setFeedback,
    close,
  } = useDialogStore();

  const { updateNodeDepthState } = useWorldStore();
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // mentor_intro 阶段：当前对话行索引
  const [mentorLineIdx, setMentorLineIdx] = useState(0);
  const mentorLineRef = useRef<HTMLDivElement>(null);

  // ── 构建老学者引导对话 ────────────────────────────────────
  // 规则：老学者引导 + 学者回应，形成真正的对话节奏
  function buildMentorLines(cards: WhatCard[], intro: string): MentorDialogueLine[] {
    const lines: MentorDialogueLine[] = [];
    // 1) 老学者开场
    lines.push({ speaker: "mentor", text: intro });

    // 2) 学者回应开场
    lines.push({
      speaker: "scholar",
      text: "嗯…这个问题很有意思。不过要从哪里开始理解呢？",
    });

    // 3) 逐卡引导：老学者介绍 → 学者回应
    const mentorCardLines: Record<string, string> = {
      definition: "首先我们来看这件事的定义——这是最基础的一步。",
      example: "光有定义还不够，我们来看一个具体的画面。",
      bridge: "最后，看看这件事如何连接到更大的图景。",
    };
    const scholarCardLines: Record<string, string> = {
      definition: "原来如此，所以定义是理解一切的基石。",
      example: "啊，这样就清晰了——具体的画面让定义变得更真实。",
      bridge: "原来它们不是孤立的，这层连接我明白了。",
    };

    for (const c of cards) {
      const mLine = mentorCardLines[c.type] ?? "";
      const sLine = scholarCardLines[c.type] ?? "";
      lines.push({ speaker: "mentor", text: mLine, highlightCard: c.type });
      lines.push({ speaker: "mentor", text: `「${c.text}」`, highlightCard: c.type });
      lines.push({ speaker: "scholar", text: sLine, highlightCard: c.type });
    }

    // 4) 收尾：老学者引导选择 + 学者确认
    lines.push({
      speaker: "mentor",
      text: "好了，你已经收集了三块线索。现在选一张你觉得最关键的，我们以此为起点继续深入。",
    });
    lines.push({
      speaker: "scholar",
      text: "我明白了。让我看看这三块线索里，哪一个更能让我接近真相…",
    });

    return lines;
  }

  // ── 打开节点后，根据深度进入不同阶段 ──────────────────────
  useEffect(() => {
    if (!currentNode || phase !== "loading") return;

    if (depth === "what") {
      // 构建引导对话，进入 mentor_intro 阶段
      const lines = buildMentorLines(currentNode.whatCards, currentNode.mentorPrompts.whatIntro);
      setMentorIntro(lines);
    } else {
      getQuestion({
        node_id: currentNode.id,
        node_name: currentNode.name,
        depth,
        mystery_question: currentNode.mysteryQuestion,
        source_excerpt: currentNode.sourceExcerpt,
        mentor_prompts: currentNode.mentorPrompts,
        round: round as 1 | 2 | 3,
      })
        .then((res) => {
          setQuestion(res);
        })
        .catch(() => {
          setQuestion({
            question: `用你自己的话解释：【${currentNode.name}】？`,
            followups: ["", ""],
            depth,
          });
        });
    }
  }, [currentNode?.id, phase]);

  // mentor_intro 阶段：点击推进对话
  const handleMentorClick = useCallback(() => {
    if (mentorLineIdx < mentorLines.length - 1) {
      setMentorLineIdx((i) => i + 1);
    } else {
      // 最后一句 → 进入翻卡阅读
      setMentorLineIdx(0);
      setReading();
    }
  }, [mentorLineIdx, mentorLines.length, setReading]);

  // 滚动到对话最底端
  useEffect(() => {
    if (phase === "mentor_intro" && mentorLineRef.current) {
      mentorLineRef.current.scrollTop = mentorLineRef.current.scrollHeight;
    }
  }, [mentorLineIdx, phase]);

  // What 层翻卡完成
  const handleWhatComplete = useCallback(
    (choice: "definition" | "example" | "bridge") => {
      if (!currentNode) return;
      updateNodeDepthState(currentNode.id, "what", "completed");
      close();
      // 兜底路径：无卷轴数据时，完成 What 后自动切换到理解层
      const store = useWorldStore.getState();
      if (store.world) {
        store.updateNodeDepthState(currentNode.id, "how", "available");
        store.switchDepth("how");
      }
    },
    [currentNode, updateNodeDepthState, close],
  );

  // 用户提交回答
  const handleSubmitAnswer = useCallback(async () => {
    if (!currentNode || !answer.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await getFeedback({
        node_id: currentNode.id,
        node_name: currentNode.name,
        source_excerpt: currentNode.sourceExcerpt,
        user_answer: answer,
        depth,
        round: round as 1 | 2 | 3,
      });
      setFeedback(res.feedback_card, res.node_state, res.depth_state);
      updateNodeDepthState(currentNode.id, depth, res.depth_state);
    } finally {
      setSubmitting(false);
    }
  }, [currentNode, answer, depth, round, submitting, setFeedback, updateNodeDepthState]);

  // 继续追问
  const handleContinue = useCallback(() => {
    useDialogStore.getState().nextRound();
    setAnswer("");
    useDialogStore.getState().setLoading();
  }, []);

  // 深度标签文字
  const depthLabel =
    depth === "what"
      ? "What · 认知层"
      : depth === "how"
      ? "How · 理解层"
      : depth === "why"
      ? "Why · 因果层"
      : "System · 系统层";

  if (!currentNode || phase === "closed") return null;

  // ── sd-board 容器样式 ──────────────────────────────────────
  const boardStyle: React.CSSProperties = {
    backgroundColor: "#fce1b5",
    border: "4px solid #b56c27",
    boxShadow: "0 0 0 4px #eeb069, 0 8px 0 rgba(0,0,0,0.3)",
    padding: "28px 28px 24px 28px",
    color: "#492310",
    position: "relative",
    fontFamily: "'Zpix', 'Press Start 2P', 'Microsoft YaHei', monospace",
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

  const titleRibbonStyle: React.CSSProperties = {
    position: "absolute",
    top: -22,
    left: "50%",
    transform: "translateX(-50%)",
    backgroundColor: "#d67a29",
    color: "#ffffff",
    padding: "6px 20px",
    fontSize: 16,
    textShadow: "2px 2px 0px #492310",
    border: "4px solid #492310",
    boxShadow: "0 4px 0 rgba(0,0,0,0.2)",
    whiteSpace: "nowrap",
    fontFamily: "'Zpix', 'Press Start 2P', 'Microsoft YaHei', monospace",
  };

  // 当前对话行（mentor_intro 阶段用）
  const currentLine: MentorDialogueLine | null =
    phase === "mentor_intro" && mentorLines[mentorLineIdx]
      ? mentorLines[mentorLineIdx]
      : null;

  const isLastLine = phase === "mentor_intro" && mentorLineIdx >= mentorLines.length - 1;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-5xl relative mt-6" style={boardStyle}>
        <div style={titleRibbonStyle}>
          📜 {currentNode.gateNpc.title} · {depthLabel}
        </div>
        <div style={goldInnerFrameStyle} />

        {/* 关闭按钮 */}
        <button
          onClick={close}
          aria-label="关闭"
          style={{
            position: "absolute",
            top: -18,
            right: -8,
            width: 36,
            height: 36,
            backgroundColor: "#f7a143",
            color: "#ffffff",
            border: "4px solid #492310",
            fontFamily: "'Zpix', 'Press Start 2P', 'Microsoft YaHei', monospace",
            textShadow: "2px 2px 0px #492310",
            boxShadow: "inset -3px -3px 0px #b86214, inset 3px 3px 0px #ffc685, 0 4px 0 rgba(0,0,0,0.2)",
            cursor: "pointer",
            transition: "transform 0.05s",
            fontSize: 16,
          }}
          onMouseDown={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(4px)"; }}
          onMouseUp={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; }}
          onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; }}
        >
          ✕
        </button>

        {/* 主体：左 NPC + 老学者 / 右内容区 */}
        <div className="flex gap-5 items-stretch">
          {/* 左侧 */}
          <div className="flex-shrink-0 flex flex-col items-center gap-2" style={{ width: 130 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 96,
                height: 96,
                backgroundColor: "#fff7e6",
                border: "4px solid #b56c27",
                boxShadow: "0 0 0 4px #eeb069",
              }}
            >
              <img
                src={currentNode.gateNpc.avatar}
                alt={currentNode.gateNpc.title}
                draggable={false}
                style={{ width: 80, height: 80, imageRendering: "pixelated" }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).outerHTML =
                    '<span style="font-size:48px;line-height:1;">🧙</span>';
                }}
              />
            </div>
            <div
              style={{
                display: "inline-block",
                backgroundColor: "#cf8442",
                color: "#fff7e6",
                padding: "4px 10px",
                border: "2px solid #492310",
                textShadow: "1px 1px 0px #492310",
                fontSize: 12,
                textAlign: "center",
              }}
            >
              {depthLabel}
              {phase !== "mentor_intro" && (
                <div style={{ fontSize: 10, opacity: 0.85, marginTop: 2 }}>
                  第 {round} / 3 轮
                </div>
              )}
            </div>
            <MentorAvatar variant="avatar" size={72} />
            <div style={{ fontSize: 12, color: "#492310" }}>老学者</div>
          </div>

          {/* 右侧 */}
          <div className="flex-1 min-w-0 flex flex-col gap-3" style={{ paddingTop: 4 }}>
            <div
              style={{
                fontSize: 20,
                lineHeight: 1.5,
                color: "#492310",
                paddingBottom: 8,
                borderBottom: "3px dashed #b56c27",
              }}
            >
              ❓ {currentNode.mysteryQuestion}
            </div>

            <div className="flex-1 flex flex-col justify-center gap-3">
              {/* Loading */}
              {phase === "loading" && (
                <div style={{ fontSize: 16, color: "#492310", display: "flex", alignItems: "center", gap: 12 }}>
                  老学者正在思考…
                  <span style={{ display: "inline-flex", gap: 4 }}>
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        style={{
                          display: "inline-block",
                          width: 8, height: 8,
                          backgroundColor: "#492310",
                          animation: `pulse 0.8s ease-in-out ${i * 120}ms infinite`,
                        }}
                      />
                    ))}
                  </span>
                </div>
              )}

              {/* ── mentor_intro：老学者引导对话 ────────────── */}
              {phase === "mentor_intro" && currentLine && (
                <div
                  ref={mentorLineRef}
                  onClick={handleMentorClick}
                  style={{
                    cursor: "pointer",
                    maxHeight: 320,
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    padding: 4,
                  }}
                >
                  {/* 历史对话记录 */}
                  {mentorLines.slice(0, mentorLineIdx + 1).map((line, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        opacity: i === mentorLineIdx ? 1 : 0.85,
                      }}
                    >
                      {/* 说话人头像 */}
                      <span style={{ fontSize: 28, flexShrink: 0, lineHeight: 1 }}>
                        {line.speaker === "mentor" ? "🧙" : "🧑‍🎓"}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: "#492310", fontWeight: "bold", marginBottom: 2 }}>
                          {line.speaker === "mentor" ? "老学者" : "学者"}
                        </div>
                        <div
                          style={{
                            fontSize: 16,
                            lineHeight: 1.6,
                            color: "#492310",
                            backgroundColor: i === mentorLineIdx ? "#fff7e6" : "transparent",
                            borderRadius: 4,
                            padding: "4px 8px",
                            border: line.highlightCard
                              ? `2px solid ${
                                  line.highlightCard === "definition"
                                    ? "#e8b34f"
                                    : line.highlightCard === "example"
                                    ? "#5d9c3f"
                                    : "#6b5b95"
                                }`
                              : "2px solid transparent",
                          }}
                        >
                          {line.text}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* 底部提示 */}
                  <div
                    style={{
                      textAlign: "center",
                      fontSize: 13,
                      color: "#492310",
                      opacity: 0.6,
                      marginTop: 4,
                      animation: isLastLine ? "none" : "pulse 1s ease-in-out infinite",
                    }}
                  >
                    {isLastLine ? "点击进入翻卡 →" : "点击继续对话 ▼"}
                  </div>
                </div>
              )}

              {/* What 翻卡 */}
              {(phase === "reading" || phase === "what_confirm") && (
                <WhatCards
                  cards={currentNode.whatCards}
                  mentorIntro={currentNode.mentorPrompts.whatIntro}
                  onComplete={handleWhatComplete}
                />
              )}

              {/* How/Why/System 提问 */}
              {phase === "question" && question && (
                <div className="flex flex-col gap-3">
                  <div style={{ fontSize: 18, lineHeight: 1.5, color: "#492310" }}>
                    {question}
                  </div>
                  {followups?.[0] && (
                    <div style={{ fontSize: 14, color: "#492310", fontStyle: "italic" }}>
                      💬 {followups[0]}
                    </div>
                  )}
                  {followups?.[1] && (
                    <div style={{ fontSize: 14, color: "#492310", fontStyle: "italic" }}>
                      💬 {followups[1]}
                    </div>
                  )}
                  <textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value.slice(0, 500))}
                    placeholder="用你自己的话回答。不必完美，真诚就好。"
                    rows={3}
                    style={{
                      backgroundColor: "#fff7e6",
                      border: "3px solid #b56c27",
                      padding: 10,
                      fontFamily: "'Zpix', 'Press Start 2P', 'Microsoft YaHei', monospace",
                      fontSize: 16,
                      color: "#492310",
                      outline: "none",
                      boxShadow: "inset 3px 3px 0px rgba(0,0,0,0.1)",
                      resize: "vertical",
                      width: "100%",
                    }}
                    onFocus={(e) => { (e.currentTarget as HTMLTextAreaElement).style.borderColor = "#da9100"; }}
                    onBlur={(e) => { (e.currentTarget as HTMLTextAreaElement).style.borderColor = "#b56c27"; }}
                  />
                  <div className="flex items-center justify-between">
                    <span style={{ fontSize: 12, color: "#492310", opacity: 0.7 }}>
                      {answer.length} / 500
                    </span>
                    <div className="flex gap-2">
                      <PixelButton onClick={close} variant="secondary">关闭</PixelButton>
                      <PixelButton onClick={handleSubmitAnswer} disabled={!answer.trim() || submitting}>
                        {submitting ? "提交中…" : "提交回答"}
                      </PixelButton>
                    </div>
                  </div>
                </div>
              )}

              {/* 反馈卡 */}
              {phase === "feedback" && feedback && (
                <FeedbackCard
                  feedback={feedback}
                  feedbackLevel={feedbackLevel ?? "hint"}
                  depthState={depthState ?? "learning"}
                  onContinue={handleContinue}
                  onClose={close}
                />
              )}

              {/* 终问回响 */}
              {phase === "final" && (
                <div className="flex flex-col gap-3">
                  <div style={{ fontSize: 18, lineHeight: 1.5, color: "#492310", fontStyle: "italic" }}>
                    {currentNode.mentorPrompts.finalReturn}
                  </div>
                  <div style={{
                    backgroundColor: "#fff7e6",
                    border: "4px solid #b56c27",
                    padding: 12,
                    boxShadow: "inset 3px 3px 0px rgba(0,0,0,0.1)",
                  }}>
                    <div style={{ fontSize: 12, color: "#492310", marginBottom: 4 }}>终问回响</div>
                    <div style={{ fontSize: 16, color: "#492310" }}>{currentNode.mysteryQuestion}</div>
                  </div>
                  <div className="flex justify-end">
                    <PixelButton onClick={close} variant="secondary">稍后回答</PixelButton>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DialogBox;
