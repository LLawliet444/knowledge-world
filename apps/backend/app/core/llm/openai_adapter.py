import asyncio
import json
from typing import Any

import structlog
from openai import AsyncOpenAI
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import settings
from app.core.llm.adapter import LLMAdapter

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
            return response.choices[0].message.content or ""
        except asyncio.TimeoutError:
            logger.warning("llm_timeout", model=self.model)
            raise TimeoutError("LLM call timed out")

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
            return json.loads(content)
        except (asyncio.TimeoutError, json.JSONDecodeError) as e:
            logger.warning("llm_json_failed", model=self.model, error=str(e))
            raise
