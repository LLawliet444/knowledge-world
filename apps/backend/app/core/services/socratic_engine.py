import asyncio

import structlog

from app.core.llm.adapter import LLMAdapter
from app.core.llm.prompts import (
    FALLBACK_TEACHING_CONTENT,
    build_evaluation_messages,
    build_merged_messages,
    build_layer_first_messages,
    build_teaching_messages,
)
from app.core.models.interact import TeachingContent, Evaluation
from app.core.models.session import MAX_ROUNDS_BEFORE_EVALUATION
from app.core.trace import get_trace_id

logger = structlog.get_logger()

# 各层默认 format，用于 fallback
_LAYER_FORMAT = {
    "how": "essence",
    "why": "essence",
    "system": "model",
}

# 允许的 format 白名单（LLM 输出不在白名单内时回退到该层默认 format）
_VALID_FORMATS = {"essence", "model"}

# 各 format 期望的非空字段（用于校验 LLM 输出是否合规）
_EXPECTED_FIELDS = {
    "essence": ["content"],
    "model": ["content"],
}

# 学习行为信号权重（后端评分用）
_SIGNAL_WEIGHTS = {
    "abstraction": 2,
    "transfer": 3,
    "example": 2,
    "compression": 1,
}
# 推进到下一层的得分阈值：score >= _ADVANCE_THRESHOLD 即通过
# 累加计数机制下，阈值设为 8（约 3-4 轮有效信号可达成）
_ADVANCE_THRESHOLD = 8


