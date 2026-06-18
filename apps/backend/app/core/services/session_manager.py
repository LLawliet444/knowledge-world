import json

import redis
import structlog

from app.config import settings
from app.core.models.session import SessionState, new_session
from app.core.trace import get_trace_id

logger = structlog.get_logger()

# Redis key 前缀
_SESSION_KEY_PREFIX = "kw:session:"

# redis 客户端单例（模块级共享，连接池由 redis-py 内部管理）
_redis_client: redis.Redis | None = None


def get_redis() -> redis.Redis:
    """获取 Redis 客户端单例

    使用同步客户端（redis-py 的 Redis），方法签名保持与原内存版一致，
    避免改动 main.py 的调用方式。在 async route 中同步调用 Redis 操作
    是可接受的（Redis 操作通常 <1ms，远小于 LLM 调用）。
    """
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(
            settings.redis_url,
            decode_responses=True,  # 返回 str 而非 bytes，方便 JSON 处理
            socket_connect_timeout=2,
            socket_timeout=2,
        )
    return _redis_client


def _session_key(session_id: str) -> str:
    return f"{_SESSION_KEY_PREFIX}{session_id}"


def _save_session(state: SessionState) -> None:
    """保存 session 到 Redis，刷新 TTL"""
    key = _session_key(state.session_id)
    data = json.dumps(state.to_dict(), ensure_ascii=False)
    get_redis().setex(key, settings.session_ttl_seconds, data)


def _load_session(session_id: str) -> SessionState | None:
    """从 Redis 读取 session"""
    key = _session_key(session_id)
    raw = get_redis().get(key)
    if raw is None:
        return None
    return SessionState.from_dict(json.loads(raw))


class SessionManager:
    """基于 Redis 的 session 管理器

    - session 以 JSON 形式存入 Redis，key 为 `kw:session:{session_id}`
    - TTL 默认 7 天（可配置 SESSION_TTL_SECONDS），每次写入刷新 TTL
    - 进程重启后 session 不丢失
    - 多实例部署时 session 跨实例共享
    """

    def create_session(self) -> SessionState:
        state = new_session()
        _save_session(state)
        logger.info(
            "session_created",
            trace_id=get_trace_id(),
            session_id=state.session_id,
        )
        return state

    def get_session(self, session_id: str) -> SessionState | None:
        state = _load_session(session_id)
        if state is None:
            logger.warning(
                "session_not_found",
                trace_id=get_trace_id(),
                session_id=session_id,
            )
        return state

    def enter_node(self, session_id: str, node_id: str) -> SessionState:
        state = _load_session(session_id)
        if state is None:
            raise ValueError(f"Session {session_id} not found")
        state.node_id = node_id
        state.current_layer = "how"
        state.current_round = 0
        state.layer_dialogue = []
        state.layer_summaries = {}
        state.compressed_summary = ""
        state.node_completed = False
        state.last_ai_question = ""
        state.last_user_answer = ""
        _save_session(state)
        logger.info(
            "node_entered",
            trace_id=get_trace_id(),
            session_id=session_id,
            node_id=node_id,
            start_layer="how",
        )
        return state

    def record_answer(
        self, session_id: str, user_input: str
    ) -> SessionState:
        state = _load_session(session_id)
        if state is None:
            raise ValueError(f"Session {session_id} not found")
        state.current_round += 1
        state.layer_dialogue.append({"role": "user", "content": user_input})
        state.last_user_answer = user_input
        _save_session(state)
        logger.info(
            "answer_recorded",
            trace_id=get_trace_id(),
            session_id=session_id,
            node_id=state.node_id,
            layer=state.current_layer,
            round=state.current_round,
            input_len=len(user_input),
        )
        return state

    def advance_layer(
        self, session_id: str, summary: str
    ) -> SessionState:
        state = _load_session(session_id)
        if state is None:
            raise ValueError(f"Session {session_id} not found")
        prev_layer = state.current_layer
        state.layer_summaries[state.current_layer] = summary

        next_lyr = state.next_layer()
        if next_lyr is None:
            state.node_completed = True
            _save_session(state)
            logger.info(
                "node_completed",
                trace_id=get_trace_id(),
                session_id=session_id,
                node_id=state.node_id,
                final_layer=prev_layer,
                all_summaries=state.layer_summaries,
            )
        else:
            state.current_layer = next_lyr
            state.current_round = 0
            state.layer_dialogue = []
            state.compressed_summary = ""
            state.last_ai_question = ""
            state.last_user_answer = ""
            _save_session(state)
            logger.info(
                "layer_advanced",
                trace_id=get_trace_id(),
                session_id=session_id,
                node_id=state.node_id,
                from_layer=prev_layer,
                to_layer=next_lyr,
                prev_summary=summary,
            )
        return state

    def update_last_ai_question(self, session_id: str, question: str) -> None:
        """更新最后一次 AI 问题缓存（enter_node 首问 / answer 追问后调用）"""
        state = _load_session(session_id)
        if state is None:
            return
        state.last_ai_question = question
        _save_session(state)

    def save(self, state: SessionState) -> None:
        """显式保存 session 状态

        main.py 中有些操作直接修改 state 对象（如 layer_dialogue.append），
        调用此方法将修改持久化到 Redis。
        """
        _save_session(state)
