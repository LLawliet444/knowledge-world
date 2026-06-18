import structlog

from app.core.llm.adapter import LLMAdapter
from app.core.llm.prompts import (
    FALLBACK_TEACHING_CONTENT,
    FALLBACK_EVALUATION,
    build_merged_messages,
    build_layer_first_messages,
)
from app.core.models.interact import TeachingContent, Evaluation

logger = structlog.get_logger()


class SocraticEngine:
    def __init__(self, llm: LLMAdapter):
        self.llm = llm

    async def generate_first_question(
        self,
        layer: str,
        scope: dict,
        previous_summary: str,
    ) -> TeachingContent:
        messages = build_layer_first_messages(
            layer=layer,
            scope_summary="\n".join(scope.get("scope", [])),
            criteria="\n".join(scope.get("criteria_by_layer", {}).get(layer, [])),
            misconceptions="\n".join(scope.get("misconceptions", [])),
            previous_summary=previous_summary,
        )
        try:
            raw = await self.llm.chat_completion_json(
                messages=messages,
                temperature=0.7,
                max_tokens=1536,
            )
            tc = raw.get("teaching_content", {})
            return TeachingContent(
                format=tc.get("format", "mechanisms"),
                content=tc.get("content", FALLBACK_TEACHING_CONTENT),
            )
        except Exception as e:
            logger.error("first_question_failed", layer=layer, error=str(e))
            return TeachingContent(
                format="mechanisms",
                content=FALLBACK_TEACHING_CONTENT,
            )

    async def interact_and_evaluate(
        self,
        layer: str,
        scope: dict,
        user_input: str,
        round_num: int,
        dialogue_history: list[dict[str, str]],
        previous_summary: str,
        can_evaluate: bool,
    ) -> tuple[TeachingContent, Evaluation | None]:
        messages = build_merged_messages(
            layer=layer,
            scope_summary="\n".join(scope.get("scope", [])),
            criteria="\n".join(scope.get("criteria_by_layer", {}).get(layer, [])),
            misconceptions="\n".join(scope.get("misconceptions", [])),
            previous_summary=previous_summary,
            user_input=user_input,
            round_num=round_num,
            dialogue_history=dialogue_history,
            can_evaluate=can_evaluate,
        )

        try:
            raw = await self.llm.chat_completion_json(
                messages=messages,
                temperature=0.7,
                max_tokens=1536,
            )

            tc = raw.get("teaching_content", {})
            teaching = TeachingContent(
                format=tc.get("format", "mechanisms"),
                content=tc.get("content", FALLBACK_TEACHING_CONTENT),
            )

            ev = raw.get("evaluation")
            if ev is not None and ev.get("can_advance") is not None:
                evaluation = Evaluation(
                    can_advance=ev.get("can_advance", False),
                    reason=ev.get("reason", ""),
                    summary=ev.get("summary", ""),
                )
            else:
                evaluation = None

            return teaching, evaluation

        except Exception as e:
            logger.error("interact_and_evaluate_failed", layer=layer, error=str(e))
            return TeachingContent(
                format="mechanisms",
                content=FALLBACK_TEACHING_CONTENT,
            ), None

    async def evaluate_only(
        self,
        layer: str,
        scope: dict,
        user_input: str,
        round_num: int,
        dialogue_history: list[dict[str, str]],
        previous_summary: str,
    ) -> Evaluation | None:
        _, evaluation = await self.interact_and_evaluate(
            layer=layer,
            scope=scope,
            user_input=user_input,
            round_num=round_num,
            dialogue_history=dialogue_history,
            previous_summary=previous_summary,
            can_evaluate=True,
        )
        if evaluation is None:
            return None
        return evaluation
