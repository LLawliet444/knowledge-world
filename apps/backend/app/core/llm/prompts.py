from app.core.models.question import QuestionRequest
from app.core.models.feedback import FeedbackRequest
from app.core.models.final import FinalQuestionRequest


def build_question_messages(req: QuestionRequest) -> list[dict[str, str]]:
    depth_instructions = {
        "how": "问机制、过程、运作方式。句式：「它是如何...」「它的结构是什么？」",
        "why": "问原因、反事实、条件。句式：「为什么...」「如果没有...会怎样？」",
        "system": "问连接、迁移、关系。句式：「这与...有什么关系」「在现实中哪里能见到类似模式？」",
    }
    instruction = depth_instructions.get(req.depth, depth_instructions["how"])

    return [
        {
            "role": "system",
            "content": (
                "你是一名苏格拉底式导师。你通过提问引导学习者自己发现答案。"
                "你的风格：简洁、尖锐、只问不答。\n\n"
                f"当前深度：【{req.depth}】\n{instruction}\n\n"
                "请输出 JSON 格式，包含 question（核心提问）和 followups（2 个追问）。"
            ),
        },
        {
            "role": "user",
            "content": (
                f"节点名称：{req.node_name}\n"
                f"原始谜题：{req.mystery_question}\n"
                f"原文摘要：{req.source_excerpt}\n"
                f"导师引导语：{req.mentor_prompts.get(req.depth, '')}\n\n"
                "请生成 1 个核心提问 + 2 个追问，每句不超过 50 字。"
            ),
        },
    ]


def build_feedback_messages(req: FeedbackRequest) -> list[dict[str, str]]:
    depth_labels = {
        "how": "机制",
        "why": "因果",
        "system": "迁移",
    }
    label = depth_labels.get(req.depth, "机制")

    return [
        {
            "role": "system",
            "content": (
                "你是一名苏格拉底式导师。你的任务是诊断学习者的回答。"
                "输出 JSON，不写额外文字。\n\n"
                "输出结构：\n"
                "{\n"
                '  "feedback_card": {\n'
                '    "understood": ["理解正确的要点（最多2条）"],\n'
                '    "missing": ["缺失或误解的要点（最多2条）"],\n'
                '    "guidance": "引导性提示（≤120字）",\n'
                '    "next_question": "下一步追问"\n'
                "  },\n"
                '  "depth_state": "learning" | "completed",\n'
                '  "covered_dimensions": ["concept" | "logic" | "transfer"]\n'
                "}\n\n"
                "depth_state 判断：completed=覆盖当前深度核心要点，learning=部分理解但有明显缺口。\n"
                "guidance 规则：回答质量高→正向强化；部分理解→方向性提示；严重缺乏→最小必要讲解+追问。"
            ),
        },
        {
            "role": "user",
            "content": (
                f"节点：{req.node_name}\n"
                f"当前深度：{req.depth}（{label}）\n"
                f"原文要点：{req.source_excerpt}\n"
                f"学习者回答：{req.user_answer}\n"
                f"当前轮次：{req.round}/3\n\n"
                "请诊断并输出 JSON。"
            ),
        },
    ]


def build_final_question_messages(req: FinalQuestionRequest) -> list[dict[str, str]]:
    return [
        {
            "role": "system",
            "content": (
                "你是一名最终评审。用户经过四层学习后回来回答同一个核心问题。"
                "你的任务：判断用户回答是否覆盖概念准确、机制完整、原因解释、迁移意识四个维度。\n"
                "输出 JSON，不写额外文字。\n\n"
                "输出结构：\n"
                "{\n"
                '  "passed": true | false,\n'
                '  "coverage": {\n'
                '    "concept_accurate": true | false,\n'
                '    "mechanism_complete": true | false,\n'
                '    "reason_explained": true | false,\n'
                '    "transfer_awareness": true | false\n'
                "  },\n"
                '  "mentor_response": "老学者认可/引导文案（≤80字）"\n'
                "}\n\n"
                "通过规则：至少覆盖 3 个维度为 true。\n"
                "未通过时 mentor_response 为引导性回应，不给出答案。"
            ),
        },
        {
            "role": "user",
            "content": (
                f"节点：{req.node_name}\n"
                f"原始谜题：{req.mystery_question}\n"
                f"原文要点：{req.source_excerpt}\n"
                f"用户回答：{req.user_answer}\n\n"
                "请判断并输出 JSON。"
            ),
        },
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
