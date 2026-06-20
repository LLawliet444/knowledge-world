import json
import pathlib

import structlog

logger = structlog.get_logger()

_DATA_DIR = pathlib.Path(__file__).parent.parent.parent / "data" / "sapiens"
_cache: dict[str, dict] = {}


def load_node_scope(node_id: str) -> dict | None:
    if node_id in _cache:
        return _cache[node_id]

    filepath = _DATA_DIR / f"{node_id}.json"
    if not filepath.exists():
        logger.warning("node_scope_not_found", node_id=node_id, path=str(filepath))
        return None

    with open(filepath, encoding="utf-8") as f:
        data = json.load(f)
    _cache[node_id] = data
    return data
