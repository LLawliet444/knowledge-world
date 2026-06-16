import type {
  DiagnosticResponse,
  FeedbackRequest,
  QuestionRequest,
  QuestionResponse,
} from "../types/feedback";
import { fetchFeedback, fetchQuestion } from "./client";

export async function getQuestion(req: QuestionRequest): Promise<QuestionResponse> {
  return fetchQuestion(req);
}

export async function getFeedback(req: FeedbackRequest): Promise<DiagnosticResponse> {
  return fetchFeedback(req);
}
