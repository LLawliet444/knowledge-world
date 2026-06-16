import React from "react";

interface QuestionBubbleProps {
  nodeName: string;
  question: string | null;
  loading?: boolean;
}

/**
 * Renders the AI Socratic question in a chat-bubble style, with the NPC
 * scholar avatar to the left. A loading ellipsis animates while waiting for
 * the API response.
 */
export const QuestionBubble: React.FC<QuestionBubbleProps> = ({
  nodeName,
  question,
  loading,
}) => {
  return (
    <div className="flex gap-3 items-start">
      <div
        className="w-12 h-12 rounded border-4 border-[#1a1226] bg-[#f5d8a0] flex items-center justify-center shrink-0"
        aria-hidden
      >
        <img
          src="/characters/npc_old_scholar_avatar.png"
          alt="学者头像"
          className="w-10 h-10 object-contain"
          onError={(e) => {
            // Fallback: hide the image and show text instead.
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      </div>
      <div className="flex-1">
        <div className="text-xs text-[#6b5b95] font-pixel mb-1">
          关于【{nodeName}】，苏格拉底问你：
        </div>
        <div className="rounded border-4 border-[#1a1226] bg-[#fff8e6] px-3 py-3 text-[#1a1226] leading-relaxed font-body text-base shadow-[4px_4px_0_0_#1a1226]">
          {loading ? (
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-2 h-2 bg-[#1a1226] animate-pulse" />
              <span className="inline-block w-2 h-2 bg-[#1a1226] animate-pulse [animation-delay:120ms]" />
              <span className="inline-block w-2 h-2 bg-[#1a1226] animate-pulse [animation-delay:240ms]" />
            </span>
          ) : (
            <span>{question ?? "请稍候…"}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuestionBubble;
