from dotenv import load_dotenv
from pydantic_settings import BaseSettings

load_dotenv(".env", override=True)


class Settings(BaseSettings):
    openai_base_url: str = ""
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    llm_temperature: float = 0.7
    llm_provider: str = "openai"

    max_answer_length: int = 1000
    llm_timeout_seconds: int = 60
    llm_retry_times: int = 2

    # Redis 配置
    redis_url: str = "redis://localhost:6379/0"
    # session 在 Redis 中的过期时间（秒），默认 7 天
    session_ttl_seconds: int = 7 * 24 * 3600

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
