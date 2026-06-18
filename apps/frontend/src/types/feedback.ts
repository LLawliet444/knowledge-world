// ── API 响应类型（匹配 api-docs.md v0.3.0）────────────────────────────────

/** 教学内容 */
export interface TeachingContent {
  format: "mechanisms" | "essence" | "model";
  content: string;
}

/** LLM 评估结果 */
export interface Evaluation {
  can_advance: boolean;
  reason: string;
  summary: string;
}

/** 创建会话响应 */
export interface SessionResponse {
  session_id: string;
}

/** 进入节点响应 */
export interface EnterNodeResponse {
  current_layer: "how" | "why" | "system";
  layer_index: number;
  total_layers: number;
  teaching_content: TeachingContent;
  evaluation: null;
}

/** 提交回答响应 */
export interface AnswerResponse {
  session_id: string;
  node_id: string;
  current_layer: "how" | "why" | "system";
  current_round: number;
  can_advance: boolean;
  node_completed: boolean;
  layer_summary: string;
  teaching_content: TeachingContent | null;
  evaluation: Evaluation | null;
}

// ── 反馈卡（What 层 dialogStore 仍用）─────────────────────────────────────

export interface FeedbackCard {
  understood: string[];
  missing: string[];
  guidance: string;
  next_question: string;
}
