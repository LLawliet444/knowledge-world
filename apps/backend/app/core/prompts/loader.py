import pathlib

_CWD = pathlib.Path(__file__).parent


def _read(path: str) -> str:
    return (pathlib.Path(_CWD) / path).read_text(encoding="utf-8")


def load_system_prompt() -> str:
    return _read("system.md")


def load_runtime_template() -> str:
    return _read("runtime.md")


def load_judge_level_prompt() -> str:
    return _read("judge_level.md")
