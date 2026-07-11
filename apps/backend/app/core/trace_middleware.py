import time

import structlog
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.trace import get_trace_id, new_trace_id, set_trace_id

logger = structlog.get_logger()


class TraceMiddleware:
    """纯 ASGI 中间件：注入 trace_id + 记录请求/响应日志

    不继承 BaseHTTPMiddleware，因为后者在 call_next 内部会创建新 task，
    导致 ContextVar 的 set 无法传播到路由协程，trace_id 丢失。
    纯 ASGI 中间件在同一 task 内执行，ContextVar 正常工作。
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        # 1. 注入 trace_id（从 header 透传或新建）
        headers = dict(
            (k.decode("latin1").lower(), v.decode("latin1"))
            for k, v in scope.get("headers", [])
        )
        incoming = headers.get("x-trace-id")
        if incoming:
            set_trace_id(incoming)
        else:
            new_trace_id()

        trace_id = get_trace_id()
        start_ts = time.perf_counter()

        # 2. 缓存请求 body（POST/PUT/PATCH）
        request_body_bytes = b""
        method = scope.get("method", "")

        if method in ("POST", "PUT", "PATCH"):
            # 读取完整 body
            more_body = True
            while more_body:
                message = await receive()
                if message["type"] == "http.request":
                    request_body_bytes += message.get("body", b"")
                    more_body = message.get("more_body", False)
                else:
                    # http.disconnect 或其他，提前结束
                    break

            request_body_text = request_body_bytes.decode("utf-8", errors="replace")

            # 重新构造 receive，把 body 塞回去供下游读取
            cached_body = request_body_bytes
            body_consumed = False

            async def receive_replay() -> Message:
                nonlocal body_consumed
                if not body_consumed:
                    body_consumed = True
                    return {
                        "type": "http.request",
                        "body": cached_body,
                        "more_body": False,
                    }
                # 下游再读时，返回空 body（模拟流结束）
                return {"type": "http.request", "body": b"", "more_body": False}

            receive = receive_replay
        else:
            request_body_text = ""

        # 3. 记录请求开始
        path = scope.get("path", "")
        query_string = scope.get("query_string", b"").decode("latin1")
        client_host = scope.get("client", ["-"])[0] if scope.get("client") else "-"

        logger.info(
            "request_start",
            trace_id=trace_id,
            method=method,
            path=path,
            query_params=dict(
                (k, v)
                for k, v in [
                    pair.split("=", 1) if "=" in pair else (pair, "")
                    for pair in query_string.split("&")
                ]
            )
            if query_string
            else None,
            client=client_host,
            # 仅记录请求体长度，不记录原文：answer/final-answer 含用户对话（敏感）
            request_body_chars=len(request_body_text) if request_body_text else 0,
        )

        # 4. 拦截响应，缓存 status_code 和 body，并注入 X-Trace-Id 响应头
        response_status = [0]
        response_body_chunks: list[bytes] = []

        async def send_wrapper(message: Message) -> None:
            if message["type"] == "http.response.start":
                response_status[0] = message.get("status", 0)
                # 注入 X-Trace-Id 响应头
                headers_list = message.get("headers", [])
                # 移除已存在的 X-Trace-Id（避免重复）
                headers_list = [
                    (k, v)
                    for k, v in headers_list
                    if k.lower() != b"x-trace-id"
                ]
                headers_list.append((b"x-trace-id", trace_id.encode("latin1")))
                message["headers"] = headers_list
            elif message["type"] == "http.response.body":
                response_body_chunks.append(message.get("body", b""))
            await send(message)

        # 5. 执行下游应用（同一 task 内，ContextVar 正常传播）
        try:
            await self.app(scope, receive, send_wrapper)
        except Exception as e:
            duration_ms = round((time.perf_counter() - start_ts) * 1000, 2)
            logger.error(
                "request_exception",
                trace_id=trace_id,
                method=method,
                path=path,
                duration_ms=duration_ms,
                error=str(e),
                error_type=type(e).__name__,
            )
            raise

        # 6. 记录请求完成
        duration_ms = round((time.perf_counter() - start_ts) * 1000, 2)
        response_body_bytes = b"".join(response_body_chunks)
        response_body_text = response_body_bytes.decode("utf-8", errors="replace")

        logger.info(
            "request_complete",
            trace_id=trace_id,
            method=method,
            path=path,
            status_code=response_status[0],
            duration_ms=duration_ms,
            client=client_host,
            # 仅记录响应体长度，不记录原文：响应含 LLM 生成的教学内容（敏感）
            response_body_chars=len(response_body_text) if response_body_text else 0,
        )
