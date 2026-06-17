/**
 * 对话框 Zustand store
 *
 * 管理：当前打开的节点、对话阶段、轮次、用户回答历史
 */

import { create } from "zustand";
import type { WorldNode, LayerType } from "../types/world";
import type { QuestionResponse, FeedbackCard } from "../types/feedback";

export type DialogPhase =
  | "closed"
  | "loading"
  | "reading"    // What 翻卡阅读中
  | "what_confirm" // What 轻量确认（三选一）
  | "question"  // How/Why/System 提问展示
  | "feedback"  // 反馈卡展示
  | "final";    // 原问回响

interface DialogState {
  phase: DialogPhase;
  currentNode: WorldNode | null;
  depth: LayerType;
  round: number;
  question: string | null;
  followups: [string, string] | null;
  feedback: FeedbackCard | null;
  feedbackLevel: string | null;
  depthState: string | null;
}

interface DialogActions {
  open: (node: WorldNode, depth: LayerType) => void;
  close: () => void;
  setLoading: () => void;
  setReading: () => void;
  setWhatConfirm: () => void;
  setQuestion: (q: QuestionResponse) => void;
  setFeedback: (feedback: FeedbackCard, level: string, depthState: string) => void;
  setFinal: () => void;
  nextRound: () => void;
}

export const useDialogStore = create<DialogState & DialogActions>((set, get) => ({
  phase: "closed",
  currentNode: null,
  depth: "what",
  round: 1,
  question: null,
  followups: null,
  feedback: null,
  feedbackLevel: null,
  depthState: null,

  open: (node, depth) =>
    set({
      phase: "loading",
      currentNode: node,
      depth,
      round: 1,
      question: null,
      followups: null,
      feedback: null,
      feedbackLevel: null,
      depthState: null,
    }),

  close: () =>
    set({
      phase: "closed",
      currentNode: null,
      round: 1,
      question: null,
      followups: null,
      feedback: null,
    }),

  setLoading: () => set({ phase: "loading" }),
  setReading: () => set({ phase: "reading" }),
  setWhatConfirm: () => set({ phase: "what_confirm" }),

  setQuestion: (res) =>
    set({ phase: "question", question: res.question, followups: res.followups }),

  setFeedback: (feedback, level, depthState) =>
    set({ phase: "feedback", feedback, feedbackLevel: level, depthState }),

  setFinal: () => set({ phase: "final" }),

  nextRound: () => {
    const { round } = get();
    if (round < 3) set({ round: round + 1, feedback: null, question: null });
  },
}));
