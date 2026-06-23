/**
 * 原问回响对话框 —— NPC 提问版
 *
 * system 层全通后回到 what 层，由节点 NPC（而非老学者）向用户提出原始问题。
 * 不复用 ChatDialog（老学者对话），独立组件：
 *   - 顶部缎带显示 NPC 身份（如"讲故事的人"）
 *   - NPC 头像 + 提问气泡
 *   - 用户输入回答
 *   - 提交后 NPC 回应 + 节点完成
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useWorldStore } from "../../store/worldStore";
import { useKnowledgeStore } from "../../store/knowledgeStore";
import { finalAnswer } from "../../api/nodes";
import { ApprenticeAvatar } from "./ApprenticeAvatar";
import { PixelButton } from "../common/PixelButton";
import type { WorldNode } from "../../types/world";

interface FinalQuestionDialogProps {
  node: WorldNode;
  onClose: () => void;
}

interface FinalMessage {
  id: number;
  role: "npc" | "user";
  text: string;
  /** verdict 标记（仅用于 NPC 点评消息） */
  verdict?: "correct" | "partial" | "incorrect";
  isFinish?: boolean;
  /** npc 消息是否已完成打字效果 */
  typed?: boolean;
}

let messageIdSeq = 1;
function genId(): number {
  return messageIdSeq++;
}

