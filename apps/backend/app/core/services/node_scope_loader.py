import json
import pathlib

import structlog

logger = structlog.get_logger()

_DATA_DIR = pathlib.Path(__file__).parent.parent.parent / "data" / "sapiens"


def _valid_node_ids() -> set[str]:
    """扫描数据目录，返回所有合法的 node_id 集合（文件名不含扩展名）。

    白名单动态生成，新增 json 文件自动纳入，无需改代码。
    """
    if not _DATA_DIR.is_dir():
        return set()
    return {p.stem for p in _DATA_DIR.glob("*.json") if p.is_file()}


# 启动时一次性扫描并缓存白名单（文件不变动）
_VALID_IDS_CACHE: set[str] | None = None


def _get_valid_ids() -> set[str]:
    global _VALID_IDS_CACHE
    if _VALID_IDS_CACHE is None:
        _VALID_IDS_CACHE = _valid_node_ids()
    return _VALID_IDS_CACHE


_cache: dict[str, dict] = {}


def load_node_scope(node_id: str) -> dict | None:
    # 防御 1：白名单校验，拒绝不在数据目录中的 node_id（含 ../ 等穿越尝试）
    if node_id not in _get_valid_ids():
        logger.warning("node_id_rejected_not_whitelisted", node_id=node_id)
        return None

    if node_id in _cache:
        return _cache[node_id]

    filepath = (_DATA_DIR / f"{node_id}.json").resolve()
    # 防御 2：resolve 后校验路径仍在数据目录内（双保险，防止符号链接等绕过）
    if not str(filepath).startswith(str(_DATA_DIR.resolve())):
        logger.warning("node_id_rejected_path_traversal", node_id=node_id, path=str(filepath))
        return None

    if not filepath.exists():
        logger.warning("node_scope_not_found", node_id=node_id, path=str(filepath))
        return None

    with open(filepath, encoding="utf-8") as f:
        data = json.load(f)
    _cache[node_id] = data
    return data
