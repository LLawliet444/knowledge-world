import structlog

from app.core.llm.adapter import LLMAdapter
from app.core.llm.prompts import (
    FALLBACK_TEACHING_CONTENT,
    FALLBACK_EVALUATION,
    build_merged_messages,
    build_layer_first_messages,
)
from app.core.models.interact import TeachingContent, Evaluation
from app.core.trace import get_trace_id

logger = structlog.get_logger()

# 各层默认 format，用于 fallback
_LAYER_FORMAT = {
    "how": "guided_question",
    "why": "essence",
    "system": "model",
}

# 各 format 期望的非空字段（用于校验 LLM 输出是否合规）
_EXPECTED_FIELDS = {
    "guided_question": ["opening", "core_question", "thinking_directions"],
    "essence": ["content"],
    "model": ["content"],
}


def _build_teaching_content(
    tc: dict,
    layer: str,
    *,
    trace_id: str,
    session_id: str,
    node_id: str,
) -> TeachingContent:
    """从 LLM 返回的 teaching_content dict 构造 TeachingContent 对象，并校验字段完整性"""
    fmt = tc.get("format") or _LAYER_FORMAT.get(layer, "guided_question")
    result = TeachingContent(
        format=fmt,
        opening=tc.get("opening"),
        core_question=tc.get("core_question"),
        thinking_directions=tc.get("thinking_directions"),
        content=tc.get("content"),
    )

    # 校验 LLM 返回的字段是否符合该 format 的预期
    expected = _EXPECTED_FIELDS.get(fmt, [])
    missing = [f for f in expected if not getattr(result, f)]
    if missing:
        logger.warning(
            "teaching_content_field_missing",
            trace_id=trace_id,
            session_id=session_id,
            node_id=node_id,
            layer=layer,
            format=fmt,
            missing_fields=missing,
            received_keys=list(tc.keys()),
            raw_tc=tc,
        )

    return result


def _fallback_teaching(layer: str) -> TeachingContent:
    """LLM 异常时的兜底教学内容"""
    return TeachingContent(
        format=_LAYER_FORMAT.get(layer, "guided_question"),
        content=FALLBACK_TEACHING_CONTENT,
    )


def _build_evaluation(
    ev: dict | None,
    *,
    can_evaluate: bool,
    trace_id: str,
    session_id: str,
    node_id: str,
    layer: str,
    round_num: int,
) -> Evaluation | None:
    """从 LLM 返回的 evaluation dict 构造 Evaluation 对象，并校验字段完整性

    - can_evaluate=False 时，evaluation 应为 None（prompt 已要求不输出）
    - can_evaluate=True 时，evaluation 必须有 can_advance 字段，缺失则记 warning
    """
    if ev is None:
        if can_evaluate:
            # 本应评估但 LLM 没返回 evaluation
            logger.warning(
                "evaluation_missing_when_required",
                trace_id=trace_id,
                session_id=session_id,
                node_id=node_id,
                layer=layer,
                round=round_num,
                reason="can_evaluate=True but LLM returned no evaluation",
            )
        return None

    if ev.get("can_advance") is None:
        # evaluation 存在但缺少关键字段 can_advance
        logger.warning(
            "evaluation_field_missing",
            trace_id=trace_id,
            session_id=session_id,
            node_id=node_id,
            layer=layer,
            round=round_num,
            missing_fields=["can_advance"],
            received_keys=list(ev.keys()) if isinstance(ev, dict) else None,
            raw_ev=ev,
        )
        return None

    return Evaluation(
        can_advance=ev.get("can_advance", False),
        reason=ev.get("reason", ""),
        summary=ev.get("summary", ""),
    )


class SocraticEngine:
    def __init__(self, llm: LLMAdapter):
        self.llm = llm

    async def generate_first_question(
        self,
        session_id: str,
        node_id: str,
        layer: str,
        scope: dict,
        previous_summary: str,
    ) -> TeachingContent:
        trace_id = get_trace_id()
        logger.info(
            "engine_first_question_start",
            trace_id=trace_id,
            session_id=session_id,
            node_id=node_id,
            layer=layer,
        )
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
            result = _build_teaching_content(
                tc, layer, trace_id=trace_id, session_id=session_id, node_id=node_id
            )
            logger.info(
                "engine_first_question_done",
                trace_id=trace_id,
                session_id=session_id,
                node_id=node_id,
                layer=layer,
                format=result.format,
                content_len=len(result.full_text()),
            )
            return result
        except Exception as e:
            logger.error(
                "engine_first_question_failed",
                trace_id=trace_id,
                session_id=session_id,
                node_id=node_id,
                layer=layer,
                error=str(e),
            )
            return _fallback_teaching(layer)

    async def interact_and_evaluate(
        self,
        session_id: str,
        node_id: str,
        layer: str,
        scope: dict,
        user_input: str,
        round_num: int,
        dialogue_history: list[dict[str, str]],
        previous_summary: str,
        can_evaluate: bool,
    ) -> tuple[TeachingContent, Evaluation | None]:
        trace_id = get_trace_id()
        logger.info(
            "engine_interact_start",
            trace_id=trace_id,
            session_id=session_id,
            node_id=node_id,
            layer=layer,
            round=round_num,
            can_evaluate=can_evaluate,
            input_len=len(user_input),
        )
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
            teaching = _build_teaching_content(
                tc, layer, trace_id=trace_id, session_id=session_id, node_id=node_id
            )

            evaluation = _build_evaluation(
                raw.get("evaluation"),
                can_evaluate=can_evaluate,
                trace_id=trace_id,
                session_id=session_id,
                node_id=node_id,
                layer=layer,
                round_num=round_num,
            )

            logger.info(
                "engine_interact_done",
                trace_id=trace_id,
                session_id=session_id,
                node_id=node_id,
                layer=layer,
                round=round_num,
                has_evaluation=evaluation is not None,
                can_advance=evaluation.can_advance if evaluation else None,
            )
            return teaching, evaluation

        except Exception as e:
            logger.error(
                "engine_interact_failed",
                trace_id=trace_id,
                session_id=session_id,
                node_id=node_id,
                layer=layer,
                error=str(e),
            )
            return _fallback_teaching(layer), None

    async def evaluate_only(
        self,
        session_id: str,
        node_id: str,
        layer: str,
        scope: dict,
        user_input: str,
        round_num: int,
        dialogue_history: list[dict[str, str]],
        previous_summary: str,
    ) -> Evaluation | None:
        _, evaluation = await self.interact_and_evaluate(
            session_id=session_id,
            node_id=node_id,
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
