import structlog

from app.core.models.session import SessionState, new_session
from app.core.trace import get_trace_id

logger = structlog.get_logger()


class SessionManager:
    def __init__(self):
        self._sessions: dict[str, SessionState] = {}

    def create_session(self) -> SessionState:
        state = new_session()
        self._sessions[state.session_id] = state
        logger.info(
            "session_created",
            trace_id=get_trace_id(),
            session_id=state.session_id,
        )
        return state

    def get_session(self, session_id: str) -> SessionState | None:
        state = self._sessions.get(session_id)
        if state is None:
            logger.warning(
                "session_not_found",
                trace_id=get_trace_id(),
                session_id=session_id,
            )
        return state

    def enter_node(self, session_id: str, node_id: str) -> SessionState:
        state = self._sessions[session_id]
        state.node_id = node_id
        state.current_layer = "how"
        state.current_round = 0
        state.layer_dialogue = []
        state.layer_summaries = {}
        state.node_completed = False
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
        state = self._sessions[session_id]
        state.current_round += 1
        state.layer_dialogue.append({"role": "user", "content": user_input})
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
        state = self._sessions[session_id]
        prev_layer = state.current_layer
        state.layer_summaries[state.current_layer] = summary

        next_lyr = state.next_layer()
        if next_lyr is None:
            state.node_completed = True
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
