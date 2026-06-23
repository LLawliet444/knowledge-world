import React, { useState, useEffect, useRef, useCallback } from "react";
import { useWorldStore } from "../../store/worldStore";
import { useKnowledgeStore } from "../../store/knowledgeStore";
import { createSession, enterNode, answerNode } from "../../api/nodes";
import { MentorAvatar } from "./MentorAvatar";
import { ApprenticeAvatar } from "./ApprenticeAvatar";
import { PixelButton } from "../common/PixelButton";
import type { WorldNode, LayerType } from "../../types/world";
import type { TeachingContent, AnswerResponse } from "../../types/feedback";
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
    if (t.thinking_direction) {
      parts.push(`【思考方向】\n${t.thinking_direction}`);
    }
    return parts.join("\n\n");
  }
  // essence / model 层直接用 content
  return t.content ?? "";
}

// 消息 id 递增计数器：替代 Date.now()，彻底避免同毫秒创建导致 React key 重复
let messageIdSeq = 1;
function genId(): number {
  return messageIdSeq++;
}

export const ChatDialog: React.FC<ChatDialogProps> = ({
  node,
  depth,
  depthLabel,
  onClose,
  isFinalQuestion,
}) => {
  const { updateNodeDepthState, switchDepth, setFinalQuestion, sessionId: storeSessionId, setSessionId } = useWorldStore();
  const { recordLayer } = useKnowledgeStore();
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
  // isLoopBack 时延迟设置的终问状态：等对话框关闭、切换到 what 层后再 setFinalQuestion，
  // 否则 fqState 立即变 available 会导致 DialogBox 卸载 ChatDialog 换成 FinalQuestionDialog，
  // 评估内容和层切换动画都来不及展示
  const pendingFinalQuestion = useRef<string | null>(null);
  // 延迟标记 completed 的层：不能在 processAnswerResponse 中立即 updateNodeDepthState，
  // 否则 isLayerCleared 立即变 true，DialogBox 卸载 ChatDialog，pendingSwitch 丢失
  const pendingCompletedLayer = useRef<string | null>(null);
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
    if (typingId !== null) {
      console.log("[ChatDialog] pendingSwitch useEffect: 等待打字完成", { pendingSwitch, typingId });
      return;
    }
    // 确认所有 mentor 消息都已打完
    const allTyped = messages.every((m) => m.role !== "mentor" || m.typed);
    if (!allTyped) {
      console.log("[ChatDialog] pendingSwitch useEffect: 消息未全部打完", { pendingSwitch, allTyped });
      return;
    }
    console.log("[ChatDialog] pendingSwitch useEffect: 触发 2.5s 延迟切换", { pendingSwitch });

    const timer = setTimeout(() => {
      const target = pendingSwitch;
      setPendingSwitch(null);
      // 先关对话框 + 切地图：onClose 卸载 ChatDialog、switchDepth 触发 DepthTransitionVideo
      // 注意：必须先 onClose 再 updateNodeDepthState，
      // 否则 isLayerCleared=true 会让 DialogBox 卸载 ChatDialog 换成 LayerClearanceDialog，
      // switchDepth 永远不会被调用。
      // 终问设置在 onClose 前完成（isLoopBack 场景需要对话框关闭后新层终问已就绪）
      if (pendingFinalQuestion.current) {
        setFinalQuestion(pendingFinalQuestion.current, "available");
        pendingFinalQuestion.current = null;
      }
      console.log("[ChatDialog] 执行层切换", { target, currentDepth: useWorldStore.getState().currentDepth });
      onClose();
      switchDepth(target as LayerType);
      // 标记当前层 completed：此时 ChatDialog 已卸载，isLayerCleared 变化不再影响 UI
      if (pendingCompletedLayer.current) {
        updateNodeDepthState(node.id, pendingCompletedLayer.current as LayerType, "completed");
        pendingCompletedLayer.current = null;
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, [pendingSwitch, typingId, messages, onClose, switchDepth, setFinalQuestion, updateNodeDepthState, node.id]);

  // 处理 answer 接口响应：抽取为共享逻辑，供 handleSend 与 initSession 补提交复用
  const processAnswerResponse = useCallback((res: AnswerResponse) => {
    console.log("[ChatDialog] processAnswerResponse", {
      can_advance: res.can_advance,
      node_completed: res.node_completed,
      current_layer: res.current_layer,
      current_round: res.current_round,
      has_evaluation: !!res.evaluation,
      eval_can_advance: res.evaluation?.can_advance,
      has_teaching: !!res.teaching_content,
      ui_currentLayer: currentLayer,
      isFinalQuestion,
    });
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
            id: genId(),
            role: "mentor",
            text: `✅ 你已成功回答了最初的问题！${summaryText}这个节点的探索全部完成了。`,
            isLayerTransition: true,
          },
        ];
        if (evalResult) {
          finishMsgs.push({
            id: genId(),
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
      console.log("[ChatDialog] can_advance=true 分支", {
        currentLayer,
        targetLayer,
        isLoopBack,
      });
      const oldLayerLabel = LAYER_LABELS[currentLayer] ?? currentLayer;
      const newLayerLabel = targetLayer
        ? (LAYER_LABELS[targetLayer] ?? targetLayer)
        : oldLayerLabel;
      // 不立即 updateNodeDepthState(currentLayer, "completed")：
      // 否则 DialogBox 的 isLayerCleared 立即变 true，会卸载 ChatDialog 换成 LayerClearanceDialog，
      // 导致 pendingSwitch 丢失、switchDepth 永远不被调用。
      // 改为延迟到 timer 回调中执行（见 pendingSwitch useEffect）。
      pendingCompletedLayer.current = currentLayer;
      if (targetLayer && !isLoopBack) {
        updateNodeDepthState(node.id, targetLayer, "available");
      }
      if (isLoopBack) {
        // 不立即 setFinalQuestion，延迟到对话框关闭后（见 pendingSwitch useEffect）
        pendingFinalQuestion.current = node.id;
      }

      const summaryText = res.layer_summary
        ? `\n\n${res.layer_summary}\n\n`
        : "\n\n";
      const transitionMsg: ChatMessage = {
        id: genId(),
        role: "mentor",
        text: isLoopBack
          ? `✅ ${oldLayerLabel} 已通过${summaryText}你已走完四层探索，回到起点。\n\n👉 关闭对话框后，点击地图上的 NPC，用你自己的话回答最初的问题。`
          : targetLayer
            ? `✅ ${oldLayerLabel} 已通过${summaryText}现在进入 ${newLayerLabel} 层。`
            : `✅ ${oldLayerLabel} 已通过${summaryText}`,
        isLayerTransition: true,
      };

      const nextMsgs: ChatMessage[] = [transitionMsg];
      if (evalResult) {
        nextMsgs.push({
          id: genId(),
          role: "mentor",
          text: `📋 老学者评估：${evalResult.reason}`,
          isEvaluation: true,
        });
      }
      setMessages((prev) => [...prev, ...nextMsgs]);
      // can_advance 后只展示 evaluation，不展示 teaching_content；
      // 新层首轮问题由下次打开对话框时调 enter 接口获取（幂等）
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
              id: genId(),
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
          id: genId(),
          role: "mentor",
          text: "🎉 这个节点的探索已经全部完成了！迷雾散去了一部分——对前一个节点的理解让你看见了相邻的问题。",
        },
      ]);
    } else if (tcContent) {
      const evalMsgs2: ChatMessage[] = evalResult
        ? [
            {
              id: genId(),
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
          id: genId(),
          role: "mentor",
          text: teachingToText(tcContent),
          teaching: tc(tcContent),
        },
      ]);
    } else if (evalResult) {
      setMessages((prev) => [
        ...prev,
        {
          id: genId(),
          role: "mentor",
          text: `📋 老学者评估：${evalResult.reason}`,
          isEvaluation: true,
        },
      ]);
    }
  }, [currentLayer, isFinalQuestion, node.id, updateNodeDepthState, setFinalQuestion]);

  const initSession = useCallback(async () => {
    if (initRef.current) return;
    initRef.current = true;
    setSubmitting(true);
    try {
      // isFinalQuestion 模式：不调后端接口（节点已完成），直接显示原始问题
      if (isFinalQuestion) {
        setMessages([
          {
            id: genId(),
            role: "mentor",
            text: `你已走完了认知、机制、本质、体系四层探索。\n\n现在，带着你收获的一切，回到最初的问题：\n\n【原始问题】\n${node.mysteryQuestion}`,
          },
        ]);
        return;
      }

      // 复用 store 中的 sessionId（整个学习旅程共享），没有才新建
      let sid = useWorldStore.getState().sessionId;
      if (!sid) {
        const sess = await createSession();
        sid = sess.session_id;
        setSessionId(sid);
      }

      // enter 接口幂等：每次进入节点 UI（how/why/system 任意层）都调，
      // 后端根据 Redis 状态自动判断新建首问还是恢复完整对话历史。
      const enterRes = await enterNode(sid, node.id);
      // enter 返回的 current_layer 现在可信（取决于 Redis 进度），用于显示；
      // 但前端层切换仍以 props depth 为准（用户当前所在地图层）
      if (enterRes.current_layer && enterRes.current_layer !== depth) {
        setCurrentLayer(enterRes.current_layer);
      }

      // 渲染聊天历史：
      // - 同节点恢复（dialogue_history 非空）：把完整历史转成 ChatMessage，全部标记 typed（无需打字效果）
      // - 新进入（dialogue_history 为空）：直接渲染 teaching_content（首问，需要打字效果）
      if (enterRes.dialogue_history.length > 0) {
        const historyMsgs: ChatMessage[] = enterRes.dialogue_history.map((m) => ({
          id: genId(),
          role: m.role === "ai" ? "mentor" : "user",
          text: m.content,
          typed: true,
        }));
        setMessages(historyMsgs);
      } else {
        // 新进入：只渲染 teaching_content（首问），保留打字效果
        setMessages([
          {
            id: genId(),
            role: "mentor",
            text: teachingToText(enterRes.teaching_content),
            teaching: enterRes.teaching_content,
          },
        ]);
      }
    } catch {
      setMessages([
        {
          id: genId(),
          role: "mentor",
          text:
            "欢迎来到这一层，让我们一起来推导这个知识点背后的运行机制。\n\n" +
            "【核心问题】\n用你自己的话解释一下，你是怎么理解这个知识点的？",
        },
      ]);
    } finally {
      setSubmitting(false);
    }
  }, [node.id, depth, setSessionId, isFinalQuestion, node.mysteryQuestion]);

  useEffect(() => {
    initSession();
  }, []);

  const handleSend = useCallback(async () => {
    // isFinalQuestion 模式不需要 sessionId（不调后端）
    if (!inputText.trim() || submitting) return;
    if (!isFinalQuestion && !sessionId) return;
    const userText = inputText.trim();
    setInputText("");

    setMessages((prev) => [
      ...prev,
      { id: genId(), role: "user", text: userText },
    ]);

    // isFinalQuestion 模式：不调后端接口，用户回答后直接标记节点完成
    if (isFinalQuestion) {
      setSubmitting(true);
      // 短暂延迟模拟"思考"，让交互更自然
      await new Promise((r) => setTimeout(r, 800));
      setMessages((prev) => [
        ...prev,
        {
          id: genId(),
          role: "mentor",
          text: `✅ 你已用自己的话回答了最初的问题。\n\n经过四层探索，你的回答已经融合了机制理解、本质洞察和体系迁移。这个节点的探索全部完成了。`,
          isLayerTransition: true,
        },
      ]);
      setFinalQuestion(node.id, "completed");
      setNodeCompleted(true);
      setSubmitting(false);
      return;
    }

    setSubmitting(true);

    try {
      const res = await answerNode(sessionId!, node.id, userText);
      console.log("[ChatDialog] answerNode 返回", {
        can_advance: res.can_advance,
        node_completed: res.node_completed,
        current_layer: res.current_layer,
        current_round: res.current_round,
        session_id: res.session_id,
        isFallback: res.session_id === "",
      });
      processAnswerResponse(res);
      // 记录用户回答到思考笔记（how/why/system 层）
      const aiFeedback = res.evaluation?.reason
        ?? res.teaching_content?.content
        ?? res.teaching_content?.core_question
        ?? "";
      recordLayer(node.id, currentLayer as "how" | "why" | "system", userText, aiFeedback);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: genId(),
          role: "mentor",
          text: "听起来学到了不少知识。试着换一个角度再想想看？",
        },
      ]);
    } finally {
      setSubmitting(false);
    }
  }, [inputText, submitting, sessionId, node.id, processAnswerResponse, isFinalQuestion, setFinalQuestion, recordLayer, currentLayer]);

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
