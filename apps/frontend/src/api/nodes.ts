/**
 * 节点问答 API
 * What 层走本地 whatCards；How/Why/System 走后端
 */

import { apiFetch } from "./client";
import type { LayerType } from "../types/world";
import type { QuestionRequest, QuestionResponse, FeedbackRequest, DiagnosticResponse, FeedbackCard } from "../types/feedback";
import type { DepthState } from "../types/world";

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

const LOCAL_FEEDBACK_CARDS: Record<LayerType, DiagnosticResponse> = {
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

/** 后端返回的 feedback 原始结构（与前端 DiagnosticResponse 字段不同） */
interface BackendFeedbackResponse {
  feedback_card: FeedbackCard;
  depth_state: DepthState;
  covered_dimensions: string[];
}

// ── 公开 API ─────────────────────────────────────────────────────────────

export async function getQuestion(req: QuestionRequest): Promise<QuestionResponse> {
  if (req.depth === "what") {
    return { question: "", followups: ["", ""], depth: req.depth };
  }

  const fallback: QuestionResponse = {
    question: LOCAL_QUESTIONS[req.depth],
    followups: LOCAL_FOLLOWUPS[req.depth],
    depth: req.depth,
  };

  // 后端 QuestionRequest.mentor_prompts 只接受 dict[str, str]
  // 剔除前端数据中的数组字段（whatDialogue/whatScrolls/whatWrapUp）
  const prompts = req.mentor_prompts;
  const body = {
    node_id: req.node_id,
    node_name: req.node_name,
    depth: req.depth,
    mystery_question: req.mystery_question,
    source_excerpt: req.source_excerpt,
    mentor_prompts: {
      whatIntro: prompts.whatIntro,
      how: prompts.how,
      why: prompts.why,
      system: prompts.system,
      finalReturn: prompts.finalReturn,
    },
  };

  const raw = await apiFetch<{ question: string; followups: string[] }>(
    `/api/v1/nodes/${req.node_id}/question`,
    body,
    fallback,
    8000,
  );

  return {
    question: raw.question,
    followups: raw.followups as [string, string],
    depth: req.depth,
  };
}

export async function getFeedback(req: FeedbackRequest): Promise<DiagnosticResponse> {
  const fallback = LOCAL_FEEDBACK_CARDS[req.depth];

  // 后端 FeedbackRequest 无 feedback_level 字段
  const body: Record<string, unknown> = {
    node_id: req.node_id,
    node_name: req.node_name,
    depth: req.depth,
    source_excerpt: req.source_excerpt,
    user_answer: req.user_answer,
    round: req.round,
  };

  const raw = await apiFetch<BackendFeedbackResponse | DiagnosticResponse>(
    `/api/v1/nodes/${req.node_id}/feedback`,
    body,
    fallback,
    10000,
  );

  // 后端返回 covered_dimensions，前端需要 node_state
  // 若命中 fallback（后端不可用），raw 已含 node_state
  return {
    feedback_card: raw.feedback_card,
    depth_state: raw.depth_state,
    node_state: "node_state" in raw
      ? (raw as DiagnosticResponse).node_state
      : raw.depth_state === "completed" ? "mastered" : "learning",
  };
}
