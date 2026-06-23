/**
 * 节点问答 API
 * What 层走本地 whatCards；How/Why/System 走后端
 *
 * 后端接口（api-docs.md v0.3.0）：
 *   POST /api/v1/sessions
 *   POST /api/v1/sessions/{session_id}/nodes/{node_id}/enter
 *   POST /api/v1/sessions/{session_id}/nodes/{node_id}/answer
 */

import type {
  AnswerResponse,
  EnterNodeResponse,
  FinalAnswerResponse,
  LayerRecord,
  SessionResponse,
  SessionStatusResponse,
} from "../types/feedback";
import { API_BASE, apiFetch } from "./client";

// ── 节点 ID 映射：前端 ID → 后端 ID ─────────────────────────────────────
//
// 后端使用 n001-n007，前端使用有意义的英文 ID

export const FRONTEND_TO_BACKEND_NODE: Record<string, string> = {
  n_cog_rev: "n001",
  n_agri_rev: "n002",
  n_money: "n003",
  n_imagined_order: "n004",
  n_capitalism: "n005",
  n_empire: "n006",
  n_sci_rev: "n007",
};

function mapNodeId(frontendId: string): string {
  return FRONTEND_TO_BACKEND_NODE[frontendId] ?? frontendId;
}

/** 反向映射：后端 node_id → 前端 node_id */
const BACKEND_TO_FRONTEND_NODE: Record<string, string> = Object.entries(
  FRONTEND_TO_BACKEND_NODE,
).reduce((acc, [fe, be]) => {
  acc[be] = fe;
  return acc;
}, {} as Record<string, string>);

function unmapNodeId(backendId: string): string {
  return BACKEND_TO_FRONTEND_NODE[backendId] ?? backendId;
}

// ── Enter 本地 fallback ──────────────────────────────────────────────────

const ENTER_FALLBACK: EnterNodeResponse = {
  current_layer: "how",
  layer_index: 0,
  total_layers: 3,
  teaching_content: {
    format: "guided_question",
    opening: "欢迎来到这一层，让我们一起来推导这个知识点背后的运行机制。",
    core_question: "用你自己的话解释一下，你是怎么理解这个知识点的？",
    thinking_direction: "回顾一下这个知识点的核心事实，再想想它背后的运行机制。",
    content: null,
  },
  evaluation: null,
  dialogue_history: [],
  compressed_summary: "",
};

const ANSWER_FALLBACK: AnswerResponse = {
  session_id: "",
  node_id: "",
  current_layer: "how",
  current_round: 1,
  can_advance: false,
  node_completed: false,
  layer_summary: "",
  teaching_content: {
    format: "guided_question",
    opening: "听起来有几分道理，我们再深入想想。",
    core_question: "这个机制在不同的场景下会有什么不同的表现？",
    thinking_direction: "换一个场景套用一下这个机制，想想它依赖哪些前提条件。",
    content: null,
  },
  evaluation: null,
};

// ── 公开 API ─────────────────────────────────────────────────────────────

export async function createSession(): Promise<SessionResponse> {
  const fallback: SessionResponse = { session_id: "sess_fallback" };
  return apiFetch<SessionResponse>(
    "/api/v1/sessions",
    {},
    fallback,
    8001,
  );
}

export async function enterNode(
  sessionId: string,
  frontendNodeId: string,
): Promise<EnterNodeResponse> {
  const backendId = mapNodeId(frontendNodeId);
  return apiFetch<EnterNodeResponse>(
    `/api/v1/sessions/${sessionId}/nodes/${backendId}/enter`,
    {},
    ENTER_FALLBACK,
    30000,
  );
}

export async function answerNode(
  sessionId: string,
  frontendNodeId: string,
  userInput: string,
): Promise<AnswerResponse> {
  const backendId = mapNodeId(frontendNodeId);
  return apiFetch<AnswerResponse>(
    `/api/v1/sessions/${sessionId}/nodes/${backendId}/answer`,
    { user_input: userInput },
    ANSWER_FALLBACK,
    30000,
  );
}

// ── 原问回响 ─────────────────────────────────────────────────────────────
// POST /sessions/{id}/nodes/{node_id}/final-answer
// system 层全通后，用户回到 what 层回答 NPC 的原始问题

const FINAL_ANSWER_FALLBACK: FinalAnswerResponse = {
  session_id: "",
  node_id: "",
  verdict: "partial",
  comment: "你的回答我收到了。经过四层探索，你已经有了自己的理解。这个节点的探索完成了。",
  node_completed: true,
};

