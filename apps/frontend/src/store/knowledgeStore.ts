/**
 * 思考沉淀与笔记 Store
 *
 * 记录用户在 How / Why / System / 原问回响 四层中的回答和 AI 判定结果，
 * 聚合成节点思考笔记和全书合集。
 *
 * 存储：localStorage（key: knowledge_world_notes）
 * 生命周期：与浏览器 localStorage 一致，清除浏览器数据时消失
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { extractKeywords } from "../utils/keywordExtractor";
import { useWorldStore } from "./worldStore";
import type { LayerAnalysis } from "../types/feedback";
import type { World } from "../types/world";

// ── 类型定义 ──────────────────────────────────────────────────────────────

/** 单层输入记录（用户在 How/Why/System/原问回响 中的每次提交） */
export interface ThinkingLayerRecord {
  /** 用户原文 */
  userInput: string;
  /** AI 当时的反馈原文 */
  aiFeedback: string;
  /** 答到的点（后端未返回结构化数据，暂留空） */
  coveredPoints: string[];
  /** 遗漏的点 */
  missedPoints: string[];
  /** 命中的常见误解 */
  detectedMisconceptions: string[];
  /** 层标识 */
  depthLayer: "how" | "why" | "system" | "final";
  /** 提交时间 ISO */
  submittedAt: string;
  /** 修改次数（同一层多次提交时累加） */
  editCount: number;
  /** 回答字数 */
  inputLength: number;
  /** 基于字数和语气评估的置信度 */
  confidence: "high" | "medium" | "low";
}

/** 节点思考笔记（展示用，只含正面内容） */
export interface NodeThinkingNote {
  /** 选择的卷轴文本 */
  scrollText: string;
  /** How 层回答 */
  howAnswer: string;
  /** Why 层回答 */
  whyAnswer: string;
  /** System 层回答 */
  systemAnswer: string;
  /** 原问回响回答 */
  finalAnswer: string;
  /** 关键词 */
  keywords: string[];
  /** 各层老学者点评（LLM 结构化分析产出，空字符串表示无点评） */
  positiveFeedback: {
    how: string;
    why: string;
    system: string;
    final: string;
  };
}

/** 节点弱点摘要（后台，不展示给用户） */
export interface NodeWeaknessSummary {
  topMissedPoints: string[];
  topMisconceptions: string[];
  weakLayers: string[];
  overallConfidence: "high" | "medium" | "low";
}

/** 节点完整记录 */
export interface NodeRecord {
  nodeId: string;
  nodeName: string;
  /** 选择的卷轴类型 */
  selectedScroll: string;
  /** 四层 + 原问回响的记录 */
  layers: {
    how: ThinkingLayerRecord | null;
    why: ThinkingLayerRecord | null;
    system: ThinkingLayerRecord | null;
    final: ThinkingLayerRecord | null;
  };
  /** 后台弱点分析 */
  weaknessSummary: NodeWeaknessSummary;
  /** 展示用思考笔记 */
  thinkingNote: NodeThinkingNote;
  /** 完成时间 ISO */
  completedAt: string;
}

/** 全书知识画像 */
export interface KnowledgeProfile {
  strengths: { nodeId: string; layer: string; point: string }[];
  weaknesses: { nodeId: string; layer: string; missedPoint: string }[];
  crossNodeMisconceptions: { misconception: string; occurredIn: string[] }[];
}

/** 全书合集 */
export interface BookRecord {
  nodes: NodeRecord[];
  knowledgeProfile: KnowledgeProfile;
  generatedAt: string;
}

// ── Store 定义 ────────────────────────────────────────────────────────────

interface KnowledgeState {
  /** 每层输入记录，key = `${nodeId}_${depthLayer}` */
  layerRecords: Record<string, ThinkingLayerRecord>;
  /** 节点完整记录，key = nodeId */
  nodeRecords: Record<string, NodeRecord>;
  /** 全书合集（全部 7 节点完成后生成） */
  bookRecord: BookRecord | null;
}

interface KnowledgeActions {
  /** 记录一次层输入（用户提交回答时调用） */
  recordLayer: (
    nodeId: string,
    depthLayer: "how" | "why" | "system" | "final",
    userInput: string,
    aiFeedback: string,
  ) => void;

  /** 聚合一个节点的完整记录（终问通过后调用） */
  aggregateNode: (nodeId: string, world: World) => void;

  /** 生成全书合集（全部节点完成后调用） */
  generateBook: (world: World) => void;

  /** 读取节点的思考笔记 */
  getThinkingNote: (nodeId: string) => NodeThinkingNote | null;

  /** 读取全书合集 */
  getBookRecord: () => BookRecord | null;

  /** 读取所有节点记录 */
  getAllNodeRecords: () => Record<string, NodeRecord>;

  /** 检查全部节点是否已完成（终问通过） */
  isBookReady: (world: World) => boolean;

