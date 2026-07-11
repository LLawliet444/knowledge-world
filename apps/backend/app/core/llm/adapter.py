from abc import ABC, abstractmethod
from typing import Any, Type, TypeVar

from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


class LLMAdapter(ABC):
    @abstractmethod
    async def chat_completion_json(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> dict[str, Any]:
        pass

    @abstractmethod
    async def chat_completion_validated(
        self,
        messages: list[dict[str, str]],
        output_model: Type[T],
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> T:
        """调用 LLM 并用 Pydantic 模型校验输出，格式不符重试一次，再不行抛异常"""
        pass
