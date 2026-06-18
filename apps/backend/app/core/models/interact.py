from pydantic import BaseModel, Field


class NodeInfo(BaseModel):
    node_name: str = Field(..., max_length=12)
    concept: str
    examples: str
    misconceptions: str
    learning_goals: str


class ThinkingDirection(BaseModel):
    dimension: str
    text: str


class InteractRequest(BaseModel):
    node: NodeInfo
    user_input: str = Field(default="", max_length=1000)
    level: int = Field(default=1, ge=1, le=4)
    chat_history: str = ""


class InteractResponse(BaseModel):
    question: str
    directions: list[ThinkingDirection]
    hint: str = ""
