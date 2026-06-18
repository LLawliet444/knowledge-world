// ── NodeInfo（节点信息，后端 API 使用）────────────────────────────────────

export interface NodeInfo {
  node_name: string;
  concept: string;
  examples: string;
  misconceptions: string;
  learning_goals: string;
}

// ── ThinkingDirection（思考方向）──────────────────────────────────────────

export interface ThinkingDirection {
  dimension: "observe" | "reason" | "abstract";
  text: string;
}

// ── Interact 请求 / 响应 ─────────────────────────────────────────────────

export interface InteractResponse {
  question: string;
  directions: ThinkingDirection[];
  hint: string;
}

// ── JudgeLevel 请求 / 响应 ───────────────────────────────────────────────

export interface JudgeLevelResponse {
  level: number;
}

// ── 反馈卡（dialogStore 仍用）─────────────────────────────────────────────

export interface FeedbackCard {
  understood: string[];
  missing: string[];
  guidance: string;
  next_question: string;
}
