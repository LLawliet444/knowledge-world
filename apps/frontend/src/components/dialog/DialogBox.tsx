import React, { useCallback, useEffect, useState } from "react";
import type { WorldNode, NodeState } from "../../types/world";
import type { DiagnosticResponse, QuestionResponse } from "../../types/feedback";
import { getFeedback, getQuestion } from "../../api/nodes";
import { QuestionBubble } from "./QuestionBubble";
import { FeedbackCard } from "./FeedbackCard";
import { PixelButton } from "../common/PixelButton";

export interface DialogBoxProps {
  node: WorldNode | null;
  onClose: () => void;
  onStateChange: (nodeId: string, state: NodeState) => void;
}

type Phase = "loading" | "question" | "feedback";

const MAX_ANSWER_LENGTH = 500;

/**
 * Bottom-floating dialog panel. Orchestrates the Socratic Q&A with local state.
 *
 * Phase machine:
 *   loading  → question → (user answers) → feedback → click "继续" → back to question (new follow-up)
 *
 * The parent React component is responsible for telling the map renderer to update the
 * node visual state when the AI returns a diagnosis.
 */
export const DialogBox: React.FC<DialogBoxProps> = ({ node, onClose, onStateChange }) => {
  const [phase, setPhase] = useState<Phase>("loading");
  const [question, setQuestion] = useState<string>("");
  const [answer, setAnswer] = useState<string>("");
  const [feedback, setFeedback] = useState<DiagnosticResponse | null>(null);
  const [round, setRound] = useState<number>(1);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // When a new node arrives → request a question.
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
      .then((res: QuestionResponse) => {
        if (!cancelled) {
          setQuestion(res.question);
          setPhase("question");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQuestion("请先用自己的话写下对这个节点的理解。");
          setPhase("question");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [node?.id]);

  const handleSubmit = useCallback(async () => {
    if (!node || phase !== "question" || answer.trim().length === 0) return;
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
  }, [node, phase, answer, round, onStateChange]);

  const handleContinue = useCallback(() => {
    if (!node || !feedback) return;
    // Use the next question from the previous feedback.
    setQuestion(feedback.next_best_question);
    setAnswer("");
    setFeedback(null);
    setRound((r) => r + 1);
    setPhase("question");
  }, [node, feedback]);

  if (!node) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 flex justify-center p-4 pointer-events-none">
      <div className="w-full max-w-5xl pointer-events-auto">
      <div className="rounded border-4 border-[#1a1226] bg-[#fff8e6] shadow-[6px_6px_0_0_#1a1226]">
        <header className="flex items-center justify-between border-b-4 border-[#1a1226] bg-[#f5b642] px-4 py-2">
          <div className="font-pixel text-sm text-[#1a1226]">
            知识节点 · {node.name} · 第 {round} 轮
          </div>
          <PixelButton variant="ghost" onClick={onClose} className="!px-3 !py-1">
            关闭
          </PixelButton>
        </header>

        <div className="grid gap-4 p-4 md:grid-cols-5">
          <section className="md:col-span-3 space-y-3">
            <QuestionBubble
              nodeName={node.name}
              question={question}
              loading={phase === "loading"}
            />
            <div className="space-y-2">
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value.slice(0, MAX_ANSWER_LENGTH))}
                placeholder="用你自己的话回答。不必完美，写得真实就好。"
                rows={4}
                className="w-full resize-none rounded border-4 border-[#1a1226] bg-white px-3 py-2 font-body text-base focus:outline-none focus:ring-2 focus:ring-[#f5b642]"
                disabled={phase !== "question" || submitting}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#6b5b95]">
                  {answer.length} / {MAX_ANSWER_LENGTH}
                </span>
                {phase === "question" ? (
                  <PixelButton onClick={handleSubmit} disabled={submitting || !answer.trim()}>
                    {submitting ? "提交中…" : "提交回答"}
                  </PixelButton>
                ) : (
                  <PixelButton variant="secondary" onClick={handleContinue}>
                    继续追问
                  </PixelButton>
                )}
              </div>
            </div>
          </section>
          <aside className="md:col-span-2">
            <FeedbackCard response={feedback} loading={phase === "question" && !feedback} />
          </aside>
        </div>
      </div>
    </div>
    </div>
  );
};

export default DialogBox;
