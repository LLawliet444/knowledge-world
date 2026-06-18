from pydantic import BaseModel, Field


class FeedbackCard(BaseModel):
    understood: list[str]
    missing: list[str]
    guidance: str = Field(..., max_length=120)
    next_question: str


class FeedbackRequest(BaseModel):
    node_id: str
    node_name: str = Field(..., max_length=12)
    depth: str
    source_excerpt: str
    user_answer: str = Field(..., max_length=1000)
    round: int = Field(..., ge=1, le=3)


class FeedbackResponse(BaseModel):
    feedback_card: FeedbackCard
    depth_state: str
    covered_dimensions: list[str]
