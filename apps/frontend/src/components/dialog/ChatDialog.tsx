import React, { useState, useEffect, useRef, useCallback } from "react";
import { useWorldStore } from "../../store/worldStore";
import { createSession, enterNode, answerNode, getSessionStatus } from "../../api/nodes";
import { MentorAvatar } from "./MentorAvatar";
import { ApprenticeAvatar } from "./ApprenticeAvatar";
import { PixelButton } from "../common/PixelButton";
import type { WorldNode, LayerType } from "../../types/world";
import type { TeachingContent } from "../../types/feedback";
import { LAYER_ORDER } from "../../constants/biome";

/** 计算下一层；system 是最后一层，循环回 what（探索下一个节点） */
function nextLayerOf(layer: string): LayerType | null {
  const idx = LAYER_ORDER.indexOf(layer as LayerType);
  if (idx < 0) return null;
  if (idx === LAYER_ORDER.length - 1) return LAYER_ORDER[0];
  return LAYER_ORDER[idx + 1];
}

interface ChatMessage {
  id: number;
  role: "mentor" | "user";
  text: string;
  teaching?: TeachingContent;
  isEvaluation?: boolean;
  isLayerTransition?: boolean;
  evalReason?: string;
  /** mentor 消息是否已完成打字效果 */
  typed?: boolean;
}

interface ChatDialogProps {
  node: WorldNode;
  depth: LayerType;
  depthLabel: string;
  onClose: () => void;
  /** 原问回响模式：system 全通后回到 what 层解答初始问题 */
  isFinalQuestion?: boolean;
}

const LAYER_LABELS: Record<string, string> = {
  what: "认知层",
  how: "机制理解",
  why: "本质抽象",
  system: "体系建模",
};

/** 将 TeachingContent | null 转为 ChatMessage.teaching 所需的类型 */
function tc(t: TeachingContent | null): TeachingContent | undefined {
  return t ?? undefined;
}

/** 把 TeachingContent 渲染成可显示的纯文本 */
function teachingToText(t: TeachingContent): string {
  if (t.format === "guided_question") {
    const parts: string[] = [];
    if (t.opening) parts.push(t.opening);
    if (t.core_question) parts.push(`【核心问题】\n${t.core_question}`);
    if (t.thinking_directions && t.thinking_directions.length > 0) {
      parts.push(
        "【思考方向】\n" +
          t.thinking_directions.map((d, i) => `${i + 1}. ${d}`).join("\n"),
      );
    }
    return parts.join("\n\n");
  }
  // essence / model 层直接用 content
  return t.content ?? "";
}

