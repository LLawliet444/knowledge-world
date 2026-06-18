import uuid
from dataclasses import dataclass, field


LAYER_ORDER = ["how", "why", "system"]
MAX_ROUNDS_BEFORE_EVALUATION = 3
# 滑动窗口：保留最近 N 轮对话（1 轮 = 1 个 AI 问题 + 1 个用户回答）
DIALOGUE_WINDOW_ROUNDS = 3


@dataclass
class SessionState:
    session_id: str
    node_id: str | None = None
    current_layer: str | None = None
    current_round: int = 0
    layer_dialogue: list[dict[str, str]] = field(default_factory=list)
    layer_summaries: dict[str, str] = field(default_factory=dict)
    # 被滑动窗口压缩掉的历史对话摘要（当前层内）
    compressed_summary: str = ""
    node_completed: bool = False

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


def new_session() -> SessionState:
    return SessionState(session_id=f"sess_{uuid.uuid4().hex[:12]}")
