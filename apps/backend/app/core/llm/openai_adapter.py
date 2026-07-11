import asyncio
import json
import re
import time
from typing import Any

import httpx
import structlog
from openai import AsyncOpenAI
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import settings
from app.core.llm.adapter import LLMAdapter
from app.core.trace import get_trace_id

logger = structlog.get_logger("app.core.llm.openai_adapter")


def _extract_json(text: str) -> dict[str, Any]:
    """从 LLM 输出中容错提取 JSON

    去掉 response_format=json_object 后，LLM 可能输出：
    - 纯 JSON
    - ```json ... ``` 代码块包裹的 JSON
    - JSON 前后带解释文字
    """
    text = text.strip()
    # 尝试直接解析
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    # 尝试提取 ```json ... ``` 代码块
    m = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(1).strip())
        except json.JSONDecodeError:
            pass
    # 尝试提取第一个 { ... } 块
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(0))
        except json.JSONDecodeError:
            pass
    raise json.JSONDecodeError("无法从 LLM 输出中提取 JSON", text, 0)


class OpenAIAdapter(LLMAdapter):
    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        base_url: str | None = None,
    ):
        self._api_key = api_key or settings.openai_api_key
        self._model = model or settings.openai_model
        self._base_url = base_url or settings.openai_base_url or None
        self._client: AsyncOpenAI | None = None

    @property
    def client(self) -> AsyncOpenAI:
        if self._client is None:
            # 显式配置 httpx 连接池：复用 TCP 连接，减少握手开销
            http_client = httpx.AsyncClient(
                limits=httpx.Limits(
                    max_connections=20,
                    max_keepalive_connections=10,
                    keepalive_expiry=30,
                ),
                timeout=httpx.Timeout(
                    connect=5.0,  # 连接超时 5 秒
                    read=float(settings.llm_timeout_seconds),
                    write=10.0,
                    pool=5.0,
                ),
                trust_env=False,  # 不读环境变量代理：DeepSeek 是国内 API，直连即可
            )
            kwargs = {"api_key": self._api_key, "http_client": http_client}
            if self._base_url:
                kwargs["base_url"] = self._base_url
            self._client = AsyncOpenAI(**kwargs)
        return self._client

    @property
    def model(self) -> str:
        return self._model

    @retry(
        stop=stop_after_attempt(settings.llm_retry_times + 1),
        wait=wait_exponential(multiplier=1, min=1, max=10),
    )
    async def chat_completion_json(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> dict[str, Any]:
        """流式调用 LLM 并解析 JSON

        优化点（对比 codex 类工具的做法）：
        1. stream=True：流式接收，中转服务可边生成边转发，避免非流式的 buffer 延迟
        2. 去掉 response_format=json_object：避免 constrained decoding 开销，
           改用 prompt 约束 + _extract_json 容错解析
        3. httpx 连接池复用 TCP 连接
        """
        trace_id = get_trace_id()
        start = time.perf_counter()
        input_chars = sum(len(m["content"]) for m in messages)

        logger.info(
            "llm_call_start",
            trace_id=trace_id,
            model=self.model,
            call_type="json_stream",
            message_count=len(messages),
            input_chars=input_chars,
            # 不记录 messages 原文：含 system prompt（核心资产）与用户对话（敏感）
        )

        try:
            # 流式调用：中转服务可边生成边转发，无需等完整响应 buffer
            # thinking=disabled：关闭 deepseek-v4-flash 的 reasoning（思考链），
            # 避免推理阶段耗时 10+ 秒。prompt 无法控制 reasoning，必须用此参数。
            # 注意：enable_thinking=false 在某些中转上已失效，thinking.type=disabled 是有效方式。
            stream = await asyncio.wait_for(
                self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    stream=True,
                    extra_body={"thinking": {"type": "disabled"}},
                ),
                timeout=settings.llm_timeout_seconds,
            )

            chunks: list[str] = []
            reasoning_chunks: list[str] = []
            first_reasoning_ms: float | None = None
            first_content_ms: float | None = None
            reasoning_chars = 0
            # 流式消费也加超时保护：reasoning 阶段可能很长，避免连接异常时无限等待
            # 注意：timeout 是整个 async for 的总超时，不是单 chunk 间隔超时
            async def _consume_stream():
                nonlocal first_reasoning_ms, first_content_ms, reasoning_chars
                async for chunk in stream:
                    if not chunk.choices:
                        continue
                    delta = chunk.choices[0].delta
                    if not delta:
                        continue
                    # deepseek-v4-flash 等模型会先输出 reasoning_content（思考链），
                    # 再输出 content（正式回答）。分别记录两个阶段的首 token 时间。
                    rc = getattr(delta, "reasoning_content", None) or ""
                    cc = delta.content
                    if rc:
                        if first_reasoning_ms is None:
                            first_reasoning_ms = round((time.perf_counter() - start) * 1000, 2)
                        reasoning_chars += len(rc)
                        reasoning_chunks.append(rc)
                    if cc:
                        if first_content_ms is None:
                            first_content_ms = round((time.perf_counter() - start) * 1000, 2)
                        chunks.append(cc)

            await asyncio.wait_for(_consume_stream(), timeout=settings.llm_timeout_seconds)

            content = "".join(chunks)
            reasoning_content = "".join(reasoning_chunks)
            latency_ms = round((time.perf_counter() - start) * 1000, 2)

            if not content:
                # 流结束但 content 为空（可能 reasoning 阶段被截断或模型只输出思考没输出答案）
                raise json.JSONDecodeError(
                    f"LLM 流式响应 content 为空（reasoning {reasoning_chars} 字符已接收，"
                    f"但未输出正式 content，可能 reasoning 阶段超时或连接中断）",
                    "",
                    0,
                )

            parsed = _extract_json(content)

            logger.info(
                "llm_call_complete",
                trace_id=trace_id,
                model=self.model,
                call_type="json_stream",
                latency_ms=latency_ms,
                first_reasoning_ms=first_reasoning_ms,
                first_content_ms=first_content_ms,
                reasoning_chars=reasoning_chars,
                # 不记录 reasoning_content / output 原文：可能含 system prompt 泄露与用户隐私
                output_chars=len(content),
                json_keys=list(parsed.keys()) if isinstance(parsed, dict) else None,
            )
            return parsed

        except asyncio.TimeoutError:
            latency_ms = round((time.perf_counter() - start) * 1000, 2)
            logger.error(
                "llm_call_timeout",
                trace_id=trace_id,
                model=self.model,
                call_type="json_stream",
                latency_ms=latency_ms,
                timeout_seconds=settings.llm_timeout_seconds,
                input_chars=input_chars,
                message_count=len(messages),
                reasoning_chars=reasoning_chars if 'reasoning_chars' in locals() else 0,
                content_chars=len(chunks) if 'chunks' in locals() else 0,
            )
            raise TimeoutError(f"LLM call timed out after {settings.llm_timeout_seconds}s")
        except json.JSONDecodeError as e:
            latency_ms = round((time.perf_counter() - start) * 1000, 2)
            logger.error(
                "llm_json_parse_error",
                trace_id=trace_id,
                model=self.model,
                call_type="json_stream",
                latency_ms=latency_ms,
                error=str(e),
                # 不记录 raw_output / reasoning_content 原文，避免泄露 prompt 与用户隐私
                output_chars=len(content) if 'content' in locals() and content else 0,
                reasoning_chars=reasoning_chars if 'reasoning_chars' in locals() else 0,
            )
            raise
        except Exception as e:
            latency_ms = round((time.perf_counter() - start) * 1000, 2)
            logger.error(
                "llm_call_error",
                trace_id=trace_id,
                model=self.model,
                call_type="json_stream",
                latency_ms=latency_ms,
                error=str(e),
                error_type=type(e).__name__,
            )
            raise
