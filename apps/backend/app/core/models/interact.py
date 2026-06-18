from pydantic import BaseModel, Field


class TeachingContent(BaseModel):
    format: str
    # how 层（guided_question）字段
    opening: str | None = None
    core_question: str | None = None
    thinking_directions: list[str] | None = None
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
        if self.thinking_directions:
            parts.append("思考方向：" + "；".join(self.thinking_directions))
        return "\n".join(parts) if parts else ""


class Evaluation(BaseModel):
    can_advance: bool
    reason: str
    summary: str = ""


class EnterNodeResponse(BaseModel):
    current_layer: str
    layer_index: int
    total_layers: int
    teaching_content: TeachingContent
    evaluation: Evaluation | None = None


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
