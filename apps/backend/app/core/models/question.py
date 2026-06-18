from pydantic import BaseModel, Field


class QuestionRequest(BaseModel):
    node_id: str
    node_name: str = Field(..., max_length=12)
    depth: str
    mystery_question: str
    source_excerpt: str
    mentor_prompts: dict[str, str]


class QuestionResponse(BaseModel):
    question: str
    followups: list[str]
