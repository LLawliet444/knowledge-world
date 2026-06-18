import structlog

from app.core.llm.adapter import LLMAdapter
from app.core.llm.prompts import (
    FALLBACK_COVERED_DIMENSIONS,
    FALLBACK_DEPTH_STATE,
    FALLBACK_FEEDBACK_CARD,
    build_feedback_messages,
)
from app.core.models.feedback import FeedbackCard, FeedbackRequest, FeedbackResponse

logger = structlog.get_logger()


class FeedbackEngine:
    def __init__(self, llm: LLMAdapter):
        self.llm = llm

    async def generate_feedback(self, req: FeedbackRequest) -> FeedbackResponse:
        messages = build_feedback_messages(req)

        try:
            result = await self.llm.chat_completion_json(
                messages=messages,
                temperature=0.7,
                max_tokens=2048,
            )
            raw_card = result.get("feedback_card", {})
            return FeedbackResponse(
                feedback_card=FeedbackCard(
                    understood=raw_card.get("understood", []),
                    missing=raw_card.get("missing", []),
                    guidance=raw_card.get("guidance", "")[:120],
                    next_question=raw_card.get("next_question", ""),
                ),
                depth_state=result.get("depth_state", FALLBACK_DEPTH_STATE),
                covered_dimensions=result.get(
                    "covered_dimensions", FALLBACK_COVERED_DIMENSIONS
                ),
            )
        except Exception as e:
            logger.error("feedback_engine_failed", node_id=req.node_id, error=str(e))
            return FeedbackResponse(
                feedback_card=FeedbackCard(
                    understood=FALLBACK_FEEDBACK_CARD["understood"],
                    missing=FALLBACK_FEEDBACK_CARD["missing"],
                    guidance=FALLBACK_FEEDBACK_CARD["guidance"][:120],
                    next_question=FALLBACK_FEEDBACK_CARD["next_question"],
                ),
                depth_state=FALLBACK_DEPTH_STATE,
                covered_dimensions=FALLBACK_COVERED_DIMENSIONS,
            )
