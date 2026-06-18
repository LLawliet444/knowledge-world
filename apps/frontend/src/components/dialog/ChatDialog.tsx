import React, { useState, useEffect, useRef, useCallback } from "react";
import { useWorldStore } from "../../store/worldStore";
import { getQuestion, getFeedback } from "../../api/nodes";
import { ScholarLoading } from "./ScholarLoading";
import { MentorAvatar } from "./MentorAvatar";
import { PixelButton } from "../common/PixelButton";
import type { WorldNode, LayerType } from "../../types/world";
import type { FeedbackCard } from "../../types/feedback";

interface ChatMessage {
  id: number;
  role: "mentor" | "user";
  type: "text" | "feedback" | "completed";
  text: string;
  feedback?: FeedbackCard;
  depthState?: string;
  showActions?: boolean;
}

interface ChatDialogProps {
  node: WorldNode;
  depth: LayerType;
  initialRound: number;
  depthLabel: string;
  onClose: () => void;
}

export const ChatDialog: React.FC<ChatDialogProps> = ({
  node,
  depth,
  initialRound,
  depthLabel,
  onClose,
}) => {
  const { updateNodeDepthState } = useWorldStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [currentRound, setCurrentRound] = useState(initialRound);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, submitting]);

  const fetchQuestion = useCallback(async (round: number) => {
    setSubmitting(true);
    try {
      const res = await getQuestion({
        node_id: node.id,
        node_name: node.name,
        depth,
        mystery_question: node.mysteryQuestion,
        source_excerpt: node.sourceExcerpt,
        mentor_prompts: node.mentorPrompts,
        round: round as 1 | 2 | 3,
      });
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), role: "mentor", type: "text", text: res.question },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: "mentor",
          type: "text",
          text: `用你自己的话解释：【${node.name}】？`,
        },
      ]);
    } finally {
      setSubmitting(false);
    }
  }, [node, depth]);

  useEffect(() => {
    fetchQuestion(initialRound);
  }, []);

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || submitting) return;
    const userText = inputText.trim();
    setInputText("");

    setMessages((prev) => [
      ...prev,
      { id: Date.now(), role: "user", type: "text", text: userText },
    ]);

    setSubmitting(true);
    try {
      const res = await getFeedback({
        node_id: node.id,
        node_name: node.name,
        source_excerpt: node.sourceExcerpt,
        user_answer: userText,
        depth,
        round: currentRound as 1 | 2 | 3,
      });

      updateNodeDepthState(node.id, depth, res.depth_state);

      const isCompleted = res.depth_state === "completed";

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: "mentor",
          type: "feedback",
          text: "",
          feedback: res.feedback_card,
          depthState: res.depth_state,
          showActions: !isCompleted && currentRound < 3,
        },
      ]);

      if (isCompleted) {
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now(),
              role: "mentor",
              type: "completed",
              text: "",
              depthState: "completed",
            },
          ]);
        }, 300);
      }
    } finally {
      setSubmitting(false);
    }
  }, [inputText, submitting, node, depth, currentRound, updateNodeDepthState]);

  const handleContinue = useCallback(async () => {
    const nextRound = currentRound + 1;
    setCurrentRound(nextRound);
    setSubmitting(true);

    try {
      const res = await getQuestion({
        node_id: node.id,
        node_name: node.name,
        depth,
        mystery_question: node.mysteryQuestion,
        source_excerpt: node.sourceExcerpt,
        mentor_prompts: node.mentorPrompts,
        round: nextRound as 1 | 2 | 3,
      });
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), role: "mentor", type: "text", text: res.question },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: "mentor",
          type: "text",
          text: `继续思考：关于【${node.name}】，你还有什么想补充的吗？`,
        },
      ]);
    } finally {
      setSubmitting(false);
    }
  }, [currentRound, node, depth]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const renderMessage = (msg: ChatMessage) => {
    const isMentor = msg.role === "mentor";

    if (msg.type === "feedback" && msg.feedback) {
      const fb = msg.feedback;
      return (
        <div key={msg.id} style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "flex-start" }}>
          <div style={{ flexShrink: 0 }}>
            <MentorAvatar variant="avatar" size={36} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: "#492310", fontWeight: "bold", marginBottom: 4 }}>
              老学者
            </div>
            <div
              style={{
                backgroundColor: "#fff7e6",
                border: "3px solid #b56c27",
                padding: 12,
                fontSize: 15,
                lineHeight: 1.7,
                color: "#492310",
              }}
            >
              {(fb.understood ?? []).length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <span style={{ color: "#5d9c3f", fontWeight: "bold" }}>✓ 做得好：</span>
                  {fb.understood.join(" ")}
                </div>
              )}
              {(fb.missing ?? []).length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <span style={{ color: "#b56c27", fontWeight: "bold" }}>! 还缺一点：</span>
                  {fb.missing.join(" ")}
                </div>
              )}
              {fb.guidance && (
                <div style={{ marginBottom: 8 }}>
                  <span style={{ color: "#6b5b95", fontWeight: "bold" }}>🔍 </span>
                  {fb.guidance}
                </div>
              )}
              {fb.next_question && (
                <>
                  <div style={{ borderTop: "2px dashed #eeb069", margin: "8px 0" }} />
                  <div style={{ fontStyle: "italic" }}>
                    <span style={{ fontWeight: "bold" }}>💬 老学者又问：</span>「{fb.next_question}」
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (msg.type === "completed") {
      return (
        <div
          key={msg.id}
          style={{
            backgroundColor: "#dff0e4",
            border: "3px solid #5d9c3f",
            padding: 16,
            textAlign: "center",
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: "bold", color: "#5d9c3f", marginBottom: 8 }}>
            🎉 这一层你已经掌握了！
          </div>
          <div style={{ fontSize: 14, color: "#492310", marginBottom: 12 }}>
            迷雾散去了一部分——对前一个节点的理解让你看见了相邻的问题。
          </div>
          <PixelButton onClick={onClose} variant="success">
            继续探索
          </PixelButton>
        </div>
      );
    }

    return (
      <div
        key={msg.id}
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 12,
          alignItems: "flex-start",
          flexDirection: isMentor ? "row" : "row-reverse",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            backgroundColor: isMentor ? "#cf8442" : "#5d9c3f",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            color: "#fff",
            flexShrink: 0,
            border: "2px solid #492310",
          }}
        >
          {isMentor ? "🧙" : "🧑"}
        </div>
        <div
          style={{
            maxWidth: "70%",
            backgroundColor: isMentor ? "#fff7e6" : "#e8f5e9",
            border: `3px solid ${isMentor ? "#b56c27" : "#5d9c3f"}`,
            padding: "10px 14px",
            fontSize: 15,
            lineHeight: 1.6,
            color: "#492310",
          }}
        >
          {msg.text}
        </div>
      </div>
    );
  };

  const hasFeedbackMessage = messages.some((m) => m.type === "feedback" || m.type === "completed");
  const showRoundBadge = messages.length > 0 && !hasFeedbackMessage;
  const showInput = !messages.some((m) => m.type === "completed");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, minHeight: 400, maxHeight: 520 }}>
      <div
        style={{
          fontSize: 20,
          lineHeight: 1.5,
          color: "#492310",
          paddingBottom: 8,
          borderBottom: "3px dashed #b56c27",
          marginBottom: 8,
        }}
      >
        ❓ {node.mysteryQuestion}
      </div>

      {showRoundBadge && (
        <div
          style={{
            display: "inline-block",
            alignSelf: "flex-end",
            backgroundColor: "#cf8442",
            color: "#fff7e6",
            padding: "3px 10px",
            border: "2px solid #492310",
            textShadow: "1px 1px 0px #492310",
            fontSize: 11,
            marginBottom: 8,
          }}
        >
          {depthLabel} · 第 {currentRound} / 3 轮
        </div>
      )}

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "8px 4px",
          minHeight: 200,
          maxHeight: 320,
        }}
      >
        {messages.map(renderMessage)}

        {submitting && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: 8,
              marginBottom: 12,
            }}
          >
            <MentorAvatar variant="avatar" size={28} />
            <ScholarLoading animating size={36} />
            <span style={{ fontSize: 13, color: "#492310" }}>
              {messages.length === 0 ? "老学者正在思考问题…" : "老学者正在思考你的回答…"}
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {showInput && (
        <div
          style={{
            borderTop: "3px solid #b56c27",
            padding: "8px 0",
            display: "flex",
            gap: 8,
            alignItems: "flex-end",
          }}
        >
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value.slice(0, 500))}
            onKeyDown={handleKeyDown}
            placeholder="用你自己的话回答。不必完美，真诚就好。"
            rows={2}
            disabled={submitting}
            style={{
              flex: 1,
              backgroundColor: "#fff7e6",
              border: "3px solid #b56c27",
              padding: 10,
              fontFamily: "'Zpix', 'Press Start 2P', 'Microsoft YaHei', monospace",
              fontSize: 14,
              color: "#492310",
              outline: "none",
              boxShadow: "inset 3px 3px 0px rgba(0,0,0,0.1)",
              resize: "none",
              opacity: submitting ? 0.5 : 1,
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#da9100";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "#b56c27";
            }}
          />
          <PixelButton onClick={handleSend} disabled={!inputText.trim() || submitting} variant="primary">
            发送
          </PixelButton>
        </div>
      )}

      {/* Show action buttons for feedback without "继续追问" */}
      {!submitting &&
        messages
          .filter((m) => m.type === "feedback" && m.showActions)
          .slice(-1)
          .map((msg) => (
            <div key={`actions-${msg.id}`} style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 4 }}>
              <PixelButton onClick={onClose} variant="secondary">
                完成探索
              </PixelButton>
              <PixelButton onClick={handleContinue} variant="primary">
                继续追问
              </PixelButton>
            </div>
          ))}
    </div>
  );
};

export default ChatDialog;
