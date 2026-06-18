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
  | "mentor_intro"  // 老学者→学者引导对话（What 层开场）
  | "reading"    // What 翻卡阅读中
  | "what_confirm" // What 轻量确认（三选一）
  | "question"  // How/Why/System 提问展示
  | "feedback"  // 反馈卡展示
  | "final";    // 原问回响

/** 一句对话：谁说的 + 内容 + 可选的关联卡片类型 */
export interface MentorDialogueLine {
  speaker: "mentor" | "scholar";
  text: string;
  highlightCard?: "definition" | "example" | "bridge";
}

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
  /** 老学者引导对话的逐句脚本 */
  mentorLines: MentorDialogueLine[];
}

interface DialogActions {
  open: (node: WorldNode, depth: LayerType) => void;
  close: () => void;
  setLoading: () => void;
  /** 进入老学者引导对话阶段 */
  setMentorIntro: (lines: MentorDialogueLine[]) => void;
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
  mentorLines: [],

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
      mentorLines: [],
    }),

  close: () =>
    set({
      phase: "closed",
      currentNode: null,
      round: 1,
      question: null,
      followups: null,
      feedback: null,
      mentorLines: [],
    }),

  setLoading: () => set({ phase: "loading" }),
  setMentorIntro: (lines) => set({ phase: "mentor_intro", mentorLines: lines }),
  setReading: () => set({ phase: "reading", mentorLines: [] }),
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
