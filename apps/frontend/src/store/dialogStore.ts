import { create } from "zustand";
import type { WorldNode, LayerType } from "../types/world";

export type DialogPhase =
  | "closed"
  | "loading"
  | "mentor_intro"
  | "reading"
  | "what_confirm";

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
  mentorLines: MentorDialogueLine[];
}

interface DialogActions {
  open: (node: WorldNode, depth: LayerType) => void;
  close: () => void;
  setMentorIntro: (lines: MentorDialogueLine[]) => void;
  setReading: () => void;
}

export const useDialogStore = create<DialogState & DialogActions>((set) => ({
  phase: "closed",
  currentNode: null,
  depth: "what",
  round: 1,
  mentorLines: [],

  open: (node, depth) =>
    set({
      phase: "loading",
      currentNode: node,
      depth,
      round: 1,
      mentorLines: [],
    }),

  close: () =>
    set({
      phase: "closed",
      currentNode: null,
      round: 1,
      mentorLines: [],
    }),

  setMentorIntro: (lines) => set({ phase: "mentor_intro", mentorLines: lines }),
  setReading: () => set({ phase: "reading", mentorLines: [] }),
}));
