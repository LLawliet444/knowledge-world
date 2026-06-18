import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.llm.openai_adapter import OpenAIAdapter
from app.core.models.interact import InteractRequest, InteractResponse
from app.core.services.socratic_engine import SocraticEngine
from app.logging_setup import setup_logging

setup_logging()
logger = structlog.get_logger()

llm = OpenAIAdapter()
socratic_engine = SocraticEngine(llm)

app = FastAPI(
    title="Knowledge World API",
    description="认知探索系统后端 — 苏格拉底式教学引导",
    version="0.2.0",
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
    "/api/v1/nodes/{node_id}/interact",
    response_model=InteractResponse,
    summary="苏格拉底式教学交互",
    description="接收用户的当前回答和节点信息，返回一个核心问题 + 三个思考方向 + 可选提示。",
)
async def interact(node_id: str, req: InteractRequest):
    logger.info("interact_request", node_id=node_id, level=req.level, has_input=bool(req.user_input))
    result = await socratic_engine.interact(req)
    return result


@app.post(
    "/api/v1/nodes/{node_id}/judge-level",
    summary="判断用户当前理解等级",
    description="根据用户回答判断理解等级 (1-4)，供前端更新 level 状态。",
)
async def judge_level(node_id: str, req: dict):
    user_input = req.get("user_input", "")
    if not user_input:
        return {"level": 1}
    level = await socratic_engine.judge_level(user_input)
    logger.info("judge_level_result", node_id=node_id, level=level)
    return {"level": level}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
