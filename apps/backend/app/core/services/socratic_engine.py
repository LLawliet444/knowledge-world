import structlog

from app.core.llm.adapter import LLMAdapter
from app.core.llm.prompts import (
    FALLBACK_DIRECTIONS,
    FALLBACK_LEVEL,
    FALLBACK_QUESTION,
    build_interact_messages,
    build_judge_level_message,
    parse_interact_response,
    parse_judge_level_response,
)
from app.core.models.interact import (
    InteractRequest,
    InteractResponse,
    NodeInfo,
    ThinkingDirection,
)

logger = structlog.get_logger()


class SocraticEngine:
    def __init__(self, llm: LLMAdapter):
        self.llm = llm

    async def interact(self, req: InteractRequest) -> InteractResponse:
        messages = build_interact_messages(
            node_name=req.node.node_name,
            concept=req.node.concept,
            examples=req.node.examples,
            misconceptions=req.node.misconceptions,
            learning_goals=req.node.learning_goals,
            user_input=req.user_input,
            level=req.level,
            chat_history=req.chat_history,
        )

        try:
            raw = await self.llm.chat_completion(
                messages=messages,
                temperature=0.7,
                max_tokens=1024,
            )
            parsed = parse_interact_response(raw)
            return InteractResponse(
                question=parsed["question"],
                directions=[
                    ThinkingDirection(**d) for d in parsed["directions"]
                ],
                hint=parsed.get("hint", ""),
            )
        except Exception as e:
            logger.error("socratic_interact_failed", error=str(e))
            return InteractResponse(
                question=FALLBACK_QUESTION,
                directions=[ThinkingDirection(**d) for d in FALLBACK_DIRECTIONS],
                hint="",
            )

    async def judge_level(self, user_input: str) -> int:
        messages = build_judge_level_message(user_input)

        try:
            raw = await self.llm.chat_completion(
                messages=messages,
                temperature=0.3,
                max_tokens=16,
            )
            return parse_judge_level_response(raw)
        except Exception as e:
            logger.error("judge_level_failed", error=str(e))
            return FALLBACK_LEVEL
