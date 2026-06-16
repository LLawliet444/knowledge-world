import React from "react";
import type { DiagnosticResponse } from "../../types/feedback";

interface FeedbackCardProps {
  response: DiagnosticResponse | null;
  loading?: boolean;
}

const stateLabel: Record<NonNullable<DiagnosticResponse["node_state"]>, string> = {
  visited: "首次接触",
  learning: "理解中",
  mastered: "已掌握",
  transfer: "迁移应用",
};

const levelColor: Record<NonNullable<DiagnosticResponse["feedback_level"]>, string> = {
  reinforce: "bg-[#78d98b] text-[#1a1226]",
  hint: "bg-[#f5b642] text-[#1a1226]",
  minimal_explain: "bg-[#8e6cff] text-white",
};

/**
 * The diagnostic "feedback card" — a 4-quadrant panel that explains what the learner
 * got right, what is missing, a hint/minimal explanation, and the next question.
 *
 * Layout:
 *
 *   ┌──────────────┬──────────────┐
 *   │ 已理解       │ 缺失         │
 *   ├──────────────┼──────────────┤
 *   │ 提示 / 讲解  │ 下一问       │
 *   └──────────────┴──────────────┘
 */
export const FeedbackCard: React.FC<FeedbackCardProps> = ({ response, loading }) => {
  if (loading || !response) {
    return (
      <div className="rounded border-4 border-[#1a1226] bg-[#fff8e6] p-4 text-[#1a1226] font-body shadow-[4px_4px_0_0_#1a1226]">
        <div className="font-pixel text-sm mb-2">诊断反馈卡</div>
        <div className="text-sm">正在评估你的回答…</div>
      </div>
    );
  }

  const card = response.feedback_card;

  return (
    <div className="rounded border-4 border-[#1a1226] bg-[#fff8e6] text-[#1a1226] font-body shadow-[4px_4px_0_0_#1a1226] overflow-hidden">
      <header className="flex items-center justify-between border-b-4 border-[#1a1226] bg-[#f5d8a0] px-3 py-2">
        <h3 className="font-pixel text-sm">诊断反馈卡</h3>
        <div className="flex items-center gap-2 text-xs">
          <span
            className={`inline-flex px-2 py-1 font-pixel border-2 border-[#1a1226] ${
              levelColor[response.feedback_level] ?? levelColor.hint
            }`}
          >
            {response.feedback_level === "reinforce"
              ? "正向反馈"
              : response.feedback_level === "minimal_explain"
              ? "最小讲解"
              : "方向性提示"}
          </span>
          <span className="inline-flex px-2 py-1 font-pixel border-2 border-[#1a1226] bg-[#fff8e6]">
            {stateLabel[response.node_state] ?? "理解中"}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2">
        <Quadrant
          title="已理解"
          color="bg-[#dff3e4]"
          items={card.understood.length ? card.understood : ["——"]}
        />
        <Quadrant
          title="还缺一点"
          color="bg-[#fbe6c4]"
          items={card.missing.length ? card.missing : ["——"]}
        />
        <Quadrant
          title="提示"
          color="bg-[#e0d5f3]"
          items={[card.guidance ?? "继续追问自己，把关键概念拆成更小的问题。"]}
        />
        <Quadrant
          title="下一问"
          color="bg-[#fff8e6]"
          items={[card.next_question]}
          accent
        />
      </div>

      {response.main_misconception && (
        <footer className="border-t-4 border-[#1a1226] bg-[#f5d8a0] px-3 py-2 text-sm">
          <span className="font-pixel text-xs mr-2">关键误区</span>
          <span>{response.main_misconception}</span>
        </footer>
      )}
    </div>
  );
};

interface QuadrantProps {
  title: string;
  color: string;
  items: string[];
  accent?: boolean;
}

const Quadrant: React.FC<QuadrantProps> = ({ title, color, items, accent }) => (
  <div
    className={[
      "px-3 py-3 border-b-2 md:border-b-0 md:border-r-2 border-[#1a1226] last:border-r-0 last:border-b-0",
      color,
      accent ? "border-4 border-[#f5b642]" : "",
    ].join(" ")}
  >
    <div className="font-pixel text-xs mb-2 text-[#1a1226]">{title}</div>
    <ul className="list-disc list-inside text-sm space-y-1 leading-relaxed">
      {items.map((item, idx) => (
        <li key={idx}>{item}</li>
      ))}
    </ul>
  </div>
);

export default FeedbackCard;
