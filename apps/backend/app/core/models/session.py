import uuid
from dataclasses import dataclass, field


LAYER_ORDER = ["how", "why", "system"]
MAX_ROUNDS_BEFORE_EVALUATION = 3


@dataclass
class SessionState:
    session_id: str
    node_id: str | None = None
    current_layer: str | None = None
    current_round: int = 0
    layer_dialogue: list[dict[str, str]] = field(default_factory=list)
    layer_summaries: dict[str, str] = field(default_factory=dict)
    node_completed: bool = False

    @property
    def layer_index(self) -> int:
        if self.current_layer is None:
            return 0
        return LAYER_ORDER.index(self.current_layer)

    @property
    def can_evaluate(self) -> bool:
        return self.current_round >= MAX_ROUNDS_BEFORE_EVALUATION

    def next_layer(self) -> str | None:
        idx = self.layer_index + 1
        if idx < len(LAYER_ORDER):
            return LAYER_ORDER[idx]
        return None

    @property
    def previous_summary(self) -> str:
        idx = self.layer_index
        if idx == 0:
            return ""
        prev_layer = LAYER_ORDER[idx - 1]
        return self.layer_summaries.get(prev_layer, "")


def new_session() -> SessionState:
    return SessionState(session_id=f"sess_{uuid.uuid4().hex[:12]}")
