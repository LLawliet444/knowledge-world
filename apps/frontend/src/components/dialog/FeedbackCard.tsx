/**
 * 四段式诊断反馈卡
 *
 * PRD §4.2.6：已理解 / 还缺一点 / 提示 / 下一问
 */

import React from "react";
import type { FeedbackCard } from "../../types/feedback";
import { PixelButton } from "../common/PixelButton";

interface FeedbackCardProps {
  feedback: FeedbackCard;
  feedbackLevel: string;
  depthState: string;
  onContinue: () => void;
  onClose: () => void;
}

export const FeedbackCard: React.FC<FeedbackCardProps> = ({
  feedback,
  feedbackLevel,
  depthState,
  onContinue,
  onClose,
}) => {
  const isCompleted = depthState === "completed";

  return (
    <div className="grid gap-3 w-full md:grid-cols-2">
      {/* 已理解 */}
      <div className="rounded border-4 border-[#3a1f0a] bg-[#dff0e4] p-4 shadow-[3px_3px_0_0_#3a1f0a]">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">✅</span>
          <span className="font-pixel text-xs text-[#1a1226]">你已理解</span>
        </div>
        <ul className="list-disc list-inside font-body text-base text-[#1a1226] space-y-1">
          {(feedback.understood ?? []).map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </div>

      {/* 还缺一点 */}
      <div className="rounded border-4 border-[#3a1f0a] bg-[#fbe3b4] p-4 shadow-[3px_3px_0_0_#3a1f0a]">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">💡</span>
          <span className="font-pixel text-xs text-[#1a1226]">还缺一点</span>
        </div>
        <ul className="list-disc list-inside font-body text-base text-[#1a1226] space-y-1">
          {(feedback.missing ?? []).map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </div>

      {/* 提示 */}
      <div className="rounded border-4 border-[#3a1f0a] bg-[#e8d5f7] p-4 shadow-[3px_3px_0_0_#3a1f0a]">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">
            {feedbackLevel === "minimal_explain" ? "📖" : "🔍"}
          </span>
          <span className="font-pixel text-xs text-[#1a1226]">提示</span>
        </div>
        <p className="font-body text-base text-[#1a1226] leading-snug">
          {feedback.guidance}
        </p>
      </div>

      {/* 下一问 / 完成 */}
      <div className="rounded border-4 border-[#3a1f0a] bg-[#dff0e4] p-4 shadow-[3px_3px_0_0_#3a1f0a] flex flex-col">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">{isCompleted ? "🎉" : "🔄"}</span>
          <span className="font-pixel text-xs text-[#1a1226]">
            {isCompleted ? "已掌握！" : "下一问"}
          </span>
        </div>
        {isCompleted ? (
          <div className="flex-1 flex flex-col justify-between gap-3">
            <p className="font-body text-base text-[#1a1226]">
              这一层的核心你已经掌握！迷雾散去了一部分——
              对前一个节点的理解让你看见了相邻的问题。
            </p>
            <PixelButton onClick={onClose} variant="primary">
              继续探索
            </PixelButton>
          </div>
        ) : (
          <p className="font-body text-base text-[#1a1226] leading-snug">
            {feedback.next_question}
          </p>
        )}
      </div>

      {/* 底部：继续追问 / 关闭 */}
      {!isCompleted && (
        <div className="md:col-span-2 flex justify-end gap-2 mt-1">
          <PixelButton onClick={onClose} variant="secondary">
            稍后回来
          </PixelButton>
          <PixelButton onClick={onContinue}>继续追问</PixelButton>
        </div>
      )}
    </div>
  );
};

export default FeedbackCard;
