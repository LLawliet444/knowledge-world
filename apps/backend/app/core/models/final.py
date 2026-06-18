from pydantic import BaseModel, Field


class Coverage(BaseModel):
    concept_accurate: bool
    mechanism_complete: bool
    reason_explained: bool
    transfer_awareness: bool


class FinalQuestionRequest(BaseModel):
    node_id: str
    node_name: str = Field(..., max_length=12)
    mystery_question: str
    source_excerpt: str
    user_answer: str = Field(..., max_length=1000)


class FinalQuestionResponse(BaseModel):
    passed: bool
    coverage: Coverage
    mentor_response: str = Field(..., max_length=80)
