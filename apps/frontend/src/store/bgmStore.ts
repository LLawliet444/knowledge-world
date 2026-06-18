/**
 * BGM 音乐管理器
 *
 * 管理：各层（what/how/why/system）背景音乐播放、切换、暂停/恢复
 * 单一 HTMLAudioElement，避免多重音频实例并发
 */

import { create } from "zustand";
import type { LayerType } from "../types/world";

const BGM_URLS: Record<LayerType, string> = {
  what: "/audio/knowledge_world_main_loop.mp3",
  how: "/audio/knowledge_world_how_loop.mp3",
  why: "/audio/knowledge_world_why_loop.mp3",
  system: "/audio/knowledge_world_system_loop.mp3",
};

let audio: HTMLAudioElement | null = null;
// 跟踪已注册的首次交互监听器，避免重复注册
let firstInteractRegistered = false;

function getAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio();
    audio.loop = true;
    audio.volume = 0.4;
    audio.preload = "auto";
  }
  return audio;
}

interface BgmState {
  currentLayer: LayerType | null;
  isPlaying: boolean;
  volume: number;
}

interface BgmActions {
  playFor: (depth: LayerType) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setVolume: (v: number) => void;
}

export const useBgmStore = create<BgmState & BgmActions>((set, get) => ({
  currentLayer: null,
  isPlaying: false,
  volume: 0.4,

  playFor: async (depth) => {
    const state = get();
    const a = getAudio();

    if (state.currentLayer === depth && state.isPlaying) return;

    const url = BGM_URLS[depth];

    if (state.isPlaying) {
      a.pause();
    }

    a.src = url;
    a.volume = get().volume;
    a.loop = true;

    try {
      await a.play();
      set({ currentLayer: depth, isPlaying: true });
    } catch (_err) {
      // 自动播放被浏览器阻止：只需注册一次首次交互监听
      if (!firstInteractRegistered) {
        firstInteractRegistered = true;
        const onInteract = () => {
          a.play()
            .then(() => set({ currentLayer: depth, isPlaying: true }))
            .catch(() => {});
        };
        window.addEventListener("pointerdown", onInteract, { once: true });
        window.addEventListener("keydown", onInteract, { once: true });
      }
    }
  },

  pause: () => {
    const a = getAudio();
    a.pause();
    set({ isPlaying: false });
  },

  resume: async () => {
    const a = getAudio();
    if (!a.src) return;
    try {
      await a.play();
      set({ isPlaying: true });
    } catch (_err) {
      // 自动播放被阻止
    }
  },

  stop: () => {
    const a = getAudio();
    a.pause();
    a.currentTime = 0;
    a.src = "";
    set({ currentLayer: null, isPlaying: false });
  },

  setVolume: (v) => {
    const a = getAudio();
    a.volume = v;
    set({ volume: v });
  },
}));
