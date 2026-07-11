import secrets
import uuid
from dataclasses import dataclass, field, asdict


LAYER_ORDER = ["how", "why", "system"]
MAX_ROUNDS_BEFORE_EVALUATION = 3
# 滑动窗口：保留最近 N 轮对话（1 轮 = 1 个 AI 问题 + 1 个用户回答）
DIALOGUE_WINDOW_ROUNDS = 10


@dataclass
class SessionState:
    session_id: str
    # 会话鉴权令牌：创建时生成，后续请求需在 X-Session-Token header 携带
    secret_token: str = ""
    node_id: str | None = None
    current_layer: str | None = None
    current_round: int = 0
    layer_dialogue: list[dict[str, str]] = field(default_factory=list)
    layer_summaries: dict[str, str] = field(default_factory=dict)
    # 被滑动窗口压缩掉的历史对话摘要（当前层内）
    compressed_summary: str = ""
    node_completed: bool = False
    # 当前节点的原问回响（终问）是否已完成（仅 verdict=correct 时为 True）
    final_question_completed: bool = False
    # 当前节点终问的最近一次评价：correct / partial / incorrect / ""（未作答）
    final_question_verdict: str = ""
    # 最后一次问答缓存（供前端刷新恢复状态用）
    last_ai_question: str = ""
    last_user_answer: str = ""
    # 当前层累积学习行为信号（累加计数，每次出现都+1）
    # 结构：{"abstraction": N, "transfer": N, "example": N, "compression": N}
    layer_signals: dict[str, int] = field(default_factory=dict)
    # 上一轮 record_answer 前的 layer_signals 快照（用于 LLM 失败后 retry 回滚）
    pre_answer_signals: dict[str, int] = field(default_factory=dict)
    # 每层的完整记录（对话+信号+得分+总结），按层名索引
    # 结构：{"how": {"dialogue": [...], "signals": {...}, "score": N, "summary": "...", "completed": bool}, ...}
    # 当前层进行中时只更新 signals/score；advance_layer 时归档完整 dialogue + compressed_summary
    layer_records: dict[str, dict] = field(default_factory=dict)
    # 已完成节点的历史归档（切换节点时归档）
    # 每个元素结构：
    #   {
    #     "node_id": str,
    #     "completed_layers": list[str],   # ["how","why","system"]
    #     "layer_summaries": dict[str,str],
    #     "node_completed": bool,
    #     "final_question_completed": bool,
    #     "final_question_verdict": str,   # correct/partial/incorrect/""
    #   }
    node_history: list[dict] = field(default_factory=list)

    @property
    def layer_index(self) -> int:
        if self.current_layer is None:
            return 0
        return LAYER_ORDER.index(self.current_layer)

    @property
    def can_evaluate(self) -> bool:
        return self.current_round >= MAX_ROUNDS_BEFORE_EVALUATION

    def next_layer(self) -> str | None:
        idx = self.layer_index + 1
        if idx < len(LAYER_ORDER):
            return LAYER_ORDER[idx]
        return None

    @property
    def previous_summary(self) -> str:
        idx = self.layer_index
        if idx == 0:
            return ""
        prev_layer = LAYER_ORDER[idx - 1]
        return self.layer_summaries.get(prev_layer, "")

    def dialogue_window(self) -> list[dict[str, str]]:
        """返回滑动窗口内的最近 N 轮对话

        layer_dialogue 结构：[ai, user, ai, user, ...]（首条是 enter_node 时的 AI 问题）
        1 轮 = 1 个 ai + 1 个 user
        保留最近 DIALOGUE_WINDOW_ROUNDS 轮，更早的由 compress_old_dialogue() 压缩
        """
        max_items = DIALOGUE_WINDOW_ROUNDS * 2
        if len(self.layer_dialogue) <= max_items:
            return list(self.layer_dialogue)
        return list(self.layer_dialogue[-max_items:])

    def compress_old_dialogue(self) -> None:
        """当对话超过滑动窗口时，把最老的一轮压缩进 compressed_summary

        应在每次新增 AI 回复后调用。每次只压缩 1 轮（2 条消息），
        避免一次压缩太多导致信息丢失。
        """
        max_items = DIALOGUE_WINDOW_ROUNDS * 2
        while len(self.layer_dialogue) > max_items:
            # 取最老的一轮（ai + user）
            old_ai = self.layer_dialogue.pop(0)
            old_user = self.layer_dialogue.pop(0)
            ai_text = old_ai.get("content", "")
            user_text = old_user.get("content", "")
            entry = f"AI曾问：{ai_text[:80]}；用户曾答：{user_text[:80]}"
            if self.compressed_summary:
                self.compressed_summary = self.compressed_summary + " | " + entry
            else:
                self.compressed_summary = entry

    def to_dict(self) -> dict:
        """序列化为可存入 Redis 的 dict（JSON 兼容）"""
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "SessionState":
        """从 Redis 反序列化"""
        return cls(
            session_id=data["session_id"],
            secret_token=data.get("secret_token", ""),
            node_id=data.get("node_id"),
            current_layer=data.get("current_layer"),
            current_round=data.get("current_round", 0),
            layer_dialogue=data.get("layer_dialogue", []) or [],
            layer_summaries=data.get("layer_summaries", {}) or {},
            compressed_summary=data.get("compressed_summary", "") or "",
            node_completed=data.get("node_completed", False),
            final_question_completed=data.get("final_question_completed", False),
            final_question_verdict=data.get("final_question_verdict", "") or "",
            last_ai_question=data.get("last_ai_question", "") or "",
            last_user_answer=data.get("last_user_answer", "") or "",
            layer_signals=data.get("layer_signals", {}) or {},
            pre_answer_signals=data.get("pre_answer_signals", {}) or {},
            layer_records=data.get("layer_records", {}) or {},
            node_history=data.get("node_history", []) or [],
        )


def new_session() -> SessionState:
    return SessionState(
        session_id=f"sess_{uuid.uuid4().hex}",
        secret_token=secrets.token_hex(32),  # 64 字符随机令牌
    )
