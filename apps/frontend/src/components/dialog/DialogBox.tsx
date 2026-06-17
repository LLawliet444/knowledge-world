import React, { useCallback, useEffect, useState } from "react";
import type { WorldNode, NodeState } from "../../types/world";
import type { DiagnosticResponse } from "../../types/feedback";
import { getFeedback, getQuestion } from "../../api/nodes";
import { PixelButton } from "../common/PixelButton";
import { getNodeIcon } from "../../constants/node";

export interface DialogBoxProps {
  node: WorldNode | null;
  onClose: () => void;
  onStateChange: (nodeId: string, state: NodeState) => void;
}

type Phase = "loading" | "question" | "feedback";

/**
 * Dialog box styled with the dialogue_box_frame.png asset as the frame
 * background. The NPC avatar sits on the left where the frame's art was
 * designed to hold it, and the right side shows either the question + textarea
 * or the diagnostic feedback card.
 *
 * Frame layout (approximate, matches the art in dialogue_box_frame.png):
 *
 *  ┌─────────────────────────────────────────────────────────────┐
 *  │ ┌──┐                                                        │
 *  │ │👴│   苏格拉底导师                                          │
 *  │ │  │                                                        │
 *  │ └──┘   【认知革命】                                           │
 *  │        如果没有虚构故事的能力，我们还能组织超过 150 人的大规模     │
 *  │        协作吗？                                              │
 *  │                                                            │
 *  │        ┌───────────────────────────────────────────────┐  │
 *  │        │ 输入回答...                                   │  │
 *  │        └───────────────────────────────────────────────┘  │
 *  │                                               [提交] [关闭]  │
 *  └─────────────────────────────────────────────────────────────┘
 */
