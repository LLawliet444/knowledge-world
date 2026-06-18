import React, { useState, useEffect, useRef, useCallback } from "react";
import { useWorldStore } from "../../store/worldStore";
import { interact, judgeLevel, buildChatHistory } from "../../api/nodes";
import { MentorAvatar } from "./MentorAvatar";
import { ApprenticeAvatar } from "./ApprenticeAvatar";
import { PixelButton } from "../common/PixelButton";
import type { WorldNode, LayerType } from "../../types/world";
import type { ThinkingDirection } from "../../types/feedback";

interface ChatMessage {
  id: number;
  role: "mentor" | "user";
  text: string;
  directions?: ThinkingDirection[];
  hint?: string;
}

interface ChatDialogProps {
  node: WorldNode;
  depth: LayerType;
  depthLabel: string;
  onClose: () => void;
}

export const ChatDialog: React.FC<ChatDialogProps> = ({
  node,
  depth,
  depthLabel,
  onClose,
}) => {
  const { updateNodeDepthState } = useWorldStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [level, setLevel] = useState(1);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, submitting]);

  const fetchInteract = useCallback(
    async (userInput: string, currentLevel: number, chatHistory: string) => {
      setSubmitting(true);
      try {
        const res = await interact(node, userInput, currentLevel, chatHistory);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            role: "mentor",
            text: res.question,
            directions: res.directions,
            hint: res.hint,
          },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            role: "mentor",
            text: "用你自己的话解释一下，你是怎么理解这个知识点的？",
          },
        ]);
      } finally {
        setSubmitting(false);
      }
    },
    [node],
  );

  useEffect(() => {
    fetchInteract("", 1, "");
  }, []);

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || submitting) return;
    const userText = inputText.trim();
    setInputText("");

    setMessages((prev) => [
      ...prev,
      { id: Date.now(), role: "user", text: userText },
    ]);

    setSubmitting(true);

    try {
      const questions: string[] = [];
      const answers: string[] = [];
      for (const m of messages) {
        if (m.role === "mentor") questions.push(m.text);
        else if (m.role === "user") answers.push(m.text);
      }
      const chatHistory = buildChatHistory(questions, answers);

      const [interactRes, judgeRes] = await Promise.all([
        interact(node, userText, level, chatHistory),
        judgeLevel(node, userText),
      ]);

      const newLevel = Math.max(level, judgeRes.level);
      setLevel(newLevel);

      if (newLevel >= 4) {
        updateNodeDepthState(node.id, depth, "completed");
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            role: "mentor",
            text: interactRes.question,
            directions: interactRes.directions,
            hint: interactRes.hint,
          },
          {
            id: Date.now(),
            role: "mentor",
            text: "",
            type: "completed" as unknown as undefined,
          },
        ]);
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now(),
              role: "mentor",
              text: "🎉 这一层你已经掌握了！迷雾散去了一部分——对前一个节点的理解让你看见了相邻的问题。",
            },
          ]);
        }, 600);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            role: "mentor",
            text: interactRes.question,
            directions: interactRes.directions,
            hint: interactRes.hint,
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: "mentor",
          text: "听起来学到了不少知识，试着换一个角度再想想看？",
        },
      ]);
    } finally {
      setSubmitting(false);
    }
  }, [inputText, submitting, messages, node, level, depth, updateNodeDepthState]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const isCompleted = messages.some((m) => m.text.startsWith("🎉"));

  const renderMessage = (msg: ChatMessage) => {
    const isMentor = msg.role === "mentor";

    return (
      <div
        key={msg.id}
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 10,
          alignItems: "flex-end",
          flexDirection: isMentor ? "row" : "row-reverse",
        }}
      >
        {isMentor ? (
          <MentorAvatar variant="avatar" size={32} />
        ) : (
          <ApprenticeAvatar size={32} />
        )}
        <div style={{ maxWidth: "65%", flex: 1, minWidth: 0 }}>
          <div
            style={{
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

          {msg.directions && msg.directions.length > 0 && (
            <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
              {msg.directions.map((d, i) => (
                <div
                  key={i}
                  style={{
                    backgroundColor: "#f0e8d8",
                    border: "2px solid #8b5a2b",
                    padding: "6px 10px",
                    fontSize: 13,
                    color: "#492310",
                    lineHeight: 1.5,
                  }}
                >
                  <span style={{ fontWeight: "bold" }}>
                    {d.dimension === "observe" ? "👀 " : d.dimension === "reason" ? "🧠 " : "🌟 "}
                  </span>
                  {d.text}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

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
        {depthLabel}
      </div>

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
            <span style={{ fontSize: 13, color: "#492310" }}>
              {messages.length === 0 ? "老学者正在思考问题…" : "老学者正在思考你的回答…"}
            </span>
            <span
              style={{ display: "inline-flex", gap: 4, alignItems: "center" }}
            >
              <span style={{ width: 6, height: 6, backgroundColor: "#492310", animation: "pulse 0.8s ease-in-out infinite" }} />
              <span style={{ width: 6, height: 6, backgroundColor: "#492310", animation: "pulse 0.8s ease-in-out 0.15s infinite" }} />
              <span style={{ width: 6, height: 6, backgroundColor: "#492310", animation: "pulse 0.8s ease-in-out 0.3s infinite" }} />
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {!isCompleted && (
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
            ref={textareaRef}
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

      {isCompleted && (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "8px 0" }}>
          <PixelButton onClick={onClose} variant="success">
            继续探索
          </PixelButton>
        </div>
      )}
    </div>
  );
};

export default ChatDialog;
