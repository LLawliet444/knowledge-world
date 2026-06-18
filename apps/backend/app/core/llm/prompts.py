import re

from app.core.prompts.loader import (
    load_judge_level_prompt,
    load_runtime_template,
    load_system_prompt,
)

_SYSTEM_PROMPT = load_system_prompt()
_RUNTIME_TEMPLATE = load_runtime_template()
_JUDGE_LEVEL_PROMPT = load_judge_level_prompt()


def _render(template: str, **kwargs: str) -> str:
    def _replace(m: re.Match[str]) -> str:
        key = m.group(1).strip()
        return kwargs.get(key, m.group(0))
    return re.sub(r"\{\{\s*(\w+)\s*\}\}", _replace, template)


def build_interact_messages(
    node_name: str,
    concept: str,
    examples: str,
    misconceptions: str,
    learning_goals: str,
    user_input: str,
    level: int,
    chat_history: str,
) -> list[dict[str, str]]:
    runtime = _render(
        _RUNTIME_TEMPLATE,
        system_prompt=_SYSTEM_PROMPT,
        node_name=node_name,
        concept=concept,
        examples=examples,
        misconceptions=misconceptions,
        learning_goals=learning_goals,
        user_input=user_input,
        level=str(level),
        chat_history=chat_history,
    )
    return [{"role": "user", "content": runtime}]


def build_judge_level_message(user_input: str) -> list[dict[str, str]]:
    content = _render(
        _JUDGE_LEVEL_PROMPT,
        user_input=user_input,
    )
    return [{"role": "user", "content": content}]


_DIMENSION_MAP = ["observe", "reason", "abstract"]
_DIMENSION_FALLBACKS = [
    "这个现象有哪些关键表现？",
    "背后的因果关系是什么？",
    "这揭示了什么深层规律？",
]


def parse_interact_response(response: str) -> dict:
    result = {}
    question_match = re.search(r"【问题】\s*\n(.+?)(?=\n【思考方向】|\n【提示】|$)", response, re.DOTALL)
    result["question"] = question_match.group(1).strip() if question_match else "关于这个概念，你有什么理解？"

    directions = []
    direction_section = re.search(r"【思考方向】\s*\n(.+?)(?=\n【提示】|$)", response, re.DOTALL)
    if direction_section:
        lines = direction_section.group(1).strip().split("\n")
        idx = 0
        for line in lines:
            line = line.strip()
            if re.match(r"^\d+[.、]\s*", line):
                text = re.sub(r"^\d+[.、]\s*", "", line).strip()
                if idx < 3:
                    directions.append({
                        "dimension": _DIMENSION_MAP[idx],
                        "text": text,
                    })
                    idx += 1
    if not directions:
        directions = [
            {"dimension": d, "text": t}
            for d, t in zip(_DIMENSION_MAP, _DIMENSION_FALLBACKS)
        ]

    result["directions"] = directions

    hint_match = re.search(r"【提示】\s*\n(.+)", response, re.DOTALL)
    result["hint"] = hint_match.group(1).strip() if hint_match else ""

    return result


def parse_judge_level_response(response: str) -> int:
    match = re.search(r"[1234]", response.strip())
    if match:
        return int(match.group())
    return 1


FALLBACK_QUESTION = "关于这个概念，你有什么初步理解？"
FALLBACK_DIRECTIONS = [
    {"dimension": "observe", "text": "这个现象有哪些关键表现？"},
    {"dimension": "reason", "text": "背后的因果关系是什么？"},
    {"dimension": "abstract", "text": "这揭示了什么深层规律？"},
]
FALLBACK_LEVEL = 1
