import json
import logging
import logging.handlers
import pathlib
from datetime import timezone, timedelta

import structlog

from app.core.trace import get_trace_id

_LOG_DIR = pathlib.Path(__file__).parent.parent / "logs"
_LOG_DIR.mkdir(exist_ok=True)

# 上海时区 UTC+8
_SHANGHAI_TZ = timezone(timedelta(hours=8))


def _inject_trace_id(_, __, event_dict):
    """注入当前请求的 trace_id（ContextVar 已在中间件层设置）"""
    event_dict.setdefault("trace_id", get_trace_id())
    return event_dict


def _shanghai_timestamp(_logger, _name, event_dict):
    """注入上海时区的 ISO 时间戳（替代 structlog 默认的 UTC TimeStamper）"""
    from datetime import datetime

    event_dict.setdefault(
        "timestamp", datetime.now(_SHANGHAI_TZ).isoformat(timespec="microseconds")
    )
    return event_dict


class JsonFormatter(logging.Formatter):
    """把 stdlib LogRecord 格式化为 JSONL（每行一个 JSON 对象）"""

    def format(self, record: logging.LogRecord) -> str:
        from datetime import datetime

        msg = record.getMessage()
        try:
            data = json.loads(msg)
            if not isinstance(data, dict):
                data = {"message": msg}
        except (json.JSONDecodeError, TypeError):
            data = {"message": msg}

        data.setdefault("level", record.levelname.lower())
        data.setdefault("logger", record.name)
        # 用上海时区时间戳替代默认的 UTC formatTime
        data.setdefault(
            "timestamp", datetime.now(_SHANGHAI_TZ).isoformat(timespec="microseconds")
        )
        return json.dumps(data, ensure_ascii=False)


def setup_logging() -> None:
    # 1. structlog 配置：输出 JSON 字符串交给 stdlib logging
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_log_level,
            _inject_trace_id,
            _shanghai_timestamp,
            structlog.processors.JSONRenderer(ensure_ascii=False),
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=False,
    )

    # 2. 根 logger 清掉默认 handler，避免重复
    root = logging.getLogger()
    root.handlers.clear()
    root.setLevel(logging.INFO)

    # 3. 控制台 handler：INFO 及以上，纯文本可读
    console = logging.StreamHandler()
    console.setLevel(logging.INFO)
    console.setFormatter(logging.Formatter("%(message)s"))
    root.addHandler(console)

    # 4. 全量日志文件（JSONL，按天滚动，追加模式，保留 7 天）
    app_file = logging.handlers.TimedRotatingFileHandler(
        filename=_LOG_DIR / "app.log",
        when="midnight",
        backupCount=7,
        encoding="utf-8",
    )
    app_file.setLevel(logging.INFO)
    app_file.setFormatter(JsonFormatter())
    root.addHandler(app_file)

    # 5. 错误日志文件（仅 ERROR 及以上，按天滚动，保留 30 天）
    error_file = logging.handlers.TimedRotatingFileHandler(
        filename=_LOG_DIR / "error.log",
        when="midnight",
        backupCount=30,
        encoding="utf-8",
    )
    error_file.setLevel(logging.ERROR)
    error_file.setFormatter(JsonFormatter())
    root.addHandler(error_file)

    # 6. LLM 专用日志（仅 openai_adapter 模块，按天滚动，保留 14 天）
    llm_file = logging.handlers.TimedRotatingFileHandler(
        filename=_LOG_DIR / "llm.log",
        when="midnight",
        backupCount=14,
        encoding="utf-8",
    )
    llm_file.setLevel(logging.INFO)
    llm_file.setFormatter(JsonFormatter())

    llm_logger = logging.getLogger("app.core.llm.openai_adapter")
    llm_logger.handlers.clear()
    llm_logger.addHandler(llm_file)
    llm_logger.propagate = True  # 仍向 root 传播，保证 app.log/error.log 也有 LLM 日志

    # 7. 降低第三方库日志噪音
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("openai").setLevel(logging.WARNING)
