import structlog

from app.core.llm.adapter import LLMAdapter
from app.core.llm.prompts import (
    FALLBACK_FOLLOWUPS,
    FALLBACK_QUESTION,
    build_question_messages,
)
from app.core.models.question import QuestionRequest, QuestionResponse

logger = structlog.get_logger()


class QuestionEngine:
    def __init__(self, llm: LLMAdapter):
        self.llm = llm

    async def generate_question(self, req: QuestionRequest) -> QuestionResponse:
        mentor_prompt = req.mentor_prompts.get(req.depth, "")
        messages = build_question_messages(
            node_name=req.node_name,
            mystery_question=req.mystery_question,
            source_excerpt=req.source_excerpt,
            mentor_prompt=mentor_prompt,
            depth=req.depth,
        )

        try:
            result = await self.llm.chat_completion_json(
                messages=messages,
                temperature=0.7,
                max_tokens=1024,
            )
            return QuestionResponse(
                question=result.get("question", FALLBACK_QUESTION),
                followups=result.get("followups", FALLBACK_FOLLOWUPS),
            )
        except Exception as e:
            logger.error("question_engine_failed", node_id=req.node_id, error=str(e))
            return QuestionResponse(
                question=FALLBACK_QUESTION,
                followups=FALLBACK_FOLLOWUPS,
            )
