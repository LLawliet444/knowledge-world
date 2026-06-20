from pydantic import BaseModel, Field


class TeachingContent(BaseModel):
    format: str
    # how 层（guided_question）字段
    opening: str | None = None
    core_question: str | None = None
    thinking_direction: str | None = None
    # why/system 层字段
    content: str | None = None

    def full_text(self) -> str:
        """返回完整文本，用于对话历史记录与日志"""
        if self.content:
            return self.content
        parts = []
        if self.opening:
            parts.append(self.opening)
        if self.core_question:
            parts.append(self.core_question)
        if self.thinking_direction:
            parts.append("思考方向：" + self.thinking_direction)
        return "\n".join(parts) if parts else ""

    def core_text(self) -> str:
        """返回核心问题文本，用于对话历史滑动窗口（不含 opening，含思考方向）

        - how 层（guided_question）：core_question + thinking_direction
        - why/system 层：保留 content
        """
        if self.content:
            return self.content
        parts = []
        if self.core_question:
            parts.append(self.core_question)
        if self.thinking_direction:
            parts.append("思考方向：" + self.thinking_direction)
        return "\n".join(parts) if parts else (self.opening or "")


class Evaluation(BaseModel):
    can_advance: bool
    reason: str
    summary: str = ""
    # 学习行为信号（LLM 提取，0 或 1）
    abstraction: int = 0
    transfer: int = 0
    example: int = 0
    compression: int = 0
    # 后端加权得分
    score: int = 0


class DialogueMessage(BaseModel):
    """对话历史中的一条消息（用于 enter 接口返回完整历史给前端渲染）"""
    role: str  # "ai" | "user"
    content: str


class EnterNodeResponse(BaseModel):
    current_layer: str
    layer_index: int
    total_layers: int
    teaching_content: TeachingContent
    evaluation: Evaluation | None = None
    # 当前层完整对话历史（同节点恢复时返回，新进入时为空）
    dialogue_history: list[DialogueMessage] = Field(default_factory=list)
    # 被滑动窗口压缩掉的早期对话摘要（当前层内）
    compressed_summary: str = ""


class AnswerRequest(BaseModel):
    user_input: str = Field(..., max_length=1000)


class AnswerResponse(BaseModel):
    session_id: str
    node_id: str
    current_layer: str
    current_round: int
    can_advance: bool
    node_completed: bool
    layer_summary: str = ""
    teaching_content: TeachingContent | None = None
    evaluation: Evaluation | None = None


class SessionResponse(BaseModel):
    session_id: str


class NodeHistoryEntry(BaseModel):
    """单个历史节点的完成情况"""
    node_id: str
    # 已完成的层（如 ["how","why","system"]）
    completed_layers: list[str] = Field(default_factory=list)
    # 每层的压缩摘要
    layer_summaries: dict[str, str] = Field(default_factory=dict)
    # 节点四层是否全部完成
    node_completed: bool = False
    # 原问回响（终问）是否完成（仅 verdict=correct 时为 True）
    final_question_completed: bool = False
    # 终问最近一次评价：correct / partial / incorrect / ""（未作答）
    final_question_verdict: str = ""


class SessionStatusResponse(BaseModel):
    """前端刷新后恢复状态用：当前节点状态 + 最后一次问答 + 历史节点完成情况"""
    session_id: str
    node_id: str | None = None
    current_layer: str | None = None
    current_round: int = 0
    node_completed: bool = False
    last_ai_question: str = ""
    last_user_answer: str = ""
    # 已完成节点的历史归档（含当前节点若已完成）
    node_history: list[NodeHistoryEntry] = Field(default_factory=list)


class FinalAnswerRequest(BaseModel):
    user_input: str = Field(..., max_length=1000)


class FinalAnswerResponse(BaseModel):
    """原问回响：用户回答原始问题后，NPC 给出判断 + 点评"""
    session_id: str
    node_id: str
    # 判断结果：correct / partial / incorrect
    verdict: str
    # NPC 的点评文案
    comment: str
    # 节点是否已完成（无论对错都标记完成，verdict 只影响点评语气）
    node_completed: bool = True
