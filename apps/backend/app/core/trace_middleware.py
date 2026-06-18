import time

import structlog
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.trace import get_trace_id, new_trace_id, set_trace_id

logger = structlog.get_logger()


class TraceMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        incoming = request.headers.get("X-Trace-Id")
        if incoming:
            set_trace_id(incoming)
        else:
            new_trace_id()

        trace_id = get_trace_id()
        start_ts = time.perf_counter()

        response: Response = await call_next(request)

        duration_ms = round((time.perf_counter() - start_ts) * 1000, 2)

        logger.info(
            "request_complete",
            trace_id=trace_id,
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=duration_ms,
            client=request.client.host if request.client else "-",
        )

        response.headers["X-Trace-Id"] = trace_id
        return response
