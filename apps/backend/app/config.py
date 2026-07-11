from typing import Annotated

from dotenv import load_dotenv
from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode

load_dotenv(".env", override=True)


class Settings(BaseSettings):
    openai_base_url: str = ""
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    llm_timeout_seconds: int = 30
    llm_retry_times: int = 1

    # Redis 配置
    redis_url: str = "redis://localhost:6379/0"
    # session 在 Redis 中的过期时间（秒），默认 7 天
    session_ttl_seconds: int = 7 * 24 * 3600

    # CORS 允许的源（环境变量逗号分隔，如 CORS_ORIGINS=https://a.com,https://b.com）
    # NoDecode 阻止 pydantic-settings 自动 JSON 解析，交给 field_validator 处理
    cors_origins: Annotated[list[str], NoDecode] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ]

    # 运行环境：development / production
    # production 下：关闭 reload、关闭 /docs、日志脱敏更严格
    app_env: str = "development"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        """支持逗号分隔字符串或 JSON 数组格式"""
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("["):
                import json
                return json.loads(v)
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"  # 忽略 .env 中未定义的额外字段（如遗留的 LLM_TEMPERATURE）


settings = Settings()
