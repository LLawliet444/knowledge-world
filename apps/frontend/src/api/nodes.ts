/**
 * 节点问答 API
 * What 层走本地 whatCards；How/Why/System 走后端
 *
 * 后端接口（api-docs.md v0.3.0）：
 *   POST /api/v1/sessions
 *   POST /api/v1/sessions/{session_id}/nodes/{node_id}/enter
 *   POST /api/v1/sessions/{session_id}/nodes/{node_id}/answer
 */

import { apiFetch } from "./client";
import type {
  SessionResponse,
  EnterNodeResponse,
  AnswerResponse,
} from "../types/feedback";

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

// ── Enter 本地 fallback ──────────────────────────────────────────────────

const ENTER_FALLBACK: EnterNodeResponse = {
  current_layer: "how",
  layer_index: 0,
  total_layers: 3,
  teaching_content: {
    format: "mechanisms",
    content:
      "试着从这几个角度思考：\n\n" +
      "1. 回顾一下这个知识点的核心事实\n" +
      "2. 它背后的运行机制是什么？\n" +
      "3. 它和我们已经知道的其他知识有什么联系？\n\n" +
      "【引导问题】\n" +
      "用你自己的话解释一下，你是怎么理解这个知识点的？",
  },
  evaluation: null,
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
    format: "mechanisms",
    content:
      "听起来有几分道理。试着换个角度：\n\n" +
      "【引导问题】\n" +
      "这个机制在不同的场景下会有什么不同的表现？",
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
    8000,
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
    10000,
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
    10000,
  );
}
