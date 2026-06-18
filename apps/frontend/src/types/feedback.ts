// ── API 响应类型（匹配 api-docs.md v0.3.0）────────────────────────────────

/** 教学内容 */
export interface TeachingContent {
  /**
   * 内容格式：
   * - "guided_question" (how 层)：使用 opening / core_question / thinking_directions
   * - "essence"         (why 层)：使用 content
   * - "model"           (system 层)：使用 content
   */
  format: "guided_question" | "essence" | "model";
  /** how 层：开场引导语；why/system 层：null */
  opening: string | null;
  /** how 层：核心问题；why/system 层：null */
  core_question: string | null;
  /** how 层：3 个思考方向；why/system 层：null */
  thinking_directions: string[] | null;
  /** why/system 层：教学内容文本；how 层：null */
  content: string | null;
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

/** 会话状态响应（GET /sessions/{id}/status）—— 刷新页面后从后端恢复 */
export interface SessionStatusResponse {
  session_id: string;
  /** 当前节点 ID（后端 n001-n007）；未进入节点时为 null */
  node_id: string | null;
  /** 当前层；未进入节点时为 null */
  current_layer: "how" | "why" | "system" | null;
  /** 当前层已回答次数 */
  current_round: number;
  /** 节点是否全部完成 */
  node_completed: boolean;
  /** 最后一次 AI 问题（核心问题文本） */
  last_ai_question: string;
  /** 最后一次用户回答（空字符串表示尚未回答） */
  last_user_answer: string;
}

// ── 反馈卡（What 层 dialogStore 仍用）─────────────────────────────────────

export interface FeedbackCard {
  understood: string[];
  missing: string[];
  guidance: string;
  next_question: string;
}
