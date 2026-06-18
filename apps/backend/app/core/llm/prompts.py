from app.core.prompts.loader import (
    load_evaluation_prompt,
    load_how_prompt,
    load_why_prompt,
    load_system_layer_prompt,
)

_HOW_SYSTEM = load_how_prompt()
_WHY_SYSTEM = load_why_prompt()
_SYSTEM_LAYER_SYSTEM = load_system_layer_prompt()
_EVALUATION_SYSTEM = load_evaluation_prompt()


def _get_layer_prompt(layer: str) -> str:
    if layer == "how":
        return _HOW_SYSTEM
    elif layer == "why":
        return _WHY_SYSTEM
    elif layer == "system":
        return _SYSTEM_LAYER_SYSTEM
    return _HOW_SYSTEM


def _format_dialogue(history: list[dict[str, str]]) -> str:
    lines = []
    for entry in history:
        role_label = "AI" if entry["role"] == "ai" else "用户"
        lines.append(f"{role_label}：{entry['content']}")
    return "\n".join(lines)


def build_layer_first_messages(
    layer: str,
    scope_summary: str,
    criteria: str,
    misconceptions: str,
    previous_summary: str,
) -> list[dict[str, str]]:
    """构建进入新层时的第一条 prompt（无用户回答，需要生成第一个教学内容）"""
    system = _get_layer_prompt(layer)

    user_parts = [f"【知识节点范围】\n{scope_summary}\n"]
    if criteria:
        user_parts.append(f"【本层掌握标准】\n{criteria}\n")
    user_parts.append(f"【常见误解】\n{misconceptions}\n")
    if previous_summary:
        user_parts.append(f"【前层总结】\n{previous_summary}\n")
    user_parts.append("【用户最新回答】\n（首次进入该层，无用户回答）\n")
    user_parts.append("请输出教学内容（teaching_content），不包含 evaluation。")

    return [
        {"role": "system", "content": system},
        {"role": "user", "content": "\n".join(user_parts)},
    ]


def build_teaching_messages(
    layer: str,
    scope_summary: str,
    criteria: str,
    misconceptions: str,
    previous_summary: str,
    user_input: str,
    round_num: int,
    dialogue_history: list[dict[str, str]],
    compressed_summary: str = "",
) -> list[dict[str, str]]:
    """构建纯教学 prompt：只生成教学内容，不包含评估

    用于方案 A 的并行调用：与评估调用同时发起，生成当前层追问。
    """
    system = _get_layer_prompt(layer)

    user_parts = [f"【知识节点范围】\n{scope_summary}\n"]
    if criteria:
        user_parts.append(f"【本层掌握标准】\n{criteria}\n")
    user_parts.append(f"【常见误解】\n{misconceptions}\n")
    if previous_summary:
        user_parts.append(f"【前层总结】\n{previous_summary}\n")
    if compressed_summary:
        user_parts.append(f"【本层早期对话摘要】\n{compressed_summary}\n")
    user_parts.append(f"【当前轮次】\n第 {round_num} 轮\n")
    if dialogue_history:
        user_parts.append(f"【近期历史对话】\n{_format_dialogue(dialogue_history)}\n")
    user_parts.append(f"【用户最新回答】\n{user_input}\n")
    user_parts.append("请输出 teaching_content（教学内容），不包含 evaluation。")

    return [
        {"role": "system", "content": system},
        {"role": "user", "content": "\n".join(user_parts)},
    ]


def build_evaluation_messages(
    layer: str,
    scope_summary: str,
    criteria: str,
    misconceptions: str,
    previous_summary: str,
    user_input: str,
    round_num: int,
    dialogue_history: list[dict[str, str]],
    compressed_summary: str = "",
) -> list[dict[str, str]]:
    """构建纯评估 prompt：只判断用户是否掌握本层，不生成教学内容

    用于方案 A 的并行调用：与教学调用同时发起。
    """
    system = _EVALUATION_SYSTEM

    user_parts = [f"【知识节点范围】\n{scope_summary}\n"]
    if criteria:
        user_parts.append(f"【本层掌握标准】\n{criteria}\n")
    user_parts.append(f"【常见误解】\n{misconceptions}\n")
    if previous_summary:
        user_parts.append(f"【前层总结】\n{previous_summary}\n")
    if compressed_summary:
        user_parts.append(f"【本层早期对话摘要】\n{compressed_summary}\n")
    user_parts.append(f"【当前轮次】\n第 {round_num} 轮\n")
    if dialogue_history:
        user_parts.append(f"【近期历史对话】\n{_format_dialogue(dialogue_history)}\n")
    user_parts.append(f"【用户最新回答】\n{user_input}\n")
    user_parts.append("请输出 evaluation（评估结果），不包含 teaching_content。")

    return [
        {"role": "system", "content": system},
        {"role": "user", "content": "\n".join(user_parts)},
    ]


def build_merged_messages(
    layer: str,
    scope_summary: str,
    criteria: str,
    misconceptions: str,
    previous_summary: str,
    user_input: str,
    round_num: int,
    dialogue_history: list[dict[str, str]],
    can_evaluate: bool,
    compressed_summary: str = "",
) -> list[dict[str, str]]:
    """构建合并 prompt：一次调用同时产生教学内容和可选评估

    保留用于非评估轮次（前 2 轮），只生成 teaching_content。
    """
    system = _get_layer_prompt(layer)

    user_parts = [f"【知识节点范围】\n{scope_summary}\n"]
    if criteria:
        user_parts.append(f"【本层掌握标准】\n{criteria}\n")
    user_parts.append(f"【常见误解】\n{misconceptions}\n")
    if previous_summary:
        user_parts.append(f"【前层总结】\n{previous_summary}\n")
    if compressed_summary:
        user_parts.append(f"【本层早期对话摘要】\n{compressed_summary}\n")
    user_parts.append(f"【当前轮次】\n第 {round_num} 轮\n")
    if dialogue_history:
        user_parts.append(f"【近期历史对话】\n{_format_dialogue(dialogue_history)}\n")
    user_parts.append(f"【用户最新回答】\n{user_input}\n")
    user_parts.append("请输出 teaching_content（教学内容）。")
    if can_evaluate:
        user_parts.append(
            "当前对话轮次已达评估要求，请额外输出 evaluation（包含 can_advance、reason、summary）。"
        )
    else:
        user_parts.append("当前轮次未达评估要求，请不要输出 evaluation。")

    return [
        {"role": "system", "content": system},
        {"role": "user", "content": "\n".join(user_parts)},
    ]


FALLBACK_TEACHING_CONTENT = "关于这个概念，请先思考它最核心的现象是什么。"
FALLBACK_EVALUATION = {
    "can_advance": False,
    "reason": "LLM 调用异常，无法评估",
    "summary": "",
}