export async function finalAnswer(
  sessionId: string,
  frontendNodeId: string,
  userInput: string,
): Promise<FinalAnswerResponse> {
  const backendId = mapNodeId(frontendNodeId);
  return apiFetch<FinalAnswerResponse>(
    `/api/v1/sessions/${sessionId}/nodes/${backendId}/final-answer`,
    { user_input: userInput },
    FINAL_ANSWER_FALLBACK,
    30000,
  );
}

// ── 会话状态恢复 ─────────────────────────────────────────────────────────
// GET /sessions/{id}/status：刷新页面后从后端 Redis 恢复会话状态

export interface NodeHistoryItem {
  /** 前端节点 ID（已反向映射） */
  frontendNodeId: string;
  /** 已完成的层（如 ["how","why","system"]） */
  completedLayers: string[];
  /** 每层的压缩摘要 */
  layerSummaries: Record<string, string>;
  /** 每层的完整记录（对话+信号+得分+总结） */
  layerRecords: Record<string, LayerRecord>;
  /** 节点四层是否全部完成 */
  nodeCompleted: boolean;
  /** 原问回响（终问）是否完成（仅 verdict=correct 时为 true） */
  finalQuestionCompleted: boolean;
  /** 终问最近一次评价：correct / partial / incorrect / ""（未作答） */
  finalQuestionVerdict: "correct" | "partial" | "incorrect" | "";
}

export interface SessionStatus {
  /** 前端节点 ID；未进入节点时为 null */
  frontendNodeId: string | null;
  /** 当前层；未进入节点时为 null */
  currentLayer: SessionStatusResponse["current_layer"];
  /** 当前层已回答次数 */
  currentRound: number;
  /** 节点是否全部完成 */
  nodeCompleted: boolean;
  /** 最后一次 AI 问题 */
  lastAiQuestion: string;
  /** 最后一次用户回答 */
  lastUserAnswer: string;
  /** 当前节点的每层完整记录 */
  layerRecords: Record<string, LayerRecord>;
  /** 已完成节点的历史归档（含当前节点若已完成） */
  nodeHistory: NodeHistoryItem[];
}

/**
 * 拉取会话状态。node_id 已反向映射为前端 ID。
 *
 * 返回值语义：
 * - 返回 SessionStatus：会话存在，正常恢复
 * - 返回 null：会话不存在（后端 404），调用方应清空 sessionId
 * - 抛异常：后端暂时不可用（网络错误/超时/500 等），调用方应保留 sessionId 等下次重试
 *
 * 不用 apiFetch（它在任何错误下都返回 fallback），改为直接 fetch 以区分 404 和网络错误。
 */
export async function getSessionStatus(
  sessionId: string,
): Promise<SessionStatus | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8001);
  try {
    const res = await fetch(
      `${API_BASE}/api/v1/sessions/${sessionId}/status`,
      { method: "GET", headers: { "Content-Type": "application/json" }, signal: controller.signal },
    );
    clearTimeout(timer);
    if (res.status === 404) {
      // session 不存在（过期或被清）：返回 null，调用方清空 sessionId
      return null;
    }
    if (!res.ok) {
      // 其他 HTTP 错误（500 等）：抛异常，调用方保留 sessionId
      throw new Error(`HTTP ${res.status}`);
    }
    const resJson = (await res.json()) as SessionStatusResponse;
    return {
      frontendNodeId: resJson.node_id ? unmapNodeId(resJson.node_id) : null,
      currentLayer: resJson.current_layer,
      currentRound: resJson.current_round,
      nodeCompleted: resJson.node_completed,
      lastAiQuestion: resJson.last_ai_question,
      lastUserAnswer: resJson.last_user_answer,
      layerRecords: resJson.layer_records ?? {},
      nodeHistory: (resJson.node_history ?? []).map((h) => ({
        frontendNodeId: unmapNodeId(h.node_id),
        completedLayers: h.completed_layers ?? [],
        layerSummaries: h.layer_summaries ?? {},
        layerRecords: h.layer_records ?? {},
        nodeCompleted: h.node_completed ?? false,
        finalQuestionCompleted: h.final_question_completed ?? false,
        finalQuestionVerdict: (h.final_question_verdict ?? "") as NodeHistoryItem["finalQuestionVerdict"],
      })),
    };
  } catch (err) {
    clearTimeout(timer);
    // 网络错误/超时/abort：抛异常，调用方保留 sessionId 等下次重试
    throw err;
  }
}
