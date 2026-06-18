import React from "react";
import type { FeedbackCard as FeedbackCardData } from "../../types/feedback";
import { PixelButton } from "../common/PixelButton";

interface ConversationalFeedbackProps {
  feedback: FeedbackCardData;
  depthState: string;
  onContinue: () => void;
  onClose: () => void;
}

export const ConversationalFeedback: React.FC<ConversationalFeedbackProps> = ({
  feedback,
  depthState,
  onContinue,
  onClose,
}) => {
  const isCompleted = depthState === "completed";
  const hasUnderstood = (feedback.understood ?? []).length > 0;
  const hasMissing = (feedback.missing ?? []).length > 0;
  const hasGuidance = !!feedback.guidance;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {isCompleted ? (
        <div
          style={{
            backgroundColor: "#dff0e4",
            border: "4px solid #5d9c3f",
            boxShadow: "0 0 0 4px #97e65e",
            borderRadius: 0,
            padding: 20,
          }}
        >
          <div style={{ fontSize: 18, fontWeight: "bold", color: "#5d9c3f", marginBottom: 10 }}>
            🎉 这一层你已经掌握了！
          </div>
          <div style={{ fontSize: 16, lineHeight: 1.7, color: "#492310" }}>
            迷雾散去了一部分——对前一个节点的理解让你看见了相邻的问题。
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <PixelButton onClick={onClose} variant="success">
              继续探索
            </PixelButton>
          </div>
        </div>
      ) : (
        <>
          {/* 老学者反馈正文 */}
          <div
            style={{
              backgroundColor: "#fff7e6",
              border: "4px solid #b56c27",
              boxShadow: "0 0 0 4px #eeb069",
              padding: 20,
              fontSize: 16,
              lineHeight: 1.8,
              color: "#492310",
            }}
          >
            {hasUnderstood && (
              <div style={{ marginBottom: hasMissing || hasGuidance ? 14 : 0 }}>
                <span style={{ color: "#5d9c3f", fontWeight: "bold" }}>✓ </span>
                <span style={{ color: "#5d9c3f", fontWeight: "bold" }}>做得好：</span>
                {feedback.understood.join(" ")}
              </div>
            )}

            {hasMissing && (
              <div style={{ marginBottom: hasGuidance ? 14 : 0 }}>
                <span style={{ color: "#b56c27", fontWeight: "bold" }}>! </span>
                <span style={{ color: "#b56c27", fontWeight: "bold" }}>还缺一点：</span>
                {feedback.missing.join(" ")}
              </div>
            )}

            {hasGuidance && (
              <div>
                <span style={{ color: "#6b5b95", fontWeight: "bold" }}>🔍 </span>
                {feedback.guidance}
              </div>
            )}
          </div>

          {/* 老学者提问 */}
          {feedback.next_question && (
            <div
              style={{
                backgroundColor: "#f0e8d8",
                border: "4px solid #8b5a2b",
                boxShadow: "0 0 0 4px #d4b896",
                padding: 20,
                fontSize: 16,
                lineHeight: 1.7,
                color: "#492310",
                fontStyle: "italic",
              }}
            >
              <div style={{ fontWeight: "bold", fontStyle: "normal", marginBottom: 6, color: "#8b5a2b" }}>
                💬 老学者又问：
              </div>
              「{feedback.next_question}」
            </div>
          )}

          {/* 底部按钮 */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <PixelButton onClick={onClose} variant="secondary">
              稍后回来
            </PixelButton>
            <PixelButton onClick={onContinue} variant="primary">
              继续追问
            </PixelButton>
          </div>
        </>
      )}
    </div>
  );
};

export default ConversationalFeedback;
