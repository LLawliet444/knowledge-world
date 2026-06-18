import logging

import structlog

from app.core.trace import get_trace_id


def _inject_trace_id(_, __, event_dict):
    event_dict.setdefault("trace_id", get_trace_id())
    return event_dict


def setup_logging() -> None:
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_log_level,
            _inject_trace_id,
            structlog.dev.ConsoleRenderer(),
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )
    logging.basicConfig(format="%(message)s", level=logging.INFO)
