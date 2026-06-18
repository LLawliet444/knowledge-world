import json
import time

import structlog
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from starlette.types import Message

from app.core.trace import get_trace_id, new_trace_id, set_trace_id

logger = structlog.get_logger()

# 单条日志 body 最大字符数，超过则截断
_MAX_BODY_CHARS = 8000


def _truncate(text: str, limit: int = _MAX_BODY_CHARS) -> str:
    if len(text) <= limit:
        return text
    return text[:limit] + f"...[truncated, total {len(text)} chars]"


def _safe_json_parse(text: str):
    """尝试解析 JSON，失败则返回原始字符串"""
    if not text:
        return None
    try:
        return json.loads(text)
    except (json.JSONDecodeError, ValueError):
        return text


class TraceMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        incoming = request.headers.get("X-Trace-Id")
        if incoming:
            set_trace_id(incoming)
        else:
            new_trace_id()

        trace_id = get_trace_id()
        start_ts = time.perf_counter()

        # 读取并缓存请求 body（POST/PUT/PATCH 才有）
        request_body_text = ""
        if request.method in ("POST", "PUT", "PATCH"):
            body_bytes = await request.body()
            request_body_text = body_bytes.decode("utf-8", errors="replace")

            # 把 body 重新塞回 receive stream，供下游路由再次读取
            async def receive() -> Message:
                return {"type": "http.request", "body": body_bytes, "more_body": False}

            request._receive = receive

        # 记录请求开始（含参数）
        logger.info(
            "request_start",
            trace_id=trace_id,
            method=request.method,
            path=request.url.path,
            query_params=dict(request.query_params) if request.query_params else None,
            client=request.client.host if request.client else "-",
            request_body=_safe_json_parse(request_body_text) if request_body_text else None,
        )

        # 拦截响应 body
        response: Response = await call_next(request)

        # 读取响应 body（StreamingResponse 的 body_iterator）
        response_body_chunks = []
        async for chunk in response.body_iterator:
            response_body_chunks.append(chunk)
        response_body_bytes = b"".join(response_body_chunks)
        response_body_text = response_body_bytes.decode("utf-8", errors="replace")

        # 重新构造可重复读取的 response
        response.body = response_body_bytes
        # 替换 body_iterator 为一次性返回完整 body 的生成器
        async def _replay() -> Message:
            yield response_body_bytes

        response.body_iterator = _replay()

        duration_ms = round((time.perf_counter() - start_ts) * 1000, 2)

        # 记录请求完成（含返回结果）
        logger.info(
            "request_complete",
            trace_id=trace_id,
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=duration_ms,
            client=request.client.host if request.client else "-",
            response_body=_safe_json_parse(response_body_text) if response_body_text else None,
        )

        response.headers["X-Trace-Id"] = trace_id
        return response
