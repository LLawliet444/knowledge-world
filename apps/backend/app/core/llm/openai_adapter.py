import asyncio
import json
import time
from typing import Any

import structlog
from openai import AsyncOpenAI
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import settings
from app.core.llm.adapter import LLMAdapter
from app.core.trace import get_trace_id

logger = structlog.get_logger()


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
            kwargs = {"api_key": self._api_key}
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
    async def chat_completion(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> str:
        trace_id = get_trace_id()
        start = time.perf_counter()
        input_tokens = sum(len(m["content"]) for m in messages)

        logger.info(
            "llm_call_start",
            trace_id=trace_id,
            model=self.model,
            call_type="text",
            message_count=len(messages),
            input_chars=input_tokens,
            messages=messages,
        )

        try:
            response = await asyncio.wait_for(
                self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                ),
                timeout=settings.llm_timeout_seconds,
            )
            output = response.choices[0].message.content or ""
            latency_ms = round((time.perf_counter() - start) * 1000, 2)

            logger.info(
                "llm_call_complete",
                trace_id=trace_id,
                model=self.model,
                call_type="text",
                latency_ms=latency_ms,
                output_chars=len(output),
                output=output,
            )
            return output

        except asyncio.TimeoutError:
            latency_ms = round((time.perf_counter() - start) * 1000, 2)
            logger.error(
                "llm_call_timeout",
                trace_id=trace_id,
                model=self.model,
                call_type="text",
                latency_ms=latency_ms,
                timeout_seconds=settings.llm_timeout_seconds,
                input_chars=input_tokens,
                message_count=len(messages),
            )
            raise TimeoutError(f"LLM call timed out after {settings.llm_timeout_seconds}s")
        except Exception as e:
            latency_ms = round((time.perf_counter() - start) * 1000, 2)
            logger.error(
                "llm_call_error",
                trace_id=trace_id,
                model=self.model,
                call_type="text",
                latency_ms=latency_ms,
                error=str(e),
                error_type=type(e).__name__,
            )
            raise

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
        trace_id = get_trace_id()
        start = time.perf_counter()
        input_chars = sum(len(m["content"]) for m in messages)

        logger.info(
            "llm_call_start",
            trace_id=trace_id,
            model=self.model,
            call_type="json",
            message_count=len(messages),
            input_chars=input_chars,
            messages=messages,
        )

        try:
            response = await asyncio.wait_for(
                self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    response_format={"type": "json_object"},
                ),
                timeout=settings.llm_timeout_seconds,
            )
            content = response.choices[0].message.content or "{}"
            parsed = json.loads(content)
            latency_ms = round((time.perf_counter() - start) * 1000, 2)

            logger.info(
                "llm_call_complete",
                trace_id=trace_id,
                model=self.model,
                call_type="json",
                latency_ms=latency_ms,
                output_chars=len(content),
                output=content,
                output_parsed=parsed,
                json_keys=list(parsed.keys()) if isinstance(parsed, dict) else None,
            )
            return parsed

        except asyncio.TimeoutError:
            latency_ms = round((time.perf_counter() - start) * 1000, 2)
            logger.error(
                "llm_call_timeout",
                trace_id=trace_id,
                model=self.model,
                call_type="json",
                latency_ms=latency_ms,
                timeout_seconds=settings.llm_timeout_seconds,
                input_chars=input_chars,
                message_count=len(messages),
            )
            raise TimeoutError(f"LLM call timed out after {settings.llm_timeout_seconds}s")
        except json.JSONDecodeError as e:
            latency_ms = round((time.perf_counter() - start) * 1000, 2)
            logger.error(
                "llm_json_parse_error",
                trace_id=trace_id,
                model=self.model,
                call_type="json",
                latency_ms=latency_ms,
                error=str(e),
                raw_output=content[:200] if 'content' in locals() else None,
            )
            raise
        except Exception as e:
            latency_ms = round((time.perf_counter() - start) * 1000, 2)
            logger.error(
                "llm_call_error",
                trace_id=trace_id,
                model=self.model,
                call_type="json",
                latency_ms=latency_ms,
                error=str(e),
                error_type=type(e).__name__,
            )
            raise
