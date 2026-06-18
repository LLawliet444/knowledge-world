import structlog
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.core.llm.openai_adapter import OpenAIAdapter
from app.core.models.interact import (
    AnswerRequest,
    AnswerResponse,
    EnterNodeResponse,
    Evaluation,
    SessionResponse,
    TeachingContent,
)
from app.core.services.node_scope_loader import load_node_scope
from app.core.services.session_manager import SessionManager
from app.core.services.socratic_engine import SocraticEngine
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


@app.post(
    "/api/v1/sessions/{session_id}/nodes/{node_id}/enter",
    response_model=EnterNodeResponse,
    summary="进入节点",
    description="前端完成 what 层后调用。后端加载 node scope，初始化状态机，返回 how 层第一轮。",
)
async def enter_node(session_id: str, node_id: str):
    state = session_manager.get_session(session_id)
    if state is None:
        raise HTTPException(404, "Session not found")

    scope = load_node_scope(node_id)
    if scope is None:
        raise HTTPException(404, f"Node {node_id} not found")

    if state.node_completed:
        raise HTTPException(409, "Node already completed in this session")

    session_manager.enter_node(session_id, node_id)

    teaching = await socratic_engine.generate_first_question(
        layer="how",
        scope=scope,
        previous_summary="",
    )

    return EnterNodeResponse(
        current_layer="how",
        layer_index=0,
        total_layers=3,
        teaching_content=teaching,
    )


@app.post(
    "/api/v1/sessions/{session_id}/nodes/{node_id}/answer",
    response_model=AnswerResponse,
    summary="提交回答并获取引导",
    description="每次用户回答后调用。后端合并教学+评估，自动推进状态机。",
)
async def answer(session_id: str, node_id: str, req: AnswerRequest):
    state = session_manager.get_session(session_id)
    if state is None:
        raise HTTPException(404, "Session not found")
    if state.node_id != node_id:
        raise HTTPException(400, "Session not in this node")

    scope = load_node_scope(node_id)
    if scope is None:
        raise HTTPException(404, f"Node {node_id} not found")

    session_manager.record_answer(session_id, req.user_input)

    layer = state.current_layer
    round_num = state.current_round
    can_evaluate = state.can_evaluate
    previous_summary = state.previous_summary

    teaching, evaluation = await socratic_engine.interact_and_evaluate(
        layer=layer,
        scope=scope,
        user_input=req.user_input,
        round_num=round_num,
        dialogue_history=state.layer_dialogue[:-1],
        previous_summary=previous_summary,
        can_evaluate=can_evaluate and evaluation is None,
    )

    should_advance = (
        evaluation is not None and evaluation.can_advance
    )

    if not should_advance:
        state.layer_dialogue.append(
            {"role": "ai", "content": teaching.content}
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

    layer_summary = evaluation.summary if evaluation else ""
    session_manager.advance_layer(session_id, layer_summary)

    if state.node_completed:
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
        layer=state.current_layer,
        scope=scope,
        previous_summary=state.previous_summary,
    )
    state.layer_dialogue.append(
        {"role": "ai", "content": next_teaching.content}
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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
