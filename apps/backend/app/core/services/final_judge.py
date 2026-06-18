import structlog

from app.core.llm.adapter import LLMAdapter
from app.core.llm.prompts import (
    FALLBACK_FINAL_COVERAGE,
    FALLBACK_FINAL_PASSED,
    FALLBACK_FINAL_RESPONSE,
    build_final_question_messages,
)
from app.core.models.final import (
    Coverage,
    FinalQuestionRequest,
    FinalQuestionResponse,
)

logger = structlog.get_logger()


class FinalJudge:
    def __init__(self, llm: LLMAdapter):
        self.llm = llm

    async def judge(self, req: FinalQuestionRequest) -> FinalQuestionResponse:
        messages = build_final_question_messages(req)

        try:
            result = await self.llm.chat_completion_json(
                messages=messages,
                temperature=0.5,
                max_tokens=1024,
            )
            raw_coverage = result.get("coverage", {})
            return FinalQuestionResponse(
                passed=result.get("passed", FALLBACK_FINAL_PASSED),
                coverage=Coverage(
                    concept_accurate=raw_coverage.get("concept_accurate", False),
                    mechanism_complete=raw_coverage.get("mechanism_complete", False),
                    reason_explained=raw_coverage.get("reason_explained", False),
                    transfer_awareness=raw_coverage.get("transfer_awareness", False),
                ),
                mentor_response=(result.get("mentor_response", "") or "")[:80],
            )
        except Exception as e:
            logger.error("final_judge_failed", node_id=req.node_id, error=str(e))
            return FinalQuestionResponse(
                passed=FALLBACK_FINAL_PASSED,
                coverage=Coverage(**FALLBACK_FINAL_COVERAGE),
                mentor_response=FALLBACK_FINAL_RESPONSE[:80],
            )