export const ChatDialog: React.FC<ChatDialogProps> = ({
  node,
  depth,
  depthLabel,
  onClose,
  isFinalQuestion,
}) => {
  const { updateNodeDepthState, switchDepth, setFinalQuestion, sessionId: storeSessionId, setSessionId } = useWorldStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // 本组件不再持有独立 sessionId，统一从 store 读取（整个学习旅程共享）
  const sessionId = storeSessionId;
  // 当前层以 props depth 为准（enterNode 固定返回 "how"，不可信）
  const [currentLayer, setCurrentLayer] = useState<string>(depth);
  const [nodeCompleted, setNodeCompleted] = useState(false);
  // 层推进后待切换：值为目标层名。打字全部完成后延迟切换地图
  const [pendingSwitch, setPendingSwitch] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // 防止 StrictMode 双重挂载导致 initSession 重复执行
  const initRef = useRef(false);

  // ── 打字机效果状态 ─────────────────────────────────────────────────────
  // typingId: 当前正在打字的消息 id；typedChars: 已显示字符数
  const [typingId, setTypingId] = useState<number | null>(null);
  const [typedChars, setTypedChars] = useState(0);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, submitting, typedChars]);

  // 找到下一条未打字的 mentor 消息，启动打字
  useEffect(() => {
    if (typingId !== null) return;
    const next = messages.find((m) => m.role === "mentor" && !m.typed);
    if (next) {
      setTypedChars(0);
      setTypingId(next.id);
    }
  }, [messages, typingId]);

  // 逐字推进当前打字消息
  useEffect(() => {
    if (typingId === null) return;
    const msg = messages.find((m) => m.id === typingId);
    if (!msg) {
      setTypingId(null);
      return;
    }
    const fullLen = msg.text.length;
    // 空文本直接完成
    if (fullLen === 0) {
      setMessages((prev) =>
        prev.map((m) => (m.id === typingId ? { ...m, typed: true } : m)),
      );
      setTypingId(null);
      return;
    }
    const timer = setInterval(() => {
      setTypedChars((c) => {
        const nxt = c + 2; // 每帧 +2 字符，兼顾速度与节奏
        if (nxt >= fullLen) {
          clearInterval(timer);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === typingId ? { ...m, typed: true } : m,
            ),
          );
          setTypingId(null);
          return fullLen;
        }
        return nxt;
      });
    }, 18);
    return () => clearInterval(timer);
  }, [typingId]);

  /** 点击跳过：立即显示当前打字消息的完整文本 */
  const skipTyping = useCallback(() => {
    if (typingId === null) return;
    setMessages((prev) =>
      prev.map((m) => (m.id === typingId ? { ...m, typed: true } : m)),
    );
    setTypingId(null);
  }, [typingId]);

  // 层推进后：所有消息打字完成 → 延迟几秒 → 自动切换地图
  useEffect(() => {
    if (!pendingSwitch) return;
    // 还在打字中，等打字完
    if (typingId !== null) return;
    // 确认所有 mentor 消息都已打完
    const allTyped = messages.every((m) => m.role !== "mentor" || m.typed);
    if (!allTyped) return;

    const timer = setTimeout(() => {
      const target = pendingSwitch;
      setPendingSwitch(null);
      // 节点状态已在 handleSend 中解锁，这里只负责关闭对话框 + 切换地图
      onClose();
      switchDepth(target as LayerType);
    }, 2500);
    return () => clearTimeout(timer);
  }, [pendingSwitch, typingId, messages, onClose, switchDepth]);

  const initSession = useCallback(async () => {
    if (initRef.current) return;
    initRef.current = true;
    setSubmitting(true);
    try {
      // 复用 store 中的 sessionId（整个学习旅程共享），没有才新建
      let sid = useWorldStore.getState().sessionId;
      if (!sid) {
        const sess = await createSession();
        sid = sess.session_id;
        setSessionId(sid);
      }

      // 先查后端状态：若当前节点正是本节点且进行中，恢复对话而非重新 enter
      const status = await getSessionStatus(sid);
      const isResuming =
        status &&
        status.frontendNodeId === node.id &&
        status.currentLayer === depth &&
        !status.nodeCompleted;

      if (isResuming && status) {
        const restored: ChatMessage[] = [];
        // 恢复最后一条 AI 问题（若有）
        if (status.lastAiQuestion) {
          restored.push({
            id: Date.now(),
            role: "mentor",
            text: status.lastAiQuestion,
          });
        }
        // 恢复最后一条用户回答（若有）
        if (status.lastUserAnswer) {
          restored.push({
            id: Date.now() + 1,
            role: "user",
            text: status.lastUserAnswer,
          });
        }
        if (restored.length > 0) {
          setMessages(restored);
        } else {
          // 后端有会话但无对话记录：重新 enter 拿首轮教学
          const enterRes = await enterNode(sid, node.id);
          setMessages([
            {
              id: Date.now(),
              role: "mentor",
              text: teachingToText(enterRes.teaching_content),
              teaching: enterRes.teaching_content,
            },
          ]);
        }
      } else {
        // 非恢复场景：进入节点
        const enterRes = await enterNode(sid, node.id);
        // 不用后端 current_layer（enterNode 固定返回 "how"，不可信），以 props depth 为准
        setMessages([
          {
            id: Date.now(),
            role: "mentor",
            text: teachingToText(enterRes.teaching_content),
            teaching: enterRes.teaching_content,
          },
        ]);
      }
    } catch {
      setMessages([
        {
          id: Date.now(),
          role: "mentor",
          text:
            "欢迎来到这一层，让我们一起来推导这个知识点背后的运行机制。\n\n" +
            "【核心问题】\n用你自己的话解释一下，你是怎么理解这个知识点的？",
        },
      ]);
    } finally {
      setSubmitting(false);
    }
  }, [node.id, depth, setSessionId]);

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
      // 不用后端 current_layer（不可信），以前端 currentLayer + can_advance 推进逻辑为准

      const tcContent = res.teaching_content;
      const evalResult = res.evaluation;

      if (res.can_advance) {
        // 原问回响模式：system 全通后回到 what 层解答初始问题，can_advance 即节点通关
        if (isFinalQuestion) {
          setFinalQuestion(node.id, "completed");
          const summaryText = res.layer_summary
            ? `\n\n${res.layer_summary}\n\n`
            : "\n\n";
          const finishMsgs: ChatMessage[] = [
            {
              id: Date.now(),
              role: "mentor",
              text: `✅ 你已成功回答了最初的问题！${summaryText}这个节点的探索全部完成了。`,
              isLayerTransition: true,
            },
          ];
          if (evalResult) {
            finishMsgs.push({
              id: Date.now() + 1,
              role: "mentor",
              text: `📋 老学者评估：${evalResult.reason}`,
              isEvaluation: true,
            });
          }
          setMessages((prev) => [...prev, ...finishMsgs]);
          setNodeCompleted(true);
          return;
        }

        // 用 LAYER_ORDER 计算下一层，不依赖后端 current_layer（可能未推进）
        // system 是最后一层，can_advance 后循环回 what（回到起点解答初始问题）
        const targetLayer = nextLayerOf(currentLayer);
        const isLoopBack = currentLayer === "system" && targetLayer === "what";
        const oldLayerLabel = LAYER_LABELS[currentLayer] ?? currentLayer;
        const newLayerLabel = targetLayer
          ? (LAYER_LABELS[targetLayer] ?? targetLayer)
          : oldLayerLabel;
        // 推进到新层：更新该节点旧层状态为 completed
        updateNodeDepthState(node.id, currentLayer as LayerType, "completed");
        // 立即解锁当前节点在新层为 available（不依赖打字完成）
        // system→what 循环不解锁 what 层（what 已 completed，将由 DialogBox 进入解答模式）
        if (targetLayer && !isLoopBack) {
          updateNodeDepthState(node.id, targetLayer, "available");
        }
        // system→what 循环：开启原问回响，让用户回到 what 层解答初始问题
        if (isLoopBack) {
          setFinalQuestion(node.id, "available");
        }

        const summaryText = res.layer_summary
          ? `\n\n${res.layer_summary}\n\n`
          : "\n\n";
        const transitionMsg: ChatMessage = {
          id: Date.now(),
          role: "mentor",
          text: isLoopBack
            ? `✅ ${oldLayerLabel} 已通过${summaryText}你已掌握解答之道，回到起点回答最初的问题。`
            : targetLayer
              ? `✅ ${oldLayerLabel} 已通过${summaryText}现在进入 ${newLayerLabel} 层。`
              : `✅ ${oldLayerLabel} 已通过${summaryText}`,
          isLayerTransition: true,
        };

        const nextMsgs: ChatMessage[] = [transitionMsg];
        // can_advance 后只展示 evaluation 结果，不再展示 teaching 内容
        if (evalResult) {
          nextMsgs.push({
            id: Date.now() + 1,
            role: "mentor",
            text: `📋 老学者评估：${evalResult.reason}`,
            isEvaluation: true,
          });
        }
        setMessages((prev) => [...prev, ...nextMsgs]);
        // 标记待切换：打字全部完成后延迟跳转地图
        if (targetLayer) {
          setPendingSwitch(targetLayer);
          setCurrentLayer(targetLayer);
        }
      } else if (res.node_completed) {
        setNodeCompleted(true);
        updateNodeDepthState(node.id, currentLayer as LayerType, "completed");

        const layerLabel = LAYER_LABELS[currentLayer] ?? currentLayer;
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
            text: teachingToText(tcContent),
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
  }, [inputText, submitting, sessionId, node.id, currentLayer, updateNodeDepthState, setFinalQuestion, isFinalQuestion]);

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
    const isTypingThis = msg.id === typingId;
    // 打字中的消息显示部分文本，其余显示完整文本
    const displayText = isTypingThis
      ? msg.text.slice(0, typedChars)
      : msg.text;

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
          alignItems: "flex-start",
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
            // 打字中点击气泡可跳过
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
            disabled={submitting || typingId !== null}
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
