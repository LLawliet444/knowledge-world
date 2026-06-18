import re

from app.core.prompts.loader import (
    load_feedback_prompts,
    load_final_question_prompts,
    load_question_prompts,
)

_QUESTION_SYSTEM, _QUESTION_USER = load_question_prompts()
_FEEDBACK_SYSTEM, _FEEDBACK_USER = load_feedback_prompts()
_FINAL_SYSTEM, _FINAL_USER = load_final_question_prompts()


def _render(template: str, **kwargs: str) -> str:
    def _replace(m: re.Match[str]) -> str:
        key = m.group(1).strip()
        return kwargs.get(key, m.group(0))
    return re.sub(r"\{\{\s*(\w+)\s*\}\}", _replace, template)


def build_question_system(depth: str) -> str:
    return _render(_QUESTION_SYSTEM, depth=depth)


def build_question_user(
    node_name: str,
    mystery_question: str,
    source_excerpt: str,
    mentor_prompt: str,
) -> str:
    return _render(
        _QUESTION_USER,
        node_name=node_name,
        mystery_question=mystery_question,
        source_excerpt=source_excerpt,
        mentor_prompt=mentor_prompt,
    )


def build_question_messages(
    node_name: str,
    mystery_question: str,
    source_excerpt: str,
    mentor_prompt: str,
    depth: str,
) -> list[dict[str, str]]:
    return [
        {"role": "system", "content": build_question_system(depth)},
        {"role": "user", "content": build_question_user(
            node_name=node_name,
            mystery_question=mystery_question,
            source_excerpt=source_excerpt,
            mentor_prompt=mentor_prompt,
        )},
    ]


_DEPTH_LABELS = {"how": "机制", "why": "因果", "system": "迁移"}


def build_feedback_system() -> str:
    return _FEEDBACK_SYSTEM


def build_feedback_user(
    node_name: str,
    depth: str,
    source_excerpt: str,
    user_answer: str,
    round: int,
) -> str:
    return _render(
        _FEEDBACK_USER,
        node_name=node_name,
        depth=depth,
        depth_label=_DEPTH_LABELS.get(depth, "机制"),
        source_excerpt=source_excerpt,
        user_answer=user_answer,
        round=str(round),
    )


def build_feedback_messages(
    node_name: str,
    depth: str,
    source_excerpt: str,
    user_answer: str,
    round: int,
) -> list[dict[str, str]]:
    return [
        {"role": "system", "content": build_feedback_system()},
        {"role": "user", "content": build_feedback_user(
            node_name=node_name,
            depth=depth,
            source_excerpt=source_excerpt,
            user_answer=user_answer,
            round=round,
        )},
    ]


def build_final_question_system() -> str:
    return _FINAL_SYSTEM


def build_final_question_user(
    node_name: str,
    mystery_question: str,
    source_excerpt: str,
    user_answer: str,
) -> str:
    return _render(
        _FINAL_USER,
        node_name=node_name,
        mystery_question=mystery_question,
        source_excerpt=source_excerpt,
        user_answer=user_answer,
    )


def build_final_question_messages(
    node_name: str,
    mystery_question: str,
    source_excerpt: str,
    user_answer: str,
) -> list[dict[str, str]]:
    return [
        {"role": "system", "content": build_final_question_system()},
        {"role": "user", "content": build_final_question_user(
            node_name=node_name,
            mystery_question=mystery_question,
            source_excerpt=source_excerpt,
            user_answer=user_answer,
        )},
    ]


FALLBACK_QUESTION = "关于这个概念——请你思考：它的核心机制是什么？如果缺少它，会有什么不同？"
FALLBACK_FOLLOWUPS = [
    "你能用生活中的例子来说明吗？",
    "它与我们之前讨论过的概念有什么联系？",
]

FALLBACK_FEEDBACK_CARD = {
    "understood": ["你已经开始思考这个问题了"],
    "missing": ["尝试更具体地联系原文内容"],
    "guidance": "试着用「因为...所以...」的句式来组织你的回答，这样能帮你理清逻辑链条。",
    "next_question": "你能举一个反例来修正或挑战你的观点吗？",
}
FALLBACK_DEPTH_STATE = "learning"
FALLBACK_COVERED_DIMENSIONS = ["concept"]

FALLBACK_FINAL_PASSED = False
FALLBACK_FINAL_COVERAGE = {
    "concept_accurate": False,
    "mechanism_complete": False,
    "reason_explained": False,
    "transfer_awareness": False,
}
FALLBACK_FINAL_RESPONSE = "这是一个很深的问题。试试从你学过的四个角度来重新思考它。"
