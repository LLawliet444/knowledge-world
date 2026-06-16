import type {
  DiagnosticResponse,
  FeedbackRequest,
  QuestionRequest,
  QuestionResponse,
} from "../types/feedback";

const API_BASE = (import.meta as unknown as { env?: Record<string, string> }).env
  ?.VITE_API_BASE_URL ?? "http://localhost:8000";

const DEFAULT_TIMEOUT_MS = 10_000;

class ApiTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiTimeoutError";
  }
}

async function timedFetch(
  url: string,
  options: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function safeFetchJson<T>(
  url: string,
  body: unknown,
  fallback: () => T,
): Promise<T> {
  try {
    const res = await timedFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as T;
    return data;
  } catch (err) {
    const cause =
      err instanceof Error
        ? err.name === "AbortError"
          ? "timeout"
          : err.message
        : "unknown";
    // eslint-disable-next-line no-console
    console.warn(`[api] ${url} 调用失败 (${cause})，使用本地 fallback 响应。`);
    return fallback();
  }
}

export async function fetchQuestion(req: QuestionRequest): Promise<QuestionResponse> {
  const url = `${API_BASE}/api/v1/nodes/${encodeURIComponent(req.node_id)}/question`;
  return safeFetchJson<QuestionResponse>(url, req, () => ({
    question: buildFallbackQuestion(req.node_name),
  }));
}

export async function fetchFeedback(req: FeedbackRequest): Promise<DiagnosticResponse> {
  const url = `${API_BASE}/api/v1/nodes/${encodeURIComponent(req.node_id)}/feedback`;
  return safeFetchJson<DiagnosticResponse>(url, req, () =>
    buildFallbackFeedback(req.user_answer, req.round),
  );
}

function buildFallbackQuestion(nodeName: string): string {
  const pool = [
    `如果没有【${nodeName}】这一环节，后面的故事还能展开吗？为什么？`,
    `【${nodeName}】的出现，究竟改变了之前的什么结构？`,
    `你能用自己的话解释【${nodeName}】和它相邻节点之间的关系吗？`,
    `如果【${nodeName}】突然被移除，系统中哪个环节最可能先崩溃？`,
  ];
  return pool[Math.floor(Math.random() * pool.length)];
}

function buildFallbackFeedback(
  userAnswer: string,
  round: number,
): DiagnosticResponse {
  const trimmed = userAnswer.trim();
  const isLongEnough = trimmed.length >= 25;
  const hasTransfer =
    /例子|类比|现实生活|就像|比如|例如|举个/.test(trimmed);

  if (hasTransfer) {
    return {
      cognitive_level: "system",
      covered_dimensions: ["concept", "logic", "transfer"],
      main_misconception: "",
      missing_points: [],
      next_best_question:
        "你刚才的回答已经能迁移到其他情境。如果让你再找一个反例，会是哪里？",
      feedback_level: "reinforce",
      feedback_card: {
        understood: [
          "抓住了核心概念",
          "能把书本中的内容迁移到其他情境",
        ],
        missing: [],
        guidance: "保持这种迁移思考：把抽象概念与真实世界对照，往往能发现新问题。",
        next_question:
          "你刚才的回答已经能迁移到其他情境。如果让你再找一个反例，会是哪里？",
      },
      node_state: "transfer",
    };
  }

  if (isLongEnough) {
    return {
      cognitive_level: "how",
      covered_dimensions: ["concept", "logic"],
      main_misconception:
        "回答偏描述性，仍缺少对 '为什么会这样' 的追问。",
      missing_points: [
        "缺少具体的因果论证",
        "没有把这一层与更高层级的系统行为关联起来",
      ],
      next_best_question:
        "你提到了要点，但如果让你追问背后的原因，你会问什么？",
      feedback_level: "hint",
      feedback_card: {
        understood: ["抓到了基本概念", "能复述节点的核心内容"],
        missing: [
          "缺少具体的因果论证",
          "没有与更高层级的系统行为做关联",
        ],
        guidance:
          "试着从 '为什么会是这样，而不是其他样子' 入手，然后追问如果拿掉这一环会怎样。",
        next_question:
          "你提到了要点，但如果让你追问背后的原因，你会问什么？",
      },
      node_state: round >= 2 ? "mastered" : "learning",
    };
  }

  // Short / minimal answer
  return {
    cognitive_level: "what",
    covered_dimensions: ["concept"],
    main_misconception: "回答过短，尚未展开对因果或结构的思考。",
    missing_points: ["缺少具体论证", "没有与其他节点建立关联"],
    next_best_question:
      "你可以先从这个节点最基础的定义入手：它究竟是什么？由哪些部分组成？",
    feedback_level: "minimal_explain",
    feedback_card: {
      understood: ["愿意参与思考"],
      missing: ["回答较短，未能覆盖关键论证"],
      guidance:
        "先别急着给出结论。先用自己的话把这个节点复述一遍，再问问自己：如果它不存在，会发生什么？",
      next_question:
        "你可以先从这个节点最基础的定义入手：它究竟是什么？由哪些部分组成？",
    },
    node_state: "visited",
  };
}
