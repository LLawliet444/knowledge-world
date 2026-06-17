/**
 * 主对话框组件 —— 星露谷像素风（sd-board 风格）
 *
 * 设计参考 index.html：
 *   - 外层：羊皮纸底色 #fce1b5 + 双重像素木边框（深#b56c27 + 浅#eeb069）
 *   - 内框：2px 金色 #da9100 描边
 *   - 顶部缎带：橙色 #d67a29 + 白字阴影
 *   - 底部区域：NPC + 老学者立绘 + 对话内容区
 */

import React, { useCallback, useEffect, useState } from "react";
import { useDialogStore } from "../../store/dialogStore";
import { useWorldStore } from "../../store/worldStore";
import { getQuestion, getFeedback } from "../../api/nodes";
import { WhatCards } from "./WhatCards";
import { FeedbackCard } from "./FeedbackCard";
import { MentorAvatar } from "./MentorAvatar";
import { PixelButton } from "../common/PixelButton";

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
    setLoading,
    setReading,
    setQuestion,
    setFeedback,
    close,
  } = useDialogStore();

  const { updateNodeDepthState } = useWorldStore();
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 打开节点后，根据深度进入不同阶段
  useEffect(() => {
    if (!currentNode || phase !== "loading") return;

    if (depth === "what") {
      setReading();
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

  // What 层翻卡完成
  const handleWhatComplete = useCallback(
    (choice: "definition" | "example" | "bridge") => {
      if (!currentNode) return;
      updateNodeDepthState(currentNode.id, "what", "completed");
      close();
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

  // —— sd-board 容器样式 ——
  const boardStyle: React.CSSProperties = {
    backgroundColor: "#fce1b5",
    border: "4px solid #b56c27",
    boxShadow: "0 0 0 4px #eeb069, 0 8px 0 rgba(0,0,0,0.3)",
    padding: "28px 28px 24px 28px",
    color: "#492310",
    position: "relative",
    fontFamily: "'Zpix', 'Press Start 2P', 'Microsoft YaHei', monospace",
  };

  // —— 金色内框（::before 伪元素无法内联，用绝对定位 div 代替）——
  const goldInnerFrameStyle: React.CSSProperties = {
    position: "absolute",
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    border: "2px solid #da9100",
    pointerEvents: "none",
  };

  // —— 顶部缎带标签 ——
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

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-5xl relative mt-6" style={boardStyle}>
        {/* 顶部缎带：章节名 + 深度标签 */}
        <div style={titleRibbonStyle}>
          📜 {currentNode.gateNpc.title} · {depthLabel}
        </div>

        {/* 金色内衬框 */}
        <div style={goldInnerFrameStyle} />

        {/* 右上角关闭按钮 —— 橙色像素按钮风格 */}
        <button
          onClick={close}
          aria-label="关闭对话框"
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
          onMouseDown={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(4px)";
          }}
          onMouseUp={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
          }}
          onMouseOut={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
          }}
        >
          ✕
        </button>

        {/* 主体内容：左 NPC + 老学者 / 右内容区 */}
        <div className="flex gap-5 items-stretch">
          {/* 左侧：NPC + 老学者 */}
          <div className="flex-shrink-0 flex flex-col items-center gap-2" style={{ width: 130 }}>
            {/* 关卡 NPC */}
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

            {/* 深度/回合标签 —— 像素风 badge */}
            <div
              style={{
                display: "inline-block",
                backgroundColor: "#cf8442",
                color: "#fff7e6",
                padding: "4px 10px",
                border: "2px solid #492310",
                textShadow: "1px 1px 0px #492310",
                fontSize: 12,
                fontFamily: "'Zpix', 'Press Start 2P', 'Microsoft YaHei', monospace",
                textAlign: "center",
              }}
            >
              {depthLabel}
              <div style={{ fontSize: 10, opacity: 0.85, marginTop: 2 }}>
                第 {round} / 3 轮
              </div>
            </div>

            {/* 老学者 */}
            <MentorAvatar variant="avatar" size={72} />
            <div
              style={{
                fontSize: 12,
                color: "#492310",
                fontFamily: "'Zpix', 'Press Start 2P', 'Microsoft YaHei', monospace",
              }}
            >
              老学者
            </div>
          </div>

          {/* 右侧：内容区 */}
          <div className="flex-1 min-w-0 flex flex-col gap-3" style={{ paddingTop: 4 }}>
            {/* 谜题标题（所有阶段都展示）*/}
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

            {/* —— 阶段内容区 —— */}
            <div className="flex-1 flex flex-col justify-center gap-3">
              {/* Loading */}
              {phase === "loading" && (
                <div
                  style={{
                    fontSize: 16,
                    color: "#492310",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  老学者正在思考…
                  <span
                    style={{
                      display: "inline-flex",
                      gap: 4,
                    }}
                  >
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        style={{
                          display: "inline-block",
                          width: 8,
                          height: 8,
                          backgroundColor: "#492310",
                          animation: `pulse 0.8s ease-in-out ${i * 120}ms infinite`,
                        }}
                      />
                    ))}
                  </span>
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
                    onFocus={(e) => {
                      (e.currentTarget as HTMLTextAreaElement).style.borderColor = "#da9100";
                    }}
                    onBlur={(e) => {
                      (e.currentTarget as HTMLTextAreaElement).style.borderColor = "#b56c27";
                    }}
                  />
                  <div className="flex items-center justify-between">
                    <span style={{ fontSize: 12, color: "#492310", opacity: 0.7 }}>
                      {answer.length} / 500
                    </span>
                    <div className="flex gap-2">
                      <PixelButton onClick={close} variant="secondary">
                        关闭
                      </PixelButton>
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
                  <div
                    style={{
                      fontSize: 18,
                      lineHeight: 1.5,
                      color: "#492310",
                      fontStyle: "italic",
                    }}
                  >
                    {currentNode.mentorPrompts.finalReturn}
                  </div>
                  <div
                    style={{
                      backgroundColor: "#fff7e6",
                      border: "4px solid #b56c27",
                      padding: 12,
                      boxShadow: "inset 3px 3px 0px rgba(0,0,0,0.1)",
                    }}
                  >
                    <div style={{ fontSize: 12, color: "#492310", marginBottom: 4 }}>
                      终问回响
                    </div>
                    <div style={{ fontSize: 16, color: "#492310" }}>
                      {currentNode.mysteryQuestion}
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <PixelButton onClick={close} variant="secondary">
                      稍后回答
                    </PixelButton>
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
