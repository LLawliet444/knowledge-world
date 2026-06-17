/**
 * 节点问答 API
 * What 层走本地 whatCards；How/Why/System 走后端
 */

import { apiFetch } from "./client";
import type { WorldNode, LayerType } from "../types/world";
import type { QuestionRequest, QuestionResponse, FeedbackRequest, DiagnosticResponse } from "../types/feedback";

// ── 本地 fallback ─────────────────────────────────────────────────────────

const LOCAL_QUESTIONS: Record<LayerType, string> = {
  what: "",
  how: "这个知识点背后的机制是什么？请用自己的话描述它的运作方式。",
  why: "这个结论成立的前提条件是什么？有没有反例或例外情况？",
  system: "这个知识点和其他知识有什么关系？能不能举一个现实中的例子？",
};

const LOCAL_FOLLOWUPS: Record<LayerType, [string, string]> = {
  what: ["", ""],
  how: [
    "如果不是这样运作，会发生什么？",
    "这个机制的第一步是什么？",
  ],
  why: [
    "如果去掉其中一个原因，结论还成立吗？",
    "有没有其他理论解释同样的现象？",
  ],
  system: [
    "在你自己的领域，有类似的现象吗？",
    "这个知识能不能用来预测一个新现象？",
  ],
};

const LOCAL_FEEDBACK_CARDS: Record<LayerType, Partial<DiagnosticResponse>> = {
  what: {
    feedback_card: {
      understood: [],
      missing: [],
      guidance: "",
      next_question: "",
    },
    depth_state: "completed",
    node_state: "learning",
  },
  how: {
    feedback_card: {
      understood: ["你提到了机制的基本流程"],
      missing: ["可以更具体地描述每一步的因果关系"],
      guidance:
        "机制的描述需要具体到每一步的因果链。试着回答：第一步→第二步→第三步。",
      next_question: "如果不是这样运作，会发生什么？",
    },
    depth_state: "learning",
    node_state: "learning",
  },
  why: {
    feedback_card: {
      understood: ["你提到了可能的原因"],
      missing: ["反例和边界条件似乎没有被考虑"],
      guidance:
        "因果解释需要检验边界条件。试着问自己：什么时候这个结论不成立？",
      next_question: "有没有其他理论解释同样的现象？",
    },
    depth_state: "learning",
    node_state: "learning",
  },
  system: {
    feedback_card: {
      understood: ["你尝试了跨领域的思考"],
      missing: ["跨节点迁移的逻辑链似乎还可以加强"],
      guidance:
        "迁移应用需要把 A 领域的逻辑完整翻译到 B 领域，不能只靠类比。",
      next_question: "在你自己的领域，这个知识还能解释什么新现象？",
    },
    depth_state: "learning",
    node_state: "learning",
  },
};

// ── 公开 API ─────────────────────────────────────────────────────────────

export async function getQuestion(req: QuestionRequest): Promise<QuestionResponse> {
  if (req.depth === "what") {
    // What 层前端直接用 node.whatCards，不走接口
    return { question: "", followups: ["", ""], depth: req.depth };
  }

  const fallback: QuestionResponse = {
    question: LOCAL_QUESTIONS[req.depth],
    followups: LOCAL_FOLLOWUPS[req.depth],
    depth: req.depth,
  };

  return apiFetch<QuestionResponse>(
    "/api/v1/nodes/question",
    req,
    fallback,
    8000,
  );
}

export async function getFeedback(req: FeedbackRequest): Promise<DiagnosticResponse> {
  const fallback = LOCAL_FEEDBACK_CARDS[req.depth] as DiagnosticResponse;
  return apiFetch<DiagnosticResponse>(
    "/api/v1/nodes/feedback",
    req,
    fallback,
    10000,
  );
}
