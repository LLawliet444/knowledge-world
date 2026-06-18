QUESTION_SCHEMA = {
    "type": "object",
    "properties": {
        "question": {"type": "string", "description": "核心提问，50字以内"},
        "followups": {
            "type": "array",
            "items": {"type": "string"},
            "minItems": 2,
            "maxItems": 2,
            "description": "2个追问",
        },
    },
    "required": ["question", "followups"],
}

FEEDBACK_SCHEMA = {
    "type": "object",
    "properties": {
        "feedback_card": {
            "type": "object",
            "properties": {
                "understood": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "理解正确的要点（最多2条）",
                },
                "missing": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "缺失或误解的要点（最多2条）",
                },
                "guidance": {
                    "type": "string",
                    "description": "引导性提示或最小必要讲解（≤120字）",
                },
                "next_question": {"type": "string", "description": "下一步追问"},
            },
            "required": ["understood", "missing", "guidance", "next_question"],
        },
        "depth_state": {
            "type": "string",
            "enum": ["learning", "completed"],
            "description": "当前深度是否完成",
        },
        "covered_dimensions": {
            "type": "array",
            "items": {"type": "string", "enum": ["concept", "logic", "transfer"]},
            "description": "回答覆盖的认知维度",
        },
    },
    "required": ["feedback_card", "depth_state", "covered_dimensions"],
}

FINAL_QUESTION_SCHEMA = {
    "type": "object",
    "properties": {
        "passed": {"type": "boolean"},
        "coverage": {
            "type": "object",
            "properties": {
                "concept_accurate": {"type": "boolean"},
                "mechanism_complete": {"type": "boolean"},
                "reason_explained": {"type": "boolean"},
                "transfer_awareness": {"type": "boolean"},
            },
            "required": [
                "concept_accurate",
                "mechanism_complete",
                "reason_explained",
                "transfer_awareness",
            ],
        },
        "mentor_response": {
            "type": "string",
            "description": "老学者认可或引导文案（≤80字）",
        },
    },
    "required": ["passed", "coverage", "mentor_response"],
}
