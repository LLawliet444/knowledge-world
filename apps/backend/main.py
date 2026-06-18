import structlog
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core.llm.openai_adapter import OpenAIAdapter
from app.core.models.feedback import FeedbackRequest, FeedbackResponse
from app.core.models.final import FinalQuestionRequest, FinalQuestionResponse
from app.core.models.question import QuestionRequest, QuestionResponse
from app.core.services.feedback_engine import FeedbackEngine
from app.core.services.final_judge import FinalJudge
from app.core.services.question_engine import QuestionEngine
from app.logging_setup import setup_logging

setup_logging()
logger = structlog.get_logger()

llm = OpenAIAdapter()
question_engine = QuestionEngine(llm)
feedback_engine = FeedbackEngine(llm)
final_judge = FinalJudge(llm)

app = FastAPI(
    title="Knowledge World API",
    description="认知探索系统后端 — 苏格拉底式提问 + 诊断反馈 + 原问回响",
    version="0.1.0",
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
    "/api/v1/nodes/{node_id}/question",
    response_model=QuestionResponse,
    summary="生成苏格拉底式提问",
    description="用于 How / Why / System 三个高阶深度。What 层不适用（返回 400）。",
)
async def ask_question(node_id: str, req: QuestionRequest):
    if req.depth == "what":
        raise HTTPException(
            status_code=400,
            detail="What depth does not use this API. What content is rendered from prebuilt JSON data.",
        )
    logger.info("question_request", node_id=node_id, depth=req.depth)

    result = await question_engine.generate_question(req)
    return result


@app.post(
    "/api/v1/nodes/{node_id}/feedback",
    response_model=FeedbackResponse,
    summary="诊断用户回答并输出反馈卡",
    description="用于 How / Why / System 三个高阶深度。输出四段式反馈卡 + 深度完成状态。",
)
async def give_feedback(node_id: str, req: FeedbackRequest):
    logger.info("feedback_request", node_id=node_id, depth=req.depth, round=req.round)

    result = await feedback_engine.generate_feedback(req)
    return result


@app.post(
    "/api/v1/nodes/{node_id}/final-question",
    response_model=FinalQuestionResponse,
    summary="原问回响终问判断",
    description="同一节点四层全部完成后，关卡 NPC 再次提出原始谜题，判断用户回答。",
)
async def final_question(node_id: str, req: FinalQuestionRequest):
    logger.info("final_question_request", node_id=node_id)

    result = await final_judge.judge(req)
    return result


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