export const DialogBox: React.FC<DialogBoxProps> = ({
  node,
  onClose,
  onStateChange,
}) => {
  const [phase, setPhase] = useState<Phase>("loading");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<DiagnosticResponse | null>(null);
  const [round, setRound] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Reset + fetch question when the user clicks a new node.
  useEffect(() => {
    if (!node) return;
    setPhase("loading");
    setFeedback(null);
    setAnswer("");
    setRound(1);
    let cancelled = false;

    getQuestion({
      node_id: node.id,
      node_name: node.name,
      layer: node.layer,
      source_excerpt: node.sourceExcerpt,
    })
      .then((res) => {
        if (cancelled) return;
        setQuestion(res.question);
        setPhase("question");
      })
      .catch(() => {
        if (!cancelled) {
          setQuestion(
            `用你自己的话解释：【${node.name}】到底是什么？它和其他节点有什么关系？`,
          );
          setPhase("question");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [node?.id, node?.name, node?.layer, node?.sourceExcerpt]);

  const handleSubmit = useCallback(async () => {
    if (!node || phase !== "question" || !answer.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await getFeedback({
        node_id: node.id,
        node_name: node.name,
        source_excerpt: node.sourceExcerpt,
        user_answer: answer,
        round,
      });
      setFeedback(res);
      setPhase("feedback");
      onStateChange(node.id, res.node_state);
    } finally {
      setSubmitting(false);
    }
  }, [node, phase, answer, round, submitting, onStateChange]);

  const handleContinue = useCallback(() => {
    if (!node || !feedback) return;
    setQuestion(feedback.next_best_question);
    setFeedback(null);
    setAnswer("");
    setRound((r) => r + 1);
    setPhase("question");
  }, [node, feedback]);

  if (!node) return null;

  // Chapter label derived from the node's layer.
  const chapterName =
    node.layer === "what"
      ? "What · 认知大草原"
      : node.layer === "how"
      ? "How · 农业平原"
      : node.layer === "why"
      ? "Why · 统一山脉"
      : "System · 科学大陆";

  // State badge to show below the frame.
  const stateLabel =
    feedback?.node_state === "mastered"
      ? "已掌握"
      : feedback?.node_state === "transfer"
      ? "迁移应用"
      : feedback?.node_state === "learning"
      ? "理解中"
      : feedback?.node_state === "visited"
      ? "首次接触"
      : null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4 pointer-events-none">
      <div
        className="pointer-events-auto w-full max-w-5xl"
        style={{
          // The dialogue_box_frame.png art defines the visual frame; we use
          // it as a background and pad the inner content so it sits inside
          // the "screen" area of the frame.
          backgroundImage: "url(/ui/dialogue/dialogue_box_frame.png)",
          backgroundRepeat: "no-repeat",
          backgroundSize: "100% 100%",
          padding: "28px 36px 28px 36px",
          minHeight: 220,
          // Dark brown text color to match the palette of the frame art.
          color: "#3a1f0a",
          backgroundBlendMode: "normal",
        }}
      >
        <div className="flex gap-6 items-stretch">
          {/* NPC avatar + nameplate */}
          <div className="flex-shrink-0 flex flex-col items-center" style={{ width: 140 }}>
            {/* Chapter node icon (uses the nodes/ art for this chapter) */}
            <div
              className="relative flex items-center justify-center border-4 border-[#3a1f0a] rounded bg-[#fff8e6] shadow-[3px_3px_0_0_#3a1f0a]"
              style={{ width: 88, height: 88 }}
              aria-hidden
            >
              <img
                src={getNodeIcon(node.iconType)}
                alt=""
                draggable={false}
                style={{ width: 64, height: 64, imageRendering: "pixelated" }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
            {/* Layer / chapter label */}
            <div
              className="mt-1 px-2 py-[2px] font-pixel text-[10px] text-[#1a1226] border-2 border-[#3a1f0a] bg-[#f5d8a0] rounded shadow-[2px_2px_0_0_#3a1f0a]"
              style={{ whiteSpace: "nowrap" }}
            >
              章节：{chapterName}
            </div>
            <div
              className="flex items-center justify-center border-4 border-[#3a1f0a] rounded bg-[#fff8e6] shadow-[3px_3px_0_0_#3a1f0a]"
              style={{ width: 112, height: 112 }}
            >
              <img
                src="/characters/npc_old_scholar_avatar.png"
                alt="苏格拉底导师"
                draggable={false}
                style={{ width: 96, height: 96, imageRendering: "pixelated" }}
                onError={(e) => {
                  // Fallback: show emoji.
                  (e.currentTarget as HTMLImageElement).outerHTML =
                    '<span style="font-size:64px;line-height:1;">🧙</span>';
                }}
              />
            </div>
            <div
              className="mt-2 px-3 py-1 font-pixel text-xs text-[#1a1226] border-2 border-[#3a1f0a] bg-[#f5d8a0] rounded shadow-[2px_2px_0_0_#3a1f0a]"
              style={{ whiteSpace: "nowrap" }}
            >
              苏格拉底
            </div>
            <div className="mt-1 font-pixel text-[10px] text-[#3a1f0a]/70">
              关卡：{node.name}
            </div>
            <div className="mt-1 font-pixel text-[10px] text-[#3a1f0a]/60">
              第 {round} 轮
            </div>
          </div>

          {/* Right: text area / feedback */}
          <div className="flex-1 min-w-0 flex flex-col">
            {phase === "loading" && (
              <div className="flex-1 flex items-center font-body text-lg text-[#3a1f0a]">
                苏格拉底正在思考…
                <span className="ml-2 inline-flex gap-1">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[#3a1f0a]" />
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[#3a1f0a]" style={{ animationDelay: "120ms" }} />
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[#3a1f0a]" style={{ animationDelay: "240ms" }} />
                </span>
              </div>
            )}

            {phase === "question" && (
              <div className="flex-1 flex flex-col">
                <div className="font-body text-xl leading-snug text-[#3a1f0a]">
                  {question}
                </div>
                <div className="mt-3 flex-1 flex flex-col">
                  <textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value.slice(0, 1000))}
                    placeholder="用你自己的话回答。不必完美，真诚就好。"
                    rows={3}
                    className="w-full resize-y rounded border-4 border-[#3a1f0a] bg-[#fff8e6] px-3 py-2 font-body text-lg text-[#1a1226] focus:outline-none focus:ring-4 focus:ring-[#f5b642]/60"
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-pixel text-[10px] text-[#3a1f0a]/70">
                      {answer.length} / 1000
                    </span>
                    <div className="flex gap-2">
                      <PixelButton onClick={onClose} variant="secondary">
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
              </div>
            )}

            {phase === "feedback" && feedback && (
              <div className="flex-1 grid gap-3 md:grid-cols-2">
                <div className="rounded border-4 border-[#3a1f0a] bg-[#fff8e6] p-3 shadow-[3px_3px_0_0_#3a1f0a]">
                  <div className="font-pixel text-xs text-[#3a1f0a] mb-1">你已理解</div>
                  <ul className="list-disc list-inside font-body text-base text-[#3a1f0a] space-y-1">
                    {(feedback.feedback_card.understood?.length
                      ? feedback.feedback_card.understood
                      : ["——"]
                    ).map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded border-4 border-[#3a1f0a] bg-[#fbe3b4] p-3 shadow-[3px_3px_0_0_#3a1f0a]">
                  <div className="font-pixel text-xs text-[#3a1f0a] mb-1">还缺一点</div>
                  <ul className="list-disc list-inside font-body text-base text-[#3a1f0a] space-y-1">
                    {(feedback.feedback_card.missing?.length
                      ? feedback.feedback_card.missing
                      : ["——"]
                    ).map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded border-4 border-[#3a1f0a] bg-[#e8d5f7] p-3 shadow-[3px_3px_0_0_#3a1f0a]">
                  <div className="font-pixel text-xs text-[#3a1f0a] mb-1">提示</div>
                  <p className="font-body text-base leading-snug text-[#3a1f0a]">
                    {feedback.feedback_card.guidance || "继续追问自己，把概念拆成更小的问题。"}
                  </p>
                </div>
                <div className="rounded border-4 border-[#3a1f0a] bg-[#dff0e4] p-3 shadow-[3px_3px_0_0_#3a1f0a] flex flex-col">
                  <div className="font-pixel text-xs text-[#3a1f0a] mb-1">下一问</div>
                  <p className="flex-1 font-body text-base leading-snug text-[#3a1f0a]">
                    {feedback.feedback_card.next_question ||
                      "如果让你再追问一次，你会问自己什么？"}
                  </p>
                  <div className="mt-3 flex gap-2 justify-end">
                    <PixelButton onClick={onClose} variant="secondary">
                      关闭
                    </PixelButton>
                    <PixelButton onClick={handleContinue}>继续追问</PixelButton>
                  </div>
                </div>
              </div>
            )}

            {stateLabel && phase === "feedback" && (
              <div className="mt-3 font-pixel text-xs text-[#3a1f0a]">
                当前状态：
                <span className="ml-1 inline-block rounded border-2 border-[#3a1f0a] bg-[#fff8e6] px-2 py-[2px]">
                  {stateLabel}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DialogBox;
