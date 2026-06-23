import os
import time

# 设置进程时区为上海时区（必须在任何 time/logging 使用前执行）
os.environ["TZ"] = "Asia/Shanghai"
time.tzset()

import structlog
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.core.llm.openai_adapter import OpenAIAdapter
from app.core.llm.prompts import build_final_answer_messages
from app.core.models.interact import (
    AnswerRequest,
    AnswerResponse,
    DialogueMessage,
    EnterNodeResponse,
    FinalAnswerRequest,
    FinalAnswerResponse,
    NodeHistoryEntry,
    SessionResponse,
    SessionStatusResponse,
    TeachingContent,
)
from app.core.models.session import LAYER_ORDER
from app.core.services.node_scope_loader import load_node_scope
from app.core.services.session_manager import SessionManager
from app.core.services.socratic_engine import SocraticEngine
from app.core.trace import get_trace_id
from app.core.trace_middleware import TraceMiddleware
from app.logging_setup import setup_logging

setup_logging()
logger = structlog.get_logger()

llm = OpenAIAdapter()
session_manager = SessionManager()
socratic_engine = SocraticEngine(llm)

app = FastAPI(
    title="Knowledge World API",
    description="认知探索系统后端 — 苏格拉底式教学引导 + 状态机管理",
    version="0.3.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(TraceMiddleware)


@app.get("/api/v1/health")
async def health():
    return {"status": "ok"}


@app.post(
    "/api/v1/sessions",
    response_model=SessionResponse,
    summary="创建学习会话",
)
async def create_session():
    state = session_manager.create_session()
    return SessionResponse(session_id=state.session_id)


@app.get(
    "/api/v1/sessions/{session_id}/status",
    response_model=SessionStatusResponse,
    summary="获取会话状态",
    description="前端刷新后调用，恢复当前节点状态和最后一次问答。",
)
async def get_session_status(session_id: str):
    state = session_manager.get_session(session_id)
    if state is None:
        raise HTTPException(404, "Session not found")

    # 构造 node_history：以归档历史为基础
    history_entries: list[NodeHistoryEntry] = [
        NodeHistoryEntry(
            node_id=h.get("node_id", ""),
            completed_layers=h.get("completed_layers", []),
            layer_summaries=h.get("layer_summaries", {}),
            layer_records=h.get("layer_records", {}),
            node_completed=h.get("node_completed", False),
            final_question_completed=h.get("final_question_completed", False),
            final_question_verdict=h.get("final_question_verdict", "") or "",
        )
        for h in state.node_history
    ]

    # 当前节点若已完成但尚未切换（未归档），也纳入 history（去重）
    if state.node_id and state.node_completed:
        if not any(h.node_id == state.node_id for h in history_entries):
            history_entries.append(
                NodeHistoryEntry(
                    node_id=state.node_id,
                    completed_layers=list(state.layer_summaries.keys()),
                    layer_summaries=dict(state.layer_summaries),
                    layer_records=dict(state.layer_records),
                    node_completed=True,
                    final_question_completed=state.final_question_completed,
                    final_question_verdict=state.final_question_verdict,
                )
            )

    return SessionStatusResponse(
        session_id=state.session_id,
        node_id=state.node_id,
        current_layer=state.current_layer,
        current_round=state.current_round,
        node_completed=state.node_completed,
        last_ai_question=state.last_ai_question,
        last_user_answer=state.last_user_answer,
        layer_records=dict(state.layer_records),
        node_history=history_entries,
    )


@app.post(
    "/api/v1/sessions/{session_id}/nodes/{node_id}/enter",
    response_model=EnterNodeResponse,
    summary="进入节点",
    description="前端完成 what 层后调用。后端加载 node scope，初始化状态机，返回 how 层第一轮。",
)
async def enter_node(session_id: str, node_id: str):
    logger.info(
        "request_enter_node",
        trace_id=get_trace_id(),
        session_id=session_id,
        node_id=node_id,
    )

    state = session_manager.get_session(session_id)
    if state is None:
        raise HTTPException(404, "Session not found")

    scope = load_node_scope(node_id)
    if scope is None:
        raise HTTPException(404, f"Node {node_id} not found")

    # 当前节点已完成时，禁止重复进入「同一节点」；
    # 但允许切换到新节点（session_manager.enter_node 会归档当前节点并重置状态机）
    if state.node_completed and state.node_id == node_id:
        raise HTTPException(409, "Node already completed in this session")

    # 判断是「新进入/换节点」还是「同节点恢复」
    same_node_in_progress = (
        state.node_id == node_id
        and state.current_layer is not None
    )

    if same_node_in_progress:
        # 同节点恢复：返回 Redis 中的完整对话历史，前端直接渲染全部历史消息
        layer = state.current_layer
        logger.info(
            "node_resume_from_redis",
            trace_id=get_trace_id(),
            session_id=session_id,
            node_id=node_id,
            current_layer=layer,
            current_round=state.current_round,
            dialogue_len=len(state.layer_dialogue),
        )

        # 判断最后一条消息的 role，决定是否需要补跑 answer 生成 AI 回复
        last_role = state.layer_dialogue[-1].get("role") if state.layer_dialogue else None

        if last_role == "user":
            # 最后一条是用户回答，但 AI 还没回复（answer 接口中断/失败）
            # 用 last_user_answer 补跑 _process_answer 生成 AI 回复
            logger.info(
                "node_resume_replay_answer",
                trace_id=get_trace_id(),
                session_id=session_id,
                node_id=node_id,
                layer=layer,
                replay_input=state.last_user_answer[:80],
            )
            # 回滚：移除最后一条 user 消息 + round-1，让 _process_answer 重新 record_answer
            user_input = state.last_user_answer
            state.layer_dialogue.pop()
            state.current_round -= 1
            state.last_user_answer = ""
            session_manager.save(state)
            # 补跑 answer 流程（会重新 append user + 生成 AI 回复 + 推进状态机）
            await _process_answer(session_id, node_id, user_input)
            # 重新读取补跑后的 state
            state = session_manager.get_session(session_id)
            layer = state.current_layer

        # 从对话历史找最后一条 AI 消息，构造 teaching_content
        last_ai_msg = ""
        for msg in reversed(state.layer_dialogue):
            if msg.get("role") == "ai":
                last_ai_msg = msg.get("content", "")
                break
        if last_ai_msg:
            if layer == "how":
                teaching = TeachingContent(
                    format="guided_question",
                    core_question=last_ai_msg,
                )
            elif layer == "why":
                teaching = TeachingContent(format="essence", content=last_ai_msg)
            else:
                teaching = TeachingContent(format="model", content=last_ai_msg)
        else:
            # 对话历史里没有 AI 消息（异常情况）：生成当前层首问
            teaching = await socratic_engine.generate_first_question(
                session_id=session_id,
                node_id=node_id,
                layer=layer,
                scope=scope,
                previous_summary=state.previous_summary,
            )
            state.layer_dialogue.append(
                {"role": "ai", "content": teaching.core_text()}
            )
            session_manager.save(state)
        # 返回完整对话历史，前端渲染全部
        dialogue_history = [
            DialogueMessage(role=m.get("role", "ai"), content=m.get("content", ""))
            for m in state.layer_dialogue
        ]
        compressed_summary = state.compressed_summary
    else:
        # 新进入或换节点：重置状态机到 how 层，生成 how 首问
        state = session_manager.enter_node(session_id, node_id)
        layer = "how"
        teaching = await socratic_engine.generate_first_question(
            session_id=session_id,
            node_id=node_id,
            layer="how",
            scope=scope,
            previous_summary="",
        )
        state.layer_dialogue.append(
            {"role": "ai", "content": teaching.core_text()}
        )
        session_manager.save(state)
        # 新进入：历史为空，前端直接渲染 teaching_content
        dialogue_history = []
        compressed_summary = ""

    return EnterNodeResponse(
        current_layer=layer,
        layer_index=LAYER_ORDER.index(layer),
        total_layers=len(LAYER_ORDER),
        teaching_content=teaching,
        dialogue_history=dialogue_history,
        compressed_summary=compressed_summary,
    )


async def _process_answer(
    session_id: str,
    node_id: str,
    user_input: str,
) -> AnswerResponse:
    """处理用户回答的核心逻辑：记录回答 → 调 LLM 生成教学+评估 → 推进状态机。

    供 answer 接口和 enter_node 恢复补跑复用。
    """
    scope = load_node_scope(node_id)
    if scope is None:
        raise HTTPException(404, f"Node {node_id} not found")

    state = session_manager.record_answer(session_id, user_input)

    layer = state.current_layer
    round_num = state.current_round
    can_evaluate = state.can_evaluate
    previous_summary = state.previous_summary

    # 滑动窗口：传给 engine 的历史对话排除当前用户回答（user_input 已单独传）
    window = state.dialogue_window()
    dialogue_history = window[:-1] if window else []
    compressed_summary = state.compressed_summary

    teaching, evaluation = await socratic_engine.interact_and_evaluate(
        session_id=session_id,
        node_id=node_id,
        layer=layer,
        scope=scope,
        user_input=user_input,
        round_num=round_num,
        dialogue_history=dialogue_history,
        previous_summary=previous_summary,
        can_evaluate=can_evaluate,
        compressed_summary=compressed_summary,
        accumulated_signals=state.layer_signals,
    )

    # 评估后更新累积信号（取 max，一旦出现过就保留）
    if evaluation is not None:
        state.layer_signals = {
            "abstraction": evaluation.abstraction,
            "transfer": evaluation.transfer,
            "example": evaluation.example,
            "compression": evaluation.compression,
        }
        # 同步更新当前层的 signals/score 到 layer_records（进行中的层也实时记录）
        state.layer_records.setdefault(layer, {})
        state.layer_records[layer]["signals"] = dict(state.layer_signals)
        state.layer_records[layer]["score"] = evaluation.score

    should_advance = evaluation is not None and evaluation.can_advance

    if not should_advance:
        state.layer_dialogue.append(
            {"role": "ai", "content": teaching.core_text()}
        )
        state.compress_old_dialogue()
        state.last_ai_question = teaching.core_text()
        session_manager.save(state)
        logger.info(
            "answer_continue_layer",
            trace_id=get_trace_id(),
            session_id=session_id,
            node_id=node_id,
            layer=layer,
            round=round_num,
            dialogue_items=len(state.layer_dialogue),
            has_compressed_summary=bool(state.compressed_summary),
        )
        return AnswerResponse(
            session_id=session_id,
            node_id=node_id,
            current_layer=layer,
            current_round=round_num,
            can_advance=False,
            node_completed=False,
            teaching_content=teaching,
            evaluation=evaluation,
        )

    # should_advance=True：先保存当前状态（含更新后的 signals/score/layer_records），
    # 否则 advance_layer 内部 _load_session 会读到旧的 layer_signals
    session_manager.save(state)

    layer_summary = evaluation.summary if evaluation else ""
    state = session_manager.advance_layer(session_id, layer_summary)

    if state.node_completed:
        logger.info(
            "answer_node_completed",
            trace_id=get_trace_id(),
            session_id=session_id,
            node_id=node_id,
        )
        return AnswerResponse(
            session_id=session_id,
            node_id=node_id,
            current_layer=layer,
            current_round=round_num,
            can_advance=True,
            node_completed=True,
            layer_summary=layer_summary,
            evaluation=evaluation,
        )

    next_teaching = await socratic_engine.generate_first_question(
        session_id=session_id,
        node_id=node_id,
        layer=state.current_layer,
        scope=scope,
        previous_summary=state.previous_summary,
    )
    state.layer_dialogue.append(
        {"role": "ai", "content": next_teaching.core_text()}
    )
    state.last_ai_question = ""
    state.last_user_answer = ""
    session_manager.save(state)

    logger.info(
        "answer_advanced_layer",
        trace_id=get_trace_id(),
        session_id=session_id,
        node_id=node_id,
        new_layer=state.current_layer,
    )

    return AnswerResponse(
        session_id=session_id,
        node_id=node_id,
        current_layer=state.current_layer,
        current_round=state.current_round,
        can_advance=True,
        node_completed=False,
        layer_summary=layer_summary,
        teaching_content=next_teaching,
        evaluation=evaluation,
    )


@app.post(
    "/api/v1/sessions/{session_id}/nodes/{node_id}/answer",
    response_model=AnswerResponse,
    summary="提交回答并获取引导",
    description="每次用户回答后调用。后端合并教学+评估，自动推进状态机。",
)
async def answer(session_id: str, node_id: str, req: AnswerRequest):
    logger.info(
        "request_answer",
        trace_id=get_trace_id(),
        session_id=session_id,
        node_id=node_id,
        input_len=len(req.user_input),
    )

    state = session_manager.get_session(session_id)
    if state is None:
        raise HTTPException(404, "Session not found")
    if state.node_id != node_id:
        raise HTTPException(400, "Session not in this node")

    return await _process_answer(session_id, node_id, req.user_input)


@app.post(
    "/api/v1/sessions/{session_id}/nodes/{node_id}/final-answer",
    response_model=FinalAnswerResponse,
    summary="原问回响：回答原始问题",
    description="system 层全通后，用户回到 what 层回答 NPC 的原始问题。后端调 LLM 判断+点评，标记节点完成。",
)
async def final_answer(session_id: str, node_id: str, req: FinalAnswerRequest):
    logger.info(
        "request_final_answer",
        trace_id=get_trace_id(),
        session_id=session_id,
        node_id=node_id,
        input_len=len(req.user_input),
    )

    state = session_manager.get_session(session_id)
    if state is None:
        raise HTTPException(404, "Session not found")
    if state.node_id != node_id:
        raise HTTPException(400, "Session not in this node")
    if not state.node_completed:
        raise HTTPException(400, "Node not completed yet, cannot answer final question")

    scope = load_node_scope(node_id)
    if scope is None:
        raise HTTPException(404, f"Node {node_id} not found")

    npc_name = scope.get("npc_name", node_id)
    mystery_question = scope.get("mystery_question", "")

    messages = build_final_answer_messages(
        npc_name=npc_name,
        mystery_question=mystery_question,
        user_answer=req.user_input,
    )

    verdict = "partial"
    comment = ""
    try:
        raw = await llm.chat_completion_json(
            messages=messages,
            temperature=0.5,
            max_tokens=256,
        )
        verdict = str(raw.get("verdict", "partial")).lower()
        if verdict not in ("correct", "partial", "incorrect"):
            verdict = "partial"
        comment = str(raw.get("comment", "")).strip()
        if not comment:
            comment = "你的回答我收到了。经过四层探索，你已经有了自己的理解。"
        logger.info(
            "final_answer_judged",
            trace_id=get_trace_id(),
            session_id=session_id,
            node_id=node_id,
            verdict=verdict,
            comment_len=len(comment),
        )
    except Exception as e:
        logger.error(
            "final_answer_llm_failed",
            trace_id=get_trace_id(),
            session_id=session_id,
            node_id=node_id,
            error=str(e),
        )
        comment = "你的回答我收到了。经过四层探索，你已经有了自己的理解。这个节点的探索完成了。"

    # 记录终问 verdict；不管对错都归档（解锁下一节点），
    # 但 final_question_completed 只有 correct 时才 True（控制前端 nodeClear 绿色通关标记）
    state.final_question_verdict = verdict
    if verdict == "correct":
        state.final_question_completed = True
    session_manager._archive_current_node(state)
    session_manager.save(state)

    return FinalAnswerResponse(
        session_id=session_id,
        node_id=node_id,
        verdict=verdict,
        comment=comment,
        node_completed=True,
    )


if __name__ == "__main__":
    import uvicorn

    # log_config=None：禁用 uvicorn 默认的 dictConfig，避免覆盖 setup_logging() 配置的文件 handler
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True, log_config=None)
