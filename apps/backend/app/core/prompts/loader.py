import pathlib

_CWD = pathlib.Path(__file__).parent


def _read(path: str) -> str:
    return (pathlib.Path(_CWD) / path).read_text(encoding="utf-8")


def load_how_prompt() -> str:
    return _read("how.md")


def load_why_prompt() -> str:
    return _read("why.md")


def load_system_layer_prompt() -> str:
    return _read("system_layer.md")


def load_evaluation_prompt() -> str:
    return _read("evaluation.md")


def load_final_answer_prompt() -> str:
    return _read("final_answer.md")
