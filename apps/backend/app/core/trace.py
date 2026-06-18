import contextvars
import uuid

_TRACE_ID: contextvars.ContextVar[str] = contextvars.ContextVar("trace_id", default="-")


def new_trace_id() -> str:
    tid = f"trace_{uuid.uuid4().hex[:16]}"
    _TRACE_ID.set(tid)
    return tid


def get_trace_id() -> str:
    return _TRACE_ID.get()


def set_trace_id(tid: str) -> None:
    _TRACE_ID.set(tid)