export const FinalQuestionDialog: React.FC<FinalQuestionDialogProps> = ({
  node,
  onClose,
}) => {
  const { setFinalQuestion, setFinalQuestionVerdict, sessionId, unlockNextNode, world } = useWorldStore();
  const { recordLayer, aggregateNode, generateBook, isBookReady } = useKnowledgeStore();
  const [messages, setMessages] = useState<FinalMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [nodeCompleted, setNodeCompleted] = useState(false);
  /** 终问未通过（partial/incorrect），显示"再试一次"按钮 */
  const [needRetry, setNeedRetry] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initRef = useRef(false);

  // 打字机效果
  const [typingId, setTypingId] = useState<number | null>(null);
  const [typedChars, setTypedChars] = useState(0);

  // 初始化：NPC 提出原始问题
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    setMessages([
      {
        id: genId(),
        role: "npc",
        text: `你已走完了认知、机制、本质、体系四层探索。\n现在，带着你收获的一切，回答我最初的问题：\n\n「${node.mysteryQuestion}」`,
      },
    ]);
  }, [node.mysteryQuestion]);

  // 打字机效果驱动
  useEffect(() => {
    const lastMentor = [...messages].reverse().find((m) => m.role === "npc" && !m.typed);
    if (!lastMentor) {
      setTypingId(null);
      return;
    }
    setTypingId(lastMentor.id);
    setTypedChars(0);
    let raf: number;
    let start: number | null = null;
    const total = lastMentor.text.length;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const elapsed = ts - start;
      // 每 35ms 打一个字
      const n = Math.min(total, Math.floor(elapsed / 35));
      setTypedChars(n);
      if (n < total) {
        raf = requestAnimationFrame(step);
      } else {
        // 打字完成
        setMessages((prev) =>
          prev.map((m) => (m.id === lastMentor.id ? { ...m, typed: true } : m)),
        );
        setTypingId(null);
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [messages]);

  // 自动滚动到底部
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }
  }, [messages, typingId, typedChars]);

  const skipTyping = useCallback(() => {
    if (typingId === null) return;
    setMessages((prev) =>
      prev.map((m) => (m.id === typingId ? { ...m, typed: true } : m)),
    );
    setTypingId(null);
  }, [typingId]);

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || submitting || typingId !== null) return;
    const userText = inputText.trim();
    setInputText("");

    setMessages((prev) => [
      ...prev,
      { id: genId(), role: "user", text: userText, typed: true },
    ]);

    setSubmitting(true);

    let verdict: "correct" | "partial" | "incorrect" = "partial";
    let comment = "";
    try {
      if (!sessionId) throw new Error("no session");
      const res = await finalAnswer(sessionId, node.id, userText);
      verdict = res.verdict;
      comment = res.comment;
    } catch (err) {
      comment = "你的回答我收到了。经过四层探索，你已经有了自己的理解。这个节点的探索完成了。";
    }

    // 根据 verdict 构造 NPC 点评前缀
    const verdictPrefix: Record<typeof verdict, string> = {
      correct: "✅ 回答得很好！",
      partial: "🤔 方向是对的，",
      incorrect: "❄ 这个角度有点偏，不过没关系，",
    };
    const finishText = verdict === "correct"
      ? "这个节点的探索全部完成了。"
      : "再想想？你可以重新组织语言，再回答一次。";
    const npcText = `${verdictPrefix[verdict]}\n\n${comment}\n\n${finishText}`;

    setMessages((prev) => [
      ...prev,
      {
        id: genId(),
        role: "npc",
        text: npcText,
        verdict,
        isFinish: true,
      },
    ]);

    // 记录 verdict 到 store（无论对错）
    setFinalQuestionVerdict(node.id, verdict);
    // 记录用户终问回答到思考笔记
    recordLayer(node.id, "final", userText, comment);

    // 不管对错都解锁下一节点（用户可反复回答 NPC 问题）；
    // 只有 correct 时才标记终问完成 + nodeClear（绿色通关）
    unlockNextNode(node.id);
    if (verdict === "correct") {
      setFinalQuestion(node.id, "completed");
      setNodeCompleted(true);
      // 聚合节点思考笔记
      if (world) {
        aggregateNode(node.id, world);
        // 全部节点完成 → 生成全书合集
        if (isBookReady(world)) {
          generateBook(world);
        }
      }
    } else {
      // 未通过 → 保持 finalQuestion="available"，允许重试
      setNeedRetry(true);
    }
    setSubmitting(false);
  }, [inputText, submitting, typingId, node.id, sessionId, setFinalQuestion, setFinalQuestionVerdict, unlockNextNode, recordLayer, aggregateNode, generateBook, isBookReady, world]);

  /** 再试一次：清空对话，重新展示原始问题 */
  const handleRetry = useCallback(() => {
    setMessages([
      {
        id: genId(),
        role: "npc",
        text: `再试一次吧。带着你刚才的思考，重新回答：\n\n「${node.mysteryQuestion}」`,
      },
    ]);
    setNeedRetry(false);
    setInputText("");
    setNodeCompleted(false);
  }, [node.mysteryQuestion]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const renderMessage = (msg: FinalMessage) => {
    const isNpc = msg.role === "npc";
    const isTypingThis = msg.id === typingId;
    const displayText = isTypingThis ? msg.text.slice(0, typedChars) : msg.text;

    let bgColor = isNpc ? "#fff7e6" : "#e8f5e9";
    let borderColor = isNpc ? "#b56c27" : "#5d9c3f";
    if (msg.isFinish) {
      // 根据 verdict 显示不同颜色
      if (msg.verdict === "correct") {
        bgColor = "#dff0e4";
        borderColor = "#5d9c3f";
      } else if (msg.verdict === "incorrect") {
        bgColor = "#fde8e8";
        borderColor = "#c05050";
      } else {
        bgColor = "#fff4d6";
        borderColor = "#da9100";
      }
    }

    return (
      <div
        key={msg.id}
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 10,
          alignItems: "flex-start",
          flexDirection: isNpc ? "row" : "row-reverse",
        }}
      >
        {isNpc ? (
          <div
            style={{
              width: 48,
              height: 48,
              flexShrink: 0,
              backgroundColor: "#3a2a1a",
              border: "4px solid #da9100",
              boxShadow: "0 0 0 4px #eeb069",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <img
              src={node.gateNpc.avatar}
              alt={node.gateNpc.title}
              style={{
                width: 40,
                height: 40,
                imageRendering: "pixelated",
              }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        ) : (
          <ApprenticeAvatar size={32} />
        )}
        <div style={{ maxWidth: "70%", minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              color: "#492310",
              fontWeight: "bold",
              marginBottom: 2,
              textAlign: isNpc ? "left" : "right",
            }}
          >
            {isNpc ? node.gateNpc.title : "学徒"}
          </div>
          <div
            onClick={isTypingThis ? skipTyping : undefined}
            style={{
              backgroundColor: bgColor,
              border: `3px solid ${borderColor}`,
              padding: "10px 14px",
              fontSize: 15,
              lineHeight: 1.7,
              color: "#492310",
              whiteSpace: "pre-wrap",
              cursor: isTypingThis ? "pointer" : "default",
            }}
          >
            {displayText}
            {isTypingThis && (
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  marginLeft: 2,
                  color: "#b56c27",
                  animation: "pulse 0.7s ease-in-out infinite",
                }}
              >
                ▌
              </span>
            )}
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
          backgroundColor: "#6b5b95",
          color: "#fff7e6",
          padding: "3px 10px",
          border: "2px solid #492310",
          textShadow: "1px 1px 0px #492310",
          fontSize: 11,
          marginBottom: 8,
        }}
      >
        原问回响 · {node.gateNpc.title}
      </div>

      <div
        ref={messagesEndRef}
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
              {node.gateNpc.title}正在倾听你的回答…
            </span>
            <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
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
      </div>

      {!nodeCompleted && !needRetry && (
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
            disabled={submitting || typingId !== null}
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
              opacity: submitting || typingId !== null ? 0.5 : 1,
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
            disabled={!inputText.trim() || submitting || typingId !== null}
            variant="primary"
          >
            发送
          </PixelButton>
        </div>
      )}

      {needRetry && (
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            padding: "8px 0",
          }}
        >
          <PixelButton onClick={handleRetry} variant="primary">
            再试一次
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

export default FinalQuestionDialog;
