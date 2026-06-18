import React, { useState, useEffect, useRef, useCallback } from "react";
import { useWorldStore } from "../../store/worldStore";
import { createSession, enterNode, answerNode } from "../../api/nodes";
import { MentorAvatar } from "./MentorAvatar";
import { ApprenticeAvatar } from "./ApprenticeAvatar";
import { PixelButton } from "../common/PixelButton";
import type { WorldNode, LayerType } from "../../types/world";
import type { TeachingContent } from "../../types/feedback";

interface ChatMessage {
  id: number;
  role: "mentor" | "user";
  text: string;
  teaching?: TeachingContent;
  isEvaluation?: boolean;
  isLayerTransition?: boolean;
  evalReason?: string;
}

interface ChatDialogProps {
  node: WorldNode;
  depth: LayerType;
  depthLabel: string;
  onClose: () => void;
}

const LAYER_LABELS: Record<string, string> = {
  how: "机制理解",
  why: "本质抽象",
  system: "体系建模",
};

/** 将 TeachingContent | null 转为 ChatMessage.teaching 所需的类型 */
function tc(t: TeachingContent | null): TeachingContent | undefined {
  return t ?? undefined;
}

export const ChatDialog: React.FC<ChatDialogProps> = ({
  node,
  depthLabel,
  onClose,
}) => {
  const { updateNodeDepthState } = useWorldStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentLayer, setCurrentLayer] = useState<string>("how");
  const [nodeCompleted, setNodeCompleted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, submitting]);

  const initSession = useCallback(async () => {
    setSubmitting(true);
    try {
      const sess = await createSession();
      setSessionId(sess.session_id);

      const enterRes = await enterNode(sess.session_id, node.id);
      setCurrentLayer(enterRes.current_layer);
      setMessages([
        {
          id: Date.now(),
          role: "mentor",
          text: enterRes.teaching_content.content,
          teaching: enterRes.teaching_content,
        },
      ]);
    } catch {
      setMessages([
        {
          id: Date.now(),
          role: "mentor",
          text: "试着从这几个角度思考：\n\n1. 回顾一下这个知识点的核心事实\n2. 它背后的运行机制是什么？\n3. 它和我们已经知道的其他知识有什么联系？\n\n【引导问题】\n用你自己的话解释一下，你是怎么理解这个知识点的？",
        },
      ]);
    } finally {
      setSubmitting(false);
    }
  }, [node.id]);

  useEffect(() => {
    initSession();
  }, []);

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || submitting || !sessionId) return;
    const userText = inputText.trim();
    setInputText("");

    setMessages((prev) => [
      ...prev,
      { id: Date.now(), role: "user", text: userText },
    ]);

    setSubmitting(true);

    try {
      const res = await answerNode(sessionId, node.id, userText);
      setCurrentLayer(res.current_layer);

      const tcContent = res.teaching_content;
      const evalResult = res.evaluation;

      if (res.node_completed) {
        setNodeCompleted(true);
        updateNodeDepthState(node.id, res.current_layer as LayerType, "completed");

        const layerLabel = LAYER_LABELS[res.current_layer] ?? res.current_layer;
        const evalMsgs: ChatMessage[] = evalResult
          ? [
              {
                id: Date.now(),
                role: "mentor",
                text: `📋 本层评估（${layerLabel}）\n${evalResult.reason}`,
                isEvaluation: true,
                evalReason: evalResult.reason,
              },
            ]
          : [];
        setMessages((prev) => [
          ...prev,
          ...evalMsgs,
          {
            id: Date.now(),
            role: "mentor",
            text: "🎉 这个节点的探索已经全部完成了！迷雾散去了一部分——对前一个节点的理解让你看见了相邻的问题。",
          },
        ]);
        return;
      }

      if (res.can_advance && res.layer_summary) {
        const oldLayerLabel = LAYER_LABELS[currentLayer] ?? currentLayer;
        const newLayerLabel = LAYER_LABELS[res.current_layer] ?? res.current_layer;

        const transitionMsg: ChatMessage = {
          id: Date.now(),
          role: "mentor",
          text: `✅ ${oldLayerLabel} 已通过\n\n${res.layer_summary}\n\n现在进入 ${newLayerLabel} 层。`,
          isLayerTransition: true,
        };

        const nextMsgs: ChatMessage[] = [transitionMsg];
        if (tcContent) {
          nextMsgs.push({
            id: Date.now(),
            role: "mentor",
            text: tcContent.content,
            teaching: tc(tcContent),
          });
        }
        setMessages((prev) => [...prev, ...nextMsgs]);
      } else if (tcContent) {
        const evalMsgs2: ChatMessage[] = evalResult
          ? [
              {
                id: Date.now(),
                role: "mentor",
                text: `📋 老学者评估：${evalResult.reason}`,
                isEvaluation: true,
              },
            ]
          : [];
        setMessages((prev) => [
          ...prev,
          ...evalMsgs2,
          {
            id: Date.now(),
            role: "mentor",
            text: tcContent.content,
            teaching: tc(tcContent),
          },
        ]);
      } else if (evalResult) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            role: "mentor",
            text: `📋 老学者评估：${evalResult.reason}`,
            isEvaluation: true,
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: "mentor",
          text: "听起来学到了不少知识。试着换一个角度再想想看？",
        },
      ]);
    } finally {
      setSubmitting(false);
    }
  }, [inputText, submitting, sessionId, node.id, currentLayer, updateNodeDepthState]);

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

    let bgColor = isMentor ? "#fff7e6" : "#e8f5e9";
    let borderColor = isMentor ? "#b56c27" : "#5d9c3f";

    if (msg.isLayerTransition) {
      bgColor = "#f0e8d8";
      borderColor = "#8b5a2b";
    } else if (msg.isEvaluation) {
      bgColor = "#dff0e4";
      borderColor = "#5d9c3f";
    } else if (msg.text.includes("🎉")) {
      bgColor = "#dff0e4";
      borderColor = "#5d9c3f";
    }

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
        <div style={{ maxWidth: "70%", minWidth: 0 }}>
          <div
            style={{
              backgroundColor: bgColor,
              border: `3px solid ${borderColor}`,
              padding: "10px 14px",
              fontSize: 15,
              lineHeight: 1.7,
              color: "#492310",
              whiteSpace: "pre-wrap",
            }}
          >
            {msg.text}
          </div>
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
        {depthLabel} · {LAYER_LABELS[currentLayer] ?? currentLayer}
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
              {messages.length === 0
                ? "创建学习会话…"
                : "老学者正在思考你的回答…"}
            </span>
            <span
              style={{ display: "inline-flex", gap: 4, alignItems: "center" }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  backgroundColor: "#492310",
                  animation: "pulse 0.8s ease-in-out infinite",
                }}
              />
              <span
                style={{
                  width: 6,
                  height: 6,
                  backgroundColor: "#492310",
                  animation: "pulse 0.8s ease-in-out 0.15s infinite",
                }}
              />
              <span
                style={{
                  width: 6,
                  height: 6,
                  backgroundColor: "#492310",
                  animation: "pulse 0.8s ease-in-out 0.3s infinite",
                }}
              />
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {!nodeCompleted && (
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
              fontFamily:
                "'Zpix', 'Press Start 2P', 'Microsoft YaHei', monospace",
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
          <PixelButton
            onClick={handleSend}
            disabled={!inputText.trim() || submitting}
            variant="primary"
          >
            发送
          </PixelButton>
        </div>
      )}

      {nodeCompleted && (
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            padding: "8px 0",
          }}
        >
          <PixelButton onClick={onClose} variant="success">
            继续探索
          </PixelButton>
        </div>
      )}
    </div>
  );
};

export default ChatDialog;
