from pydantic import BaseModel, Field, field_validator, model_validator


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
    # retry=true：上一轮 LLM 失败后重试，后端先回滚上一轮状态再重新生成
    retry: bool = False


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
    # 本轮 LLM 调用状态：ok / teaching_failed / eval_failed / all_failed
    # 前端据此展示"生成异常"提示与重试入口，不再静默兜底
    llm_status: str = "ok"


class SessionResponse(BaseModel):
    session_id: str
    secret_token: str


class NodeHistoryEntry(BaseModel):
    """单个历史节点的完成情况"""
    node_id: str
    # 已完成的层（如 ["how","why","system"]）
    completed_layers: list[str] = Field(default_factory=list)
    # 每层的压缩摘要
    layer_summaries: dict[str, str] = Field(default_factory=dict)
    # 每层的完整记录（对话+信号+得分+总结）
    layer_records: dict[str, dict] = Field(default_factory=dict)
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
    # 当前节点的每层完整记录（进行中的层含 signals/score，已完成的层含完整 dialogue）
    layer_records: dict[str, dict] = Field(default_factory=dict)
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


# ─── LLM 输出 Pydantic 模型（JSON Output + 校验） ────────────────
# 这些模型用于校验 LLM 返回的 JSON，校验失败由 adapter 层重试一次。


class TeachingLLMContent(BaseModel):
    """teaching_content 内部结构（带容错：嵌套 teaching_content / feedback+next_question）"""
    format: str = "essence"
    content: str = ""
    opening: str | None = None
    core_question: str | None = None
    thinking_direction: str | None = None

    @model_validator(mode="before")
    @classmethod
    def flatten_nested(cls, data):
        """容错：LLM 偶发返回嵌套 teaching_content 或用 feedback/next_question 替代 content"""
        if not isinstance(data, dict):
            return data
        # 嵌套 teaching_content：{"format":"essence","teaching_content":{"feedback":...,"next_question":...}}
        inner = data.get("teaching_content")
        if isinstance(inner, dict):
            if not data.get("content"):
                parts = []
                if inner.get("feedback"):
                    parts.append(inner["feedback"])
                if inner.get("next_question"):
                    parts.append(inner["next_question"])
                data["content"] = "\n".join(parts) if parts else ""
            if not data.get("format"):
                data["format"] = inner.get("format", "essence")
        # 顶层 feedback + next_question
        if not data.get("content"):
            parts = []
            if data.get("feedback"):
                parts.append(data["feedback"])
            if data.get("next_question"):
                parts.append(data["next_question"])
            data["content"] = "\n".join(parts) if parts else ""
        # format 白名单
        if data.get("format") not in ("essence", "model"):
            data["format"] = "essence"
        return data

    @field_validator("content")
    @classmethod
    def content_must_not_be_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("teaching_content.content 不得为空")
        return v


class TeachingLLMOutput(BaseModel):
    """LLM teaching 调用完整输出（外层包裹 teaching_content key）"""
    teaching_content: TeachingLLMContent


class EvaluationLLMOutput(BaseModel):
    """LLM evaluation 信号输出（4 个 0/1 信号）"""
    abstraction: int = 0
    transfer: int = 0
    example: int = 0
    compression: int = 0

    @field_validator("abstraction", "transfer", "example", "compression")
    @classmethod
    def signal_must_be_binary(cls, v):
        if v not in (0, 1):
            raise ValueError(f"信号值必须为 0 或 1，得到 {v}")
        return v


class AnalysisLLMOutput(BaseModel):
    """LLM 层分析输出"""
    covered_points: list[str] = Field(default_factory=list)
    missed_points: list[str] = Field(default_factory=list)
    detected_misconceptions: list[str] = Field(default_factory=list)
    mastery_level: str
    quality_score: int
    positive_feedback: str = ""
    keywords: list[str] = Field(default_factory=list)

    @field_validator("mastery_level")
    @classmethod
    def mastery_must_be_valid(cls, v):
        if v not in ("mastered", "partial", "unfamiliar"):
            raise ValueError(f"mastery_level 必须为 mastered/partial/unfamiliar，得到 {v}")
        return v

    @field_validator("quality_score")
    @classmethod
    def score_must_be_in_range(cls, v):
        if not (0 <= v <= 100):
            raise ValueError(f"quality_score 必须为 0-100，得到 {v}")
        return v


class FinalAnswerLLMOutput(BaseModel):
    """LLM 终问判断输出"""
    verdict: str
    comment: str

    @field_validator("verdict")
    @classmethod
    def verdict_must_be_valid(cls, v):
        v = str(v).lower().strip()
        if v not in ("correct", "partial", "incorrect"):
            raise ValueError(f"verdict 必须为 correct/partial/incorrect，得到 {v}")
        return v

    @field_validator("comment")
    @classmethod
    def comment_must_not_be_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("comment 不得为空")
        return v
