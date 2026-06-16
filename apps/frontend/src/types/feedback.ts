import type { LayerType, NodeState } from "./world";

export interface QuestionRequest {
  node_id: string;
  node_name: string;
  layer: LayerType;
  source_excerpt: string;
}

export interface QuestionResponse {
  question: string;
}

export type FeedbackLevel = "reinforce" | "hint" | "minimal_explain";

export interface FeedbackCard {
  understood: string[];
  missing: string[];
  guidance: string;
  next_question: string;
}

export interface FeedbackRequest {
  node_id: string;
  node_name: string;
  source_excerpt: string;
  user_answer: string;
  round: number;
}

export interface DiagnosticResponse {
  cognitive_level: LayerType;
  covered_dimensions: string[];
  main_misconception: string;
  missing_points: string[];
  next_best_question: string;
  feedback_level: FeedbackLevel;
  feedback_card: FeedbackCard;
  node_state: NodeState;
}
