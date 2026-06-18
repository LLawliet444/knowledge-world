/**
 * 节点问答 API
 * What 层走本地 whatCards；How/Why/System 走后端
 */

import { apiFetch } from "./client";
import type { WorldNode } from "../types/world";
import type { NodeInfo, InteractResponse, JudgeLevelResponse } from "../types/feedback";

// ── 本地 fallback ─────────────────────────────────────────────────────────

const LOCAL_FALLBACK: InteractResponse = {
  question: "用你自己的话解释一下，你是怎么理解这个知识点的？",
  directions: [
    { dimension: "observe", text: "先回顾一下这个知识点描述了什么样的事实或现象。" },
    { dimension: "reason", text: "想想它背后的原因或逻辑是什么。" },
    { dimension: "abstract", text: "如果能把这个知识提炼成一句话，你会怎么说？" },
  ],
  hint: "",
};

// ── 从 WorldNode 构建后端所需的 NodeInfo ──────────────────────────────────

function buildNodeInfo(node: WorldNode): NodeInfo {
  const defCard = node.whatCards.find((c) => c.type === "definition");
  const exampleCard = node.whatCards.find((c) => c.type === "example");
  return {
    node_name: node.name,
    concept: defCard?.text ?? node.mysteryQuestion,
    examples: exampleCard?.text ?? node.sourceExcerpt,
    misconceptions: node.sourceExcerpt,
    learning_goals: node.mysteryQuestion,
  };
}

// ── 构建对话历史文本 ─────────────────────────────────────────────────────

export function buildChatHistory(
  questions: string[],
  answers: string[],
): string {
  const lines: string[] = [];
  const len = Math.max(questions.length, answers.length);
  for (let i = 0; i < len; i++) {
    if (i < questions.length) {
      lines.push(`导师问：${questions[i]}`);
    }
    if (i < answers.length) {
      lines.push(`用户答：${answers[i]}`);
    }
  }
  return lines.join("\n");
}

// ── 公开 API ─────────────────────────────────────────────────────────────

export async function interact(
  node: WorldNode,
  userInput: string,
  level: number,
  chatHistory: string,
): Promise<InteractResponse> {
  return apiFetch<InteractResponse>(
    `/api/v1/nodes/${node.id}/interact`,
    {
      node: buildNodeInfo(node),
      user_input: userInput,
      level,
      chat_history: chatHistory,
    },
    LOCAL_FALLBACK,
    10000,
  );
}

export async function judgeLevel(
  node: WorldNode,
  userInput: string,
): Promise<JudgeLevelResponse> {
  const fallback: JudgeLevelResponse = { level: 2 };
  return apiFetch<JudgeLevelResponse>(
    `/api/v1/nodes/${node.id}/judge-level`,
    { user_input: userInput },
    fallback,
    8000,
  );
}