  /** 清空所有记录 */
  clearAll: () => void;
}

/** 根据 userInput 评估置信度 */
function assessConfidence(
  text: string,
  editCount: number,
): "high" | "medium" | "low" {
  if (text.length < 15) return "low";
  const uncertainWords = ["好像", "大概", "可能吧", "也许", "似乎", "应该"];
  const hasUncertain = uncertainWords.some((w) => text.includes(w));
  if (editCount >= 2 || hasUncertain) return "medium";
  return "high";
}

/** LLM qualityScore (0-100) → confidence 映射 */
function mapScoreToConfidence(score: number): "high" | "medium" | "low" {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export const useKnowledgeStore = create<KnowledgeState & KnowledgeActions>()(
  persist(
    (set, get) => ({
      layerRecords: {},
      nodeRecords: {},
      bookRecord: null,

      recordLayer: (nodeId, depthLayer, userInput, aiFeedback) => {
        const key = `${nodeId}_${depthLayer}`;
        const existing = get().layerRecords[key];
        const editCount = existing ? existing.editCount + 1 : 1;

        const record: ThinkingLayerRecord = {
          userInput,
          aiFeedback,
          coveredPoints: [],
          missedPoints: [],
          detectedMisconceptions: [],
          depthLayer,
          submittedAt: new Date().toISOString(),
          editCount,
          inputLength: userInput.length,
          confidence: assessConfidence(userInput, editCount),
        };

        set((state) => ({
          layerRecords: { ...state.layerRecords, [key]: record },
        }));
      },

      aggregateNode: (nodeId, world) => {
        const node = world.nodes.find((n) => n.id === nodeId);
        if (!node) return;

        const { layerRecords, nodeRecords } = get();

        // 读取各层记录（前端 ThinkingLayerRecord）
        const howRec = layerRecords[`${nodeId}_how`] ?? null;
        const whyRec = layerRecords[`${nodeId}_why`] ?? null;
        const systemRec = layerRecords[`${nodeId}_system`] ?? null;
        const finalRec = layerRecords[`${nodeId}_final`] ?? null;

        // 选择的卷轴文本：从 worldStore 读取 readyChoice
        const { nodeProgress } = useWorldStore.getState();
        const readyChoice = nodeProgress[nodeId]?.readyChoice;
        const selectedCard = node.whatCards.find((c) => c.type === readyChoice);
        const scrollText = selectedCard?.text ?? node.whatCards[0]?.text ?? "";

        // 读取后端 layer_records 里的 analysis（LLM 结构化分析结果）
        const backendLayerRecords = nodeProgress[nodeId]?.layerRecords ?? {};
        const howAnalysis = backendLayerRecords.how?.analysis;
        const whyAnalysis = backendLayerRecords.why?.analysis;
        const systemAnalysis = backendLayerRecords.system?.analysis;
        // final 层无后端 layer_records,analysis 留空(终问走 final-answer 接口,不触发 layer analysis)
        const finalAnalysis: LayerAnalysis | undefined = undefined;

        const analysisOk = (a: LayerAnalysis | undefined) => a?.status === "success";

        // 置信度: LLM qualityScore 优先,降级用 assessConfidence
        const howConfidence = analysisOk(howAnalysis)
          ? mapScoreToConfidence(howAnalysis!.quality_score)
          : (howRec?.confidence ?? "low");
        const whyConfidence = analysisOk(whyAnalysis)
          ? mapScoreToConfidence(whyAnalysis!.quality_score)
          : (whyRec?.confidence ?? "low");
        const systemConfidence = analysisOk(systemAnalysis)
          ? mapScoreToConfidence(systemAnalysis!.quality_score)
          : (systemRec?.confidence ?? "low");
        const finalConfidence = finalRec?.confidence ?? "low";

        // 弱点摘要（后台）
        const allRecords: (ThinkingLayerRecord & { confidence: "high" | "medium" | "low" })[] = [
          howRec ? { ...howRec, confidence: howConfidence } : null,
          whyRec ? { ...whyRec, confidence: whyConfidence } : null,
          systemRec ? { ...systemRec, confidence: systemConfidence } : null,
          finalRec ? { ...finalRec, confidence: finalConfidence } : null,
        ].filter(Boolean) as (ThinkingLayerRecord & { confidence: "high" | "medium" | "low" })[];
        const lowConfidenceLayers = allRecords
          .filter((r) => r.confidence === "low")
          .map((r) => r.depthLayer);
        const overallConfidence: "high" | "medium" | "low" =
          lowConfidenceLayers.length >= 2
            ? "low"
            : lowConfidenceLayers.length === 1
              ? "medium"
              : "high";

        // 关键词: LLM ∪ extractKeywords,去重
        const answers = [
          howRec?.userInput ?? "",
          whyRec?.userInput ?? "",
          systemRec?.userInput ?? "",
          finalRec?.userInput ?? "",
        ].filter(Boolean);
        const referenceText = [
          node.sourceExcerpt,
          ...node.whatCards.map((c) => c.text),
          node.mysteryQuestion,
        ].join(" ");
        const llmKeywords = [
          ...(analysisOk(howAnalysis) ? howAnalysis!.keywords : []),
          ...(analysisOk(whyAnalysis) ? whyAnalysis!.keywords : []),
          ...(analysisOk(systemAnalysis) ? systemAnalysis!.keywords : []),
        ];
        const frontendKeywords = extractKeywords(answers, referenceText);
        const keywords = [...new Set([...llmKeywords, ...frontendKeywords])].slice(0, 8);

        // 各层正面评语
        const positiveFeedback = {
          how: analysisOk(howAnalysis) ? howAnalysis!.positive_feedback : "",
          why: analysisOk(whyAnalysis) ? whyAnalysis!.positive_feedback : "",
          system: analysisOk(systemAnalysis) ? systemAnalysis!.positive_feedback : "",
          final: analysisOk(finalAnalysis) ? finalAnalysis!.positive_feedback : "",
        };

        // 弱点摘要: 合并 LLM 的 missed_points 和 detected_misconceptions
        const topMissedPoints = [
          ...(analysisOk(howAnalysis) ? howAnalysis!.missed_points : []),
          ...(analysisOk(whyAnalysis) ? whyAnalysis!.missed_points : []),
          ...(analysisOk(systemAnalysis) ? systemAnalysis!.missed_points : []),
        ];
        const topMisconceptions = [
          ...(analysisOk(howAnalysis) ? howAnalysis!.detected_misconceptions : []),
          ...(analysisOk(whyAnalysis) ? whyAnalysis!.detected_misconceptions : []),
          ...(analysisOk(systemAnalysis) ? systemAnalysis!.detected_misconceptions : []),
        ];

        const nodeRecord: NodeRecord = {
          nodeId,
          nodeName: node.name,
          selectedScroll: readyChoice ?? "definition",
          layers: {
            how: howRec ? { ...howRec, confidence: howConfidence } : null,
            why: whyRec ? { ...whyRec, confidence: whyConfidence } : null,
            system: systemRec ? { ...systemRec, confidence: systemConfidence } : null,
            final: finalRec ? { ...finalRec, confidence: finalConfidence } : null,
          },
          weaknessSummary: {
            topMissedPoints,
            topMisconceptions,
            weakLayers: lowConfidenceLayers,
            overallConfidence,
          },
          thinkingNote: {
            scrollText,
            howAnswer: howRec?.userInput ?? "（未记录）",
            whyAnswer: whyRec?.userInput ?? "（未记录）",
            systemAnswer: systemRec?.userInput ?? "（未记录）",
            finalAnswer: finalRec?.userInput ?? "（未记录）",
            keywords,
            positiveFeedback,
          },
          completedAt: new Date().toISOString(),
        };

        set((state) => ({
          nodeRecords: { ...state.nodeRecords, [nodeId]: nodeRecord },
        }));
      },

      generateBook: (world) => {
        const { nodeRecords } = get();
        const nodes: NodeRecord[] = [];

        for (const node of world.nodes) {
          const rec = nodeRecords[node.id];
          if (rec) nodes.push(rec);
        }

        // 知识画像（后台）
        const strengths: KnowledgeProfile["strengths"] = [];
        const weaknesses: KnowledgeProfile["weaknesses"] = [];
        for (const rec of nodes) {
          for (const [layer, lr] of Object.entries(rec.layers)) {
            if (!lr) continue;
            if (lr.confidence === "high") {
              strengths.push({
                nodeId: rec.nodeId,
                layer,
                point: lr.userInput.slice(0, 30) + "…",
              });
            } else if (lr.confidence === "low") {
              weaknesses.push({
                nodeId: rec.nodeId,
                layer,
                missedPoint: "回答过于简短",
              });
            }
          }
        }

        const bookRecord: BookRecord = {
          nodes,
          knowledgeProfile: {
            strengths,
            weaknesses,
            crossNodeMisconceptions: [],
          },
          generatedAt: new Date().toISOString(),
        };

        set({ bookRecord });
      },

      getThinkingNote: (nodeId) => {
        return get().nodeRecords[nodeId]?.thinkingNote ?? null;
      },

      getBookRecord: () => get().bookRecord,

      getAllNodeRecords: () => get().nodeRecords,

      isBookReady: (world) => {
        const { nodeRecords } = get();
        return world.nodes.every((n) => nodeRecords[n.id]);
      },

      clearAll: () => set({ layerRecords: {}, nodeRecords: {}, bookRecord: null }),
    }),
    {
      name: "knowledge_world_notes",
    },
  ),
);