def _layer_scope_summary(scope: dict, layer: str) -> str:
    """获取当前层的知识范围

    优先使用 scope_by_layer[layer]（按层划分的精确范围），
    不存在时回退到通用 scope。
    """
    per_layer = scope.get("scope_by_layer", {}).get(layer)
    if per_layer:
        return "\n".join(per_layer)
    return "\n".join(scope.get("scope", []))


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
    # format 白名单校验：LLM 输出非法值时回退到该层默认 format，防止 prompt 注入篡改输出结构
    if fmt not in _VALID_FORMATS:
        logger.warning(
            "teaching_content_invalid_format",
            trace_id=trace_id,
            session_id=session_id,
            node_id=node_id,
            layer=layer,
            raw_format=fmt,
        )
        fmt = _LAYER_FORMAT.get(layer, "guided_question")
    result = TeachingContent(
        format=fmt,
        opening=tc.get("opening"),
        core_question=tc.get("core_question"),
        thinking_direction=tc.get("thinking_direction"),
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


def _clamp_signal(v) -> int:
    """把 LLM 返回的信号值规整为 0 或 1"""
    try:
        return min(1, max(0, int(v)))
    except (TypeError, ValueError):
        return 0


def _build_evaluation(
    raw: dict | None,
    *,
    trace_id: str,
    session_id: str,
    node_id: str,
    layer: str,
    round_num: int,
    accumulated_signals: dict[str, int] | None = None,
) -> Evaluation | None:
    """从 LLM 返回的学习行为信号构造 Evaluation

    LLM 只输出 4 个信号（abstraction/transfer/example/compression，各 0 或 1），
    后端将当前轮信号累加到历史累积（每次出现都计数），
    再加权计算 score 并判定 can_advance：
        score = abstraction*2 + transfer*3 + example*2 + compression*1
        can_advance = score >= _ADVANCE_THRESHOLD(8)
    """
    if raw is None:
        logger.warning(
            "evaluation_missing_when_required",
            trace_id=trace_id,
            session_id=session_id,
            node_id=node_id,
            layer=layer,
            round=round_num,
            reason="LLM returned no evaluation",
        )
        return None

    # LLM 可能返回 {"evaluation": {...}} 或直接 {...}
    signals = raw.get("evaluation", raw) if isinstance(raw, dict) else None
    if not isinstance(signals, dict):
        logger.warning(
            "evaluation_format_invalid",
            trace_id=trace_id,
            session_id=session_id,
            node_id=node_id,
            layer=layer,
            round=round_num,
            raw=raw,
        )
        return None

    # 当前轮信号（LLM 输出，0 或 1）
    cur_a = _clamp_signal(signals.get("abstraction", 0))
    cur_t = _clamp_signal(signals.get("transfer", 0))
    cur_e = _clamp_signal(signals.get("example", 0))
    cur_c = _clamp_signal(signals.get("compression", 0))

    # 累加到历史累积（每次出现都计数，不再取 max）
    prev = accumulated_signals or {}
    a = prev.get("abstraction", 0) + cur_a
    t = prev.get("transfer", 0) + cur_t
    e = prev.get("example", 0) + cur_e
    c = prev.get("compression", 0) + cur_c

    score = (
        a * _SIGNAL_WEIGHTS["abstraction"]
        + t * _SIGNAL_WEIGHTS["transfer"]
        + e * _SIGNAL_WEIGHTS["example"]
        + c * _SIGNAL_WEIGHTS["compression"]
    )
    can_advance = score >= _ADVANCE_THRESHOLD

    reason = (
        f"学习行为信号累积得分 {score}/{_ADVANCE_THRESHOLD}（抽象{a}次 迁移{t}次 举例{e}次 压缩{c}次；"
        f"本轮识别 抽象{cur_a} 迁移{cur_t} 举例{cur_e} 压缩{cur_c}）"
    )
    if can_advance:
        reason += f"\n✅ 已达到 {_ADVANCE_THRESHOLD} 分通关阈值，进入下一层！"
    else:
        gap = _ADVANCE_THRESHOLD - score
        weak_signals = []
        if t < 1:
            weak_signals.append("迁移（把概念应用到其他场景）")
        if e < 1:
            weak_signals.append("举例（给出具体例子）")
        if a < 1:
            weak_signals.append("抽象（提炼一般规律）")
        if c < 1:
            weak_signals.append("压缩（一句话总结）")
        if weak_signals:
            reason += f"\n💡 还差 {gap} 分通关，试着：{('、'.join(weak_signals))}"
        else:
            reason += f"\n💡 还差 {gap} 分通关，继续展现学习行为即可"
    summary = f"本层累积学习行为：抽象{a}次 迁移{t}次 举例{e}次 压缩{c}次，得分{score}/{_ADVANCE_THRESHOLD}"

    logger.info(
        "evaluation_scored",
        trace_id=trace_id,
        session_id=session_id,
        node_id=node_id,
        layer=layer,
        round=round_num,
        current_signals={"abstraction": cur_a, "transfer": cur_t, "example": cur_e, "compression": cur_c},
        accumulated_signals={"abstraction": a, "transfer": t, "example": e, "compression": c},
        score=score,
        can_advance=can_advance,
    )

    return Evaluation(
        can_advance=can_advance,
        reason=reason,
        summary=summary,
        abstraction=a,
        transfer=t,
        example=e,
        compression=c,
        score=score,
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
            scope_summary=_layer_scope_summary(scope, layer),
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
        compressed_summary: str = "",
        accumulated_signals: dict[str, int] | None = None,
    ) -> tuple[TeachingContent, Evaluation | None]:
        """用户回答后：生成教学引导 + 可选评估

        - can_evaluate=False（前2轮）：单调用 build_merged_messages，只生成 teaching
        - can_evaluate=True（第3轮起）：asyncio.gather 并行调用 teaching + evaluation
          - evaluation 只提取学习行为信号（4 个 0/1），后端加权评分判定 can_advance
          - 评估通过 → 丢弃 teaching（main.py 会调 generate_first_question 生成下一层首问）
          - 评估不通过 → 用 teaching 作为当前层追问
        """
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
            mode="parallel" if can_evaluate else "single",
            dialogue_history_len=len(dialogue_history),
            has_compressed_summary=bool(compressed_summary),
        )

        scope_summary = _layer_scope_summary(scope, layer)
        criteria = "\n".join(scope.get("criteria_by_layer", {}).get(layer, []))
        misconceptions = "\n".join(scope.get("misconceptions", []))
        node_name = scope.get("node_name", node_id)

        if not can_evaluate:
            # 非评估轮次：单调用，只生成 teaching
            return await self._interact_single(
                trace_id=trace_id,
                session_id=session_id,
                node_id=node_id,
                layer=layer,
                scope_summary=scope_summary,
                criteria=criteria,
                misconceptions=misconceptions,
                previous_summary=previous_summary,
                user_input=user_input,
                round_num=round_num,
                dialogue_history=dialogue_history,
                compressed_summary=compressed_summary,
                accumulated_signals=accumulated_signals,
            )

        # 评估轮次：并行调用 teaching + evaluation
        return await self._interact_parallel(
            trace_id=trace_id,
            session_id=session_id,
            node_id=node_id,
            layer=layer,
            scope_summary=scope_summary,
            criteria=criteria,
            misconceptions=misconceptions,
            previous_summary=previous_summary,
            user_input=user_input,
            round_num=round_num,
            dialogue_history=dialogue_history,
            compressed_summary=compressed_summary,
            node_name=node_name,
            accumulated_signals=accumulated_signals,
        )

    async def _interact_single(
        self,
        *,
        trace_id: str,
        session_id: str,
        node_id: str,
        layer: str,
        scope_summary: str,
        criteria: str,
        misconceptions: str,
        previous_summary: str,
        user_input: str,
        round_num: int,
        dialogue_history: list[dict[str, str]],
        compressed_summary: str = "",
        accumulated_signals: dict[str, int] | None = None,
    ) -> tuple[TeachingContent, Evaluation | None]:
        """非评估轮次：单调用生成 teaching"""
        messages = build_merged_messages(
            layer=layer,
            scope_summary=scope_summary,
            criteria=criteria,
            misconceptions=misconceptions,
            previous_summary=previous_summary,
            user_input=user_input,
            round_num=round_num,
            dialogue_history=dialogue_history,
            can_evaluate=False,
            compressed_summary=compressed_summary,
            accumulated_signals=accumulated_signals,
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
            logger.info(
                "engine_interact_done",
                trace_id=trace_id,
                session_id=session_id,
                node_id=node_id,
                layer=layer,
                round=round_num,
                mode="single",
                has_evaluation=False,
                can_advance=None,
            )
            return teaching, None
        except Exception as e:
            logger.error(
                "engine_interact_failed",
                trace_id=trace_id,
                session_id=session_id,
                node_id=node_id,
                layer=layer,
                mode="single",
                error=str(e),
            )
            return _fallback_teaching(layer), None

    async def _interact_parallel(
        self,
        *,
        trace_id: str,
        session_id: str,
        node_id: str,
        layer: str,
        scope_summary: str,
        criteria: str,
        misconceptions: str,
        previous_summary: str,
        user_input: str,
        round_num: int,
        dialogue_history: list[dict[str, str]],
        compressed_summary: str = "",
        node_name: str = "",
        accumulated_signals: dict[str, int] | None = None,
    ) -> tuple[TeachingContent, Evaluation | None]:
        """评估轮次：并行调用 teaching + evaluation

        两个调用独立执行，互不依赖：
        - teaching 调用：生成当前层追问（评估不通过时使用）
        - evaluation 调用：提取学习行为信号（4 个 0/1），后端评分判定是否推进
        任一调用失败不影响另一个。
        """
        teaching_messages = build_teaching_messages(
            layer=layer,
            scope_summary=scope_summary,
            criteria=criteria,
            misconceptions=misconceptions,
            previous_summary=previous_summary,
            user_input=user_input,
            round_num=round_num,
            dialogue_history=dialogue_history,
            compressed_summary=compressed_summary,
            accumulated_signals=accumulated_signals,
        )
        # 评估上下文策略：
        # - 第一次评估（round_num == MAX_ROUNDS_BEFORE_EVALUATION，即第3轮）：传完整历史对话
        # - 后续评估：只传当前回答 + 压缩摘要（轻量化）
        if round_num == MAX_ROUNDS_BEFORE_EVALUATION:
            eval_history = dialogue_history
            eval_summary = ""
        else:
            eval_history = None
            eval_summary = compressed_summary
        eval_messages = build_evaluation_messages(
            knowledge_node=node_name,
            user_answer=user_input,
            dialogue_history=eval_history,
            compressed_summary=eval_summary,
        )

        # 并行发起两个 LLM 调用，return_exceptions=True 避免一个失败导致整体失败
        results = await asyncio.gather(
            self.llm.chat_completion_json(
                messages=teaching_messages,
                temperature=0.7,
                max_tokens=1536,
            ),
            self.llm.chat_completion_json(
                messages=eval_messages,
                temperature=0.3,  # 信号提取用低 temperature 保证稳定
                max_tokens=128,   # 输出仅 4 个数字的 JSON，大幅限制 token
            ),
            return_exceptions=True,
        )

        teaching_raw, eval_raw = results

        # 处理 teaching 结果
        if isinstance(teaching_raw, Exception):
            logger.error(
                "teaching_call_failed",
                trace_id=trace_id,
                session_id=session_id,
                node_id=node_id,
                layer=layer,
                round=round_num,
                error=str(teaching_raw),
                error_type=type(teaching_raw).__name__,
            )
            teaching = _fallback_teaching(layer)
        else:
            tc = teaching_raw.get("teaching_content", {})
            teaching = _build_teaching_content(
                tc, layer, trace_id=trace_id, session_id=session_id, node_id=node_id
            )

        # 处理 evaluation 结果：LLM 返回信号，后端评分
        if isinstance(eval_raw, Exception):
            logger.error(
                "evaluation_call_failed",
                trace_id=trace_id,
                session_id=session_id,
                node_id=node_id,
                layer=layer,
                round=round_num,
                error=str(eval_raw),
                error_type=type(eval_raw).__name__,
            )
            evaluation = None
        else:
            evaluation = _build_evaluation(
                eval_raw,
                trace_id=trace_id,
                session_id=session_id,
                node_id=node_id,
                layer=layer,
                round_num=round_num,
                accumulated_signals=accumulated_signals,
            )

        logger.info(
            "engine_interact_done",
            trace_id=trace_id,
            session_id=session_id,
            node_id=node_id,
            layer=layer,
            round=round_num,
            mode="parallel",
            has_evaluation=evaluation is not None,
            can_advance=evaluation.can_advance if evaluation else None,
            score=evaluation.score if evaluation else None,
            teaching_failed=isinstance(teaching_raw, Exception),
            eval_failed=isinstance(eval_raw, Exception),
        )
        return teaching, evaluation
