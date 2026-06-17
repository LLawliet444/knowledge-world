// PRD §4.2.6 高阶问答引擎接口契约

import type { LayerType, DepthState } from "./world";

// ── 提问请求 / 响应 ────────────────────────────────────────────────────────

export interface QuestionRequest {
  node_id: string;
  node_name: string;
  depth: LayerType;
  mystery_question: string;
  source_excerpt: string;
  mentor_prompts: {
    whatIntro: string;
    how: string;
    why: string;
    system: string;
    finalReturn: string;
  };
  round: 1 | 2 | 3;
}

/**
 * What 层：前端直接使用 node.whatCards 渲染，不走此接口。
 * How / Why / System：响应 question + 2 个 followups。
 */
export interface QuestionResponse {
  question: string;
  followups: [string, string];
  depth: LayerType;
}

// ── 反馈请求 / 响应 ────────────────────────────────────────────────────────

export type FeedbackLevel = "reinforce" | "hint" | "minimal_explain";

export interface FeedbackRequest {
  node_id: string;
  node_name: string;
  source_excerpt: string;
  user_answer: string;
  depth: LayerType;
  round: 1 | 2 | 3;
  feedback_level?: FeedbackLevel; // 可选，后端会重新判断
}

export interface FeedbackCard {
  understood: string[];
  missing: string[];
  guidance: string;
  next_question: string;
}

export interface DiagnosticResponse {
  feedback_card: FeedbackCard;
  depth_state: DepthState;
  node_state: "learning" | "mastered" | "transfer";
}
