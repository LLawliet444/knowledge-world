/**
 * 主对话框组件
 *
 * 使用 assets/ui/dialogue/dialogue_box_frame.png 作为外框背景
 * 右侧上方：关卡 NPC 头像 + 谜题标题（关卡引入）
 * 右侧下方：根据 phase 切换 WhatCards / QuestionBubble / FeedbackCard / FinalQuestion
 */

import React, { useCallback, useEffect, useState } from "react";
import { useDialogStore } from "../../store/dialogStore";
import { useWorldStore } from "../../store/worldStore";
import { getQuestion, getFeedback } from "../../api/nodes";
import { WhatCards } from "./WhatCards";
import { FeedbackCard } from "./FeedbackCard";
import { MentorAvatar } from "./MentorAvatar";
import { PixelButton } from "../common/PixelButton";
import type { LayerType } from "../../types/world";

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
    setFinal,
    nextRound,
    close,
  } = useDialogStore();

  const { updateNodeDepthState, nodeProgress } = useWorldStore();
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 打开节点后，根据深度进入不同阶段
  useEffect(() => {
    if (!currentNode || phase !== "loading") return;

    if (depth === "what") {
      setReading();
    } else {
      // 请求 AI 提问
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
          // fallback 已内置在 apiFetch 中
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
      // 标记 What 层为 completed
      updateNodeDepthState(currentNode.id, "what", "completed");
      close();
    },
    [currentNode, updateNodeDepthState, close],
  );

  // 用户提交回答
  const handleSubmit = useCallback(async () => {
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
      // 更新 store
      updateNodeDepthState(currentNode.id, depth, res.depth_state);
    } finally {
      setSubmitting(false);
    }
  }, [currentNode, answer, depth, round, submitting, setFeedback, updateNodeDepthState]);

  // 继续追问
  const handleContinue = useCallback(() => {
    nextRound();
    setAnswer("");
    // 将 phase 重置为 loading，触发下一轮提问
    setLoading();
  }, [nextRound, setLoading]);

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

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4 pointer-events-none">
        <div
        className="pointer-events-auto w-full max-w-5xl relative"
        style={{
          backgroundImage: "url(/ui/dialogue/dialogue_box_frame.png)",
          backgroundRepeat: "no-repeat",
          backgroundSize: "100% 100%",
          padding: "24px 32px 24px 32px",
          minHeight: 240,
          color: "#3a1f0a",
        }}
      >
        {/* 右上角关闭按钮（所有阶段都可见） */}
        <button
          onClick={close}
          aria-label="关闭对话框"
          className="absolute -top-2 -right-2 flex items-center justify-center font-pixel text-lg text-[#fff8e6] border-4 border-[#3a1f0a] bg-[#6b3a1f] hover:bg-[#8b4a2f] active:translate-y-[1px] rounded shadow-[3px_3px_0_0_#3a1f0a] active:shadow-[2px_2px_0_0_#3a1f0a]"
          style={{ width: 36, height: 36 }}
        >
          ✕
        </button>
        <div className="flex gap-5 items-stretch">
          {/* 左侧：NPC + 老学者 */}
          <div className="flex-shrink-0 flex flex-col items-center gap-2" style={{ width: 130 }}>
            {/* 关卡 NPC */}
            <div
              className="flex items-center justify-center border-4 border-[#3a1f0a] rounded bg-[#fff8e6] shadow-[3px_3px_0_0_#3a1f0a]"
              style={{ width: 88, height: 88 }}
            >
              <img
                src={currentNode.gateNpc.avatar}
                alt={currentNode.gateNpc.title}
                draggable={false}
                style={{ width: 72, height: 72, imageRendering: "pixelated" }}
              />
            </div>
            <div className="px-2 py-[2px] font-pixel text-[10px] text-[#1a1226] border-2 border-[#3a1f0a] bg-[#f5d8a0] rounded shadow-[2px_2px_0_0_#3a1f0a]">
              {currentNode.gateNpc.title}
            </div>

            {/* 深度标签 */}
            <div className="font-pixel text-[10px] text-[#3a1f0a]/70">
              {depthLabel}
            </div>
            <div className="font-pixel text-[10px] text-[#3a1f0a]/50">
              第 {round} / 3 轮
            </div>

            {/* 老学者 */}
            <MentorAvatar variant="avatar" size={72} />
            <div className="font-pixel text-[10px] text-[#3a1f0a]/70">老学者</div>
          </div>

          {/* 右侧：内容区 */}
          <div className="flex-1 min-w-0 flex flex-col gap-3">
            {/* 谜题标题 */}
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 text-2xl leading-none mt-1">❓</div>
              <div className="font-body text-xl text-[#3a1f0a] leading-snug">
                {currentNode.mysteryQuestion}
              </div>
            </div>

            {/* 内容区 */}
            <div className="flex-1">
              {/* Loading */}
              {phase === "loading" && (
                <div className="flex items-center gap-3 font-body text-xl text-[#3a1f0a]">
                  老学者正在思考…
                  <span className="flex gap-1 ml-2">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="h-2 w-2 rounded-full bg-[#3a1f0a] animate-pulse"
                        style={{ animationDelay: `${i * 120}ms` }}
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
                  <div className="font-body text-xl text-[#3a1f0a] leading-snug">
                    {question}
                  </div>
                  {followups?.[0] && (
                    <div className="font-body text-base text-[#3a1f0a]/70 italic">
                      💬 {followups?.[0]}
                    </div>
                  )}
                  {followups?.[1] && (
                    <div className="font-body text-base text-[#3a1f0a]/70 italic">
                      💬 {followups?.[1]}
                    </div>
                  )}
                  <textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value.slice(0, 500))}
                    placeholder="用你自己的话回答。不必完美，真诚就好。"
                    rows={3}
                    className="w-full resize-y rounded border-4 border-[#3a1f0a] bg-[#fff8e6] px-3 py-2 font-body text-lg text-[#1a1226] focus:outline-none focus:ring-4 focus:ring-[#f5b642]/60"
                  />
                  <div className="flex items-center justify-between">
                    <span className="font-pixel text-[10px] text-[#3a1f0a]/70">
                      {answer.length} / 500
                    </span>
                    <div className="flex gap-2">
                      <PixelButton onClick={close} variant="secondary">
                        关闭
                      </PixelButton>
                      <PixelButton
                        onClick={handleSubmit}
                        disabled={!answer.trim() || submitting}
                      >
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

              {/* 原问回响 */}
              {phase === "final" && (
                <div className="flex flex-col gap-3">
                  <div className="font-body text-xl text-[#3a1f0a] leading-snug italic">
                    {currentNode.mentorPrompts.finalReturn}
                  </div>
                  <div className="rounded border-4 border-[#6b5b95] bg-[#e8d5f7] p-4">
                    <div className="font-pixel text-xs text-[#6b5b95] mb-2">终问回响</div>
                    <div className="font-body text-lg text-[#3a1f0a]">
                      {currentNode.mysteryQuestion}
                    </div>
                  </div>
                  <PixelButton onClick={close} variant="secondary">
                    稍后回答
                  </PixelButton>
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
