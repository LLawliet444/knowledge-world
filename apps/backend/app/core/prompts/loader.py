import os
import pathlib

_CWD = pathlib.Path(__file__).parent


def _read(path: str) -> str:
    return (pathlib.Path(_CWD) / path).read_text(encoding="utf-8")


def load_question_prompts() -> tuple[str, str]:
    return (_read("question/system.md"), _read("question/user.md"))


def load_feedback_prompts() -> tuple[str, str]:
    return (_read("feedback/system.md"), _read("feedback/user.md"))


def load_final_question_prompts() -> tuple[str, str]:
    return (_read("final_question/system.md"), _read("final_question/user.md"))
