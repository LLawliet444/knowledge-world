import structlog

from app.core.models.session import SessionState, new_session

logger = structlog.get_logger()


class SessionManager:
    def __init__(self):
        self._sessions: dict[str, SessionState] = {}

    def create_session(self) -> SessionState:
        state = new_session()
        self._sessions[state.session_id] = state
        logger.info("session_created", session_id=state.session_id)
        return state

    def get_session(self, session_id: str) -> SessionState | None:
        state = self._sessions.get(session_id)
        return state

    def enter_node(self, session_id: str, node_id: str) -> SessionState:
        state = self._sessions[session_id]
        state.node_id = node_id
        state.current_layer = "how"
        state.current_round = 0
        state.layer_dialogue = []
        state.layer_summaries = {}
        state.node_completed = False
        logger.info("node_entered", session_id=session_id, node_id=node_id)
        return state

    def record_answer(
        self, session_id: str, user_input: str
    ) -> SessionState:
        state = self._sessions[session_id]
        state.current_round += 1
        state.layer_dialogue.append({"role": "user", "content": user_input})
        return state

    def advance_layer(
        self, session_id: str, summary: str
    ) -> SessionState:
        state = self._sessions[session_id]
        state.layer_summaries[state.current_layer] = summary

        next_lyr = state.next_layer()
        if next_lyr is None:
            state.node_completed = True
            logger.info("node_completed", session_id=session_id, node_id=state.node_id)
        else:
            state.current_layer = next_lyr
            state.current_round = 0
            state.layer_dialogue = []
            logger.info(
                "layer_advanced",
                session_id=session_id,
                node_id=state.node_id,
                next_layer=next_lyr,
            )
        return state
