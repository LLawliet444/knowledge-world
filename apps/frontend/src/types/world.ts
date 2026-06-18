// PRD §2.1.4 节点数据模型新增字段
// 对齐 backend-tech-design.md 的世界 JSON 结构

export type LayerType = "what" | "how" | "why" | "system";

/** 单个深度的理解状态流转 */
export type DepthState = "locked" | "available" | "learning" | "completed";

/** 原问回响状态 */
export type FinalQuestionState = "locked" | "available" | "completed";

/** 小场景观看状态 */
export type IntroSceneState = "unseen" | "seen";

/** What 轻量确认选项 */
export type WhatCardChoice = "definition" | "example" | "bridge";

// ── 关卡 NPC ──────────────────────────────────────────────────────────────

export interface GateNpc {
  id: string;
  title: string;          // "讲故事的人" / "老农夫" 等
  avatar: string;         // 美术资源路径，如 "/nodes/npc_storyteller.png"
}

// ── 小场景 ────────────────────────────────────────────────────────────────

export interface IntroScene {
  sceneText: string;      // 场景描述文案
  visualHint: string;    // 对应场景目录名，如 "cave_fire"
  durationSec: number;    // 播放时长（5-8 秒）
  trigger: "first_enter_what";
  state: IntroSceneState;
}

// ── What 翻卡 ─────────────────────────────────────────────────────────────

export interface WhatCard {
  type: "definition" | "example" | "bridge";
  text: string;
}

// ── 老学者引导文案 ────────────────────────────────────────────────────────

export interface DialogueLine {
  speaker: "scholar" | "mentor";
  text: string;
}

export interface WhatScroll {
  type: "definition" | "example" | "bridge";
  title: string;
  content: string;
  mentorVoice: string;
}

export interface MentorPrompts {
  whatIntro: string;
  whatDialogue?: DialogueLine[];
  whatScrolls?: WhatScroll[];
  whatWrapUp?: DialogueLine[];
  how: string;
  why: string;
  system: string;
  finalReturn: string;
}

// ── 原问回响 ──────────────────────────────────────────────────────────────

export interface FinalQuestion {
  source: "mysteryQuestion";
  state: FinalQuestionState;
}

// ── 节点（PRD §2.1.4 完整字段）───────────────────────────────────────────

export interface WorldNode {
  id: string;
  name: string;           // 节点内部名称（如"认知革命"），地图上不直接显示
  icon: string;           // 节点图标（如 "/nodes/node_cave_painting.png"），完成最终回答后显示
  iconNpc: string;        // 节点 NPC 图标（如 "/scenes/cave_fire/gate_npc.png"），最终回答前显示
  mysteryQuestion: string; // 地图上代替节点名显示的一句谜题文案
  gateNpc: GateNpc;       // 关卡 NPC 信息（对话框内继续使用）
  positions: Record<LayerType, { x: number; y: number }>; // 节点在四层地图上各自的像素坐标
  neighbors: string[];    // 相邻节点 ID 列表
  nextDiscoveryId: string | null; // 当前节点完成后优先显露的 1 个相邻节点
  sourceExcerpt: string;  // 原文依据片段
  introScene: IntroScene;  // 首次进入小场景
  whatCards: WhatCard[];  // What 层三张翻卡
  mentorPrompts: MentorPrompts; // 老学者引导文案
  finalQuestion: FinalQuestion; // 原问回响
}

// ── 世界结构 ──────────────────────────────────────────────────────────────

export interface World {
  worldId: string;
  title: string;
  biomeTheme: string;
  startNodeId: string;          // 起始节点 ID
  scholarStartByDepth: Record<LayerType, { x: number; y: number }>; // 学者在四层地图各自的起始坐标
  nodes: WorldNode[];
  layers: LayerType[];          // ["what", "how", "why", "system"]
}
