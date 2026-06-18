from pydantic import BaseModel, Field


class TeachingContent(BaseModel):
    format: str
    content: str


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
