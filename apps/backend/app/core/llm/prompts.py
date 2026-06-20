from app.core.prompts.loader import (
    load_evaluation_prompt,
    load_final_answer_prompt,
    load_how_prompt,
    load_why_prompt,
    load_system_layer_prompt,
)

_HOW_SYSTEM = load_how_prompt()
_WHY_SYSTEM = load_why_prompt()
_SYSTEM_LAYER_SYSTEM = load_system_layer_prompt()
_EVALUATION_SYSTEM = load_evaluation_prompt()
_FINAL_ANSWER_SYSTEM = load_final_answer_prompt()


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


# 学习行为信号 → 引导策略（当某信号累积不足时，指导老学者针对性引导）
_SIGNAL_GUIDANCE = {
    "abstraction": "引导用户从当前的具体描述中提炼出一般性规律或抽象概念",
    "transfer": "引导用户把当前概念应用到一个不同的场景或领域（如现代公司、互联网、政治等），让用户自己类比",
    "example": "引导用户主动举一个具体的现实例子来说明当前概念",
    "compression": "引导用户用一句话简短总结当前概念的核心",
}


def _build_signal_guidance(accumulated_signals: dict[str, int] | None) -> str:
    """根据用户薄弱信号生成教学引导提示

    累积次数为 0 的信号视为薄弱，指导老学者在追问中针对性引导。
    """
    if not accumulated_signals:
        return ""
    weak = [sig for sig in _SIGNAL_GUIDANCE if accumulated_signals.get(sig, 0) < 1]
    if not weak:
        return ""
    lines = [f"- {sig}：{_SIGNAL_GUIDANCE[sig]}" for sig in weak]
    return (
        "用户在以下学习行为上尚未展现，请在本次追问中针对性引导（不要直接点明信号名称，自然融入问题）：\n"
        + "\n".join(lines)
    )


def _get_scope_label(layer: str) -> str:
    labels = {
        "how": "本层知识范围 (How) - 机制与过程",
        "why": "本层知识范围 (Why) - 本质与原因",
        "system": "本层知识范围 (System) - 连接与应用",
    }
    return labels.get(layer, "本层知识范围")


# JSON 输出约束（去掉 response_format=json_object 后，用 prompt 约束替代）
_JSON_FORMAT_HINT = (
    "\n输出要求：只输出纯 JSON，不要输出 markdown 代码块、解释文字或任何其他内容。"
)


def build_layer_first_messages(
    layer: str,
    scope_summary: str,
    criteria: str,
    misconceptions: str,
    previous_summary: str,
) -> list[dict[str, str]]:
    """构建进入新层时的第一条 prompt（无用户回答，需要生成第一个教学内容）"""
    system = _get_layer_prompt(layer)

    user_parts = [f"【{_get_scope_label(layer)}】\n{scope_summary}\n"]
    if criteria:
        user_parts.append(f"【本层掌握标准】\n{criteria}\n")
    user_parts.append(f"【常见误解】\n{misconceptions}\n")
    if previous_summary:
        user_parts.append(f"【前层总结】\n{previous_summary}\n")
    user_parts.append("【用户最新回答】\n（首次进入该层，无用户回答）\n")
    user_parts.append("请输出教学内容（teaching_content），不包含 evaluation。")
    user_parts.append(_JSON_FORMAT_HINT)

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
    accumulated_signals: dict[str, int] | None = None,
) -> list[dict[str, str]]:
    """构建纯教学 prompt：只生成教学内容，不包含评估

    用于方案 A 的并行调用：与评估调用同时发起，生成当前层追问。
    accumulated_signals 用于注入薄弱信号引导，让老学者针对性设计问题。
    """
    system = _get_layer_prompt(layer)

    user_parts = [f"【{_get_scope_label(layer)}】\n{scope_summary}\n"]
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
    signal_hint = _build_signal_guidance(accumulated_signals)
    if signal_hint:
        user_parts.append(f"【教学引导提示】\n{signal_hint}\n")
    user_parts.append("请输出 teaching_content（教学内容），不包含 evaluation。")
    user_parts.append(_JSON_FORMAT_HINT)

    return [
        {"role": "system", "content": system},
        {"role": "user", "content": "\n".join(user_parts)},
    ]


def build_evaluation_messages(
    knowledge_node: str,
    user_answer: str,
    dialogue_history: list[dict[str, str]] | None = None,
    compressed_summary: str = "",
) -> list[dict[str, str]]:
    """构建学习行为信号提取 prompt

    LLM 只提取 4 类信号（abstraction/transfer/example/compression，各 0 或 1），
    是否通过评估由后端评分逻辑决定（见 socratic_engine._build_evaluation）。

    上下文策略：
    - 第一次评估（第3轮）：传入完整3轮历史对话，让 LLM 有足够上下文
    - 后续评估：只传当前回答 + 压缩摘要（轻量化，降低 token 与延迟）
    """
    user_parts = [f"【知识主题】\n{knowledge_node}\n"]

    # 历史上下文：优先用完整对话历史（第一次评估），否则用压缩摘要
    if dialogue_history:
        user_parts.append(f"【历史对话】\n{_format_dialogue(dialogue_history)}\n")
    elif compressed_summary:
        user_parts.append(f"【历史对话摘要】\n{compressed_summary}\n")

    user_parts.append(f"【用户最新回答】\n{user_answer}\n")
    user_parts.append(f"请提取学习行为信号。{_JSON_FORMAT_HINT}")

    return [
        {"role": "system", "content": _EVALUATION_SYSTEM},
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
    accumulated_signals: dict[str, int] | None = None,
) -> list[dict[str, str]]:
    """构建合并 prompt：一次调用同时产生教学内容和可选评估

    保留用于非评估轮次（前 2 轮），只生成 teaching_content。
    """
    system = _get_layer_prompt(layer)

    user_parts = [f"【{_get_scope_label(layer)}】\n{scope_summary}\n"]
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
    signal_hint = _build_signal_guidance(accumulated_signals)
    if signal_hint:
        user_parts.append(f"【教学引导提示】\n{signal_hint}\n")
    user_parts.append("请输出 teaching_content（教学内容）。")
    if can_evaluate:
        user_parts.append(
            "当前对话轮次已达评估要求，请额外输出 evaluation（包含 can_advance、reason、summary）。"
        )
    else:
        user_parts.append("当前轮次未达评估要求，请不要输出 evaluation。")
    user_parts.append(_JSON_FORMAT_HINT)

    return [
        {"role": "system", "content": system},
        {"role": "user", "content": "\n".join(user_parts)},
    ]


FALLBACK_TEACHING_CONTENT = "关于这个概念，请先思考它最核心的现象是什么。"


def build_final_answer_messages(
    npc_name: str,
    mystery_question: str,
    user_answer: str,
) -> list[dict[str, str]]:
    """构建原问回响 prompt：NPC 判断用户回答 + 给出点评

    用户已完成四层探索，回到原始问题作答。NPC 以第一人称点评。
    """
    user_content = (
        f"【你的身份】\n你是「{npc_name}」，这个节点的 NPC。\n\n"
        f"【你提出的原始问题】\n{mystery_question}\n\n"
        f"【用户的回答】\n{user_answer}\n\n"
        f"请判断并点评。{_JSON_FORMAT_HINT}"
    )
    return [
        {"role": "system", "content": _FINAL_ANSWER_SYSTEM},
        {"role": "user", "content": user_content},
    ]
