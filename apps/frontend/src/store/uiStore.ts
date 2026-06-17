/**
 * UI 状态 store
 *
 * 管理：小场景播放状态、迷雾消散动画触发、原问回响提示文案等
 */

import { create } from "zustand";

interface FogReveal {
  nodeId: string;
  revealedNodeId: string;
}

interface UiState {
  /** 是否正在播放小场景 */
  isPlayingScene: boolean;
  activeSceneKey: string | null; // 对应 node.introScene.visualHint

  /** 迷雾消散动画队列 */
  fogRevealQueue: FogReveal[];

  /** 是否显示"首次迷雾散去"提示 */
  showFirstFogHint: boolean;

  /** 小场景播放器关闭回调 */
  sceneCloseCallback: (() => void) | null;
}

interface UiActions {
  playScene: (sceneKey: string, onClose: () => void) => void;
  endScene: () => void;
  enqueueFogReveal: (nodeId: string, revealedNodeId: string) => void;
  dequeueFogReveal: () => FogReveal | undefined;
  dismissFogHint: () => void;
}

export const useUiStore = create<UiState & UiActions>((set, get) => ({
  isPlayingScene: false,
  activeSceneKey: null,
  fogRevealQueue: [],
  showFirstFogHint: false,
  sceneCloseCallback: null,

  playScene: (sceneKey, onClose) =>
    set({ isPlayingScene: true, activeSceneKey: sceneKey, sceneCloseCallback: onClose }),

  endScene: () =>
    set({ isPlayingScene: false, activeSceneKey: null }),

  enqueueFogReveal: (nodeId, revealedNodeId) => {
    const { fogRevealQueue } = get();
    set({ fogRevealQueue: [...fogRevealQueue, { nodeId, revealedNodeId }] });
  },

  dequeueFogReveal: () => {
    const { fogRevealQueue } = get();
    if (fogRevealQueue.length === 0) return undefined;
    const [first, ...rest] = fogRevealQueue;
    set({ fogRevealQueue: rest });
    return first;
  },

  dismissFogHint: () => set({ showFirstFogHint: false }),
}));
