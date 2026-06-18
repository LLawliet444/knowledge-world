# Knowledge World 后端技术方案（产品分支对齐版）

> 目标：按最新 PRD 要求，支撑前端演示的 3 个核心接口。砍掉全部非演示必需的功能与模块。

---

## 1. 交付范围（P0 / P1 / ❌）

| 接口 / 模块 | 是否包含 | 说明 |
|---|---|---|
| How / Why / System 提问 | ✅ P0 | POST /question，带上 depth 区分提问策略 |
| 高阶诊断反馈 | ✅ P0 | POST /feedback，生成四段式反馈卡 |
| 原问回响终问判断 | ✅ P0 | POST /final-question，判断用户是否答对原始谜题 |
| LLM 抽象适配层 | ✅ P0 | LLMAdapter + OpenAI 实现，可切换 |
| 预制世界硬编码 JSON | ❌ | 前端直接 import，后端不提供静态文件服务 |
| PDF 上传 → 生成世界 | ⚠️ P1 | 初赛后置，不阻塞演示 |
| 世界生成引擎 | ⚠️ P1 | 分块/聚类/分类/建结构，初赛后置 |
| SSE 进度推送 / 异步任务 | ❌ | 不做 |
| 存储层 / 数据库 | ❌ | 不做（无状态，世界数据在前端） |
| 用户体系 / 登录 | ❌ | 不做 |
| 徽章系统 / 埋点 | ❌ | 不做 |

**关键设计决策**：What 层（引导对话 + 卷轴阅读 + 轻量确认）由前端直接读取世界 JSON 渲染，后端不参与。后端只负责需要 LLM 动态生成的内容。

---

## 2. 技术栈

| 层 | 选型 | 理由 |
|---|---|---|
| Web 框架 | FastAPI 0.110+ | 异步原生 + 类型提示 + 自动 OpenAPI |
| LLM 接入 | LLMAdapter + OpenAI SDK 1.30+ | 统一接口，切换模型只改配置 |
| 配置 | pydantic-settings 2.2+ | .env 文件加载 |
| 日志 | structlog | 结构化日志，便于排查 LLM 调用链路 |
| 并发 | asyncio（原生） | 3 个接口，不需要 Celery |
| 数据模型 | Pydantic v2 | 请求/响应类型校验 |
| JSON 输出强制 | OpenAI structured_output / JSON mode | 保证反馈卡字段合法 |
| 重试 | tenacity | LLM 调用 3 次指数退避 |

**核心依赖**：`fastapi`, `uvicorn[standard]`, `openai`, `pydantic-settings`, `tenacity`, `structlog`

---

## 3. 目录结构

```
apps/backend/
├── main.py                        # FastAPI 入口：3 个 POST 路由 + CORS
├── requirements.txt
├── .env.example                   # OPENAI_API_KEY / OPENAI_MODEL
└── app/
    ├── config.py                  # Settings（pydantic-settings）
    ├── logging_setup.py           # structlog 初始化
    ├── core/
    │   ├── models/
    │   │   ├── question.py        # /question 请求/响应
    │   │   ├── feedback.py        # /feedback 请求/响应
    │   │   └── final.py           # /final-question 请求/响应
    │   ├── services/
    │   │   ├── question_engine.py # 提问生成：按 depth 选策略
    │   │   ├── feedback_engine.py # 诊断反馈 + 深度完成判断
    │   │   └── final_judge.py     # 原问回响终问判断
    │   └── llm/
    │       ├── adapter.py         # LLMAdapter 抽象基类
    │       ├── openai_adapter.py  # OpenAI 实现
    │       ├── prompts.py         # 所有 Prompt 模板
    │       └── schemas.py         # JSON Schema 定义
```

---

## 4. 与前端的分工边界

| 内容 | 数据来源 | 后端是否参与 |
|---|---|---|
| What 对话 + 卷轴 + 确认 | 世界 JSON（硬编码） | ❌ 纯前端渲染 |
| 小场景素材 | 世界 JSON（introScene 字段） | ❌ 纯前端渲染 |
| 关卡 NPC 头像 + 谜题标题 | 世界 JSON（gateNpc/mysteryQuestion） | ❌ 纯前端渲染 |
| How 提问 | LLM 动态生成 | ✅ POST /question |
| Why 提问 | LLM 动态生成 | ✅ POST /question |
| System 提问 | LLM 动态生成 | ✅ POST /question |
| 诊断反馈 | LLM 动态生成 | ✅ POST /feedback |
| 原问回响终问判断 | LLM 动态生成 | ✅ POST /final-question |
| 深度门禁计算 | 前端 nodeStore | ❌ 前端维护 |
| 第一次迷雾消散提示文案 | 世界 JSON（mentorPrompts） | ❌ 前端直接渲染 |

---

## 5. API 接口设计

### 5.1 POST /api/v1/nodes/{node_id}/question

用于 How / Why / System 三个高阶深度。What 层不使用此接口。

**请求体**：
```json
{
  "node_id": "n001",
  "node_name": "认知革命",
  "depth": "how",
  "mystery_question": "是什么让智人和其他动物不同？",
  "source_excerpt": "约七万年前，智人开始具备虚构故事的能力...",
  "mentor_prompts": {
    "how": "我们已经知道认知革命是什么。现在我们来理解它是如何运作的——虚构故事如何改变人类的协作方式。"
  }
}
```

**响应体**：
```json
{
  "question": "如果没有虚构故事的能力，智人还能组织超过 150 人的大规模协作吗？",
  "followups": [
    "如果人类突然失去虚构故事能力，哪些现代社会组织会立刻崩塌？",
    "虚构故事和"说谎"的本质区别是什么？"
  ]
}
```

**提问策略**：
- `depth=how`：问机制、步骤、过程。"它是如何工作的？""它的结构是什么？"
- `depth=why`：问原因、反事实、底层条件。"为什么这样而不是那样？""如果没有它会怎样？"
- `depth=system`：问跨节点连接、现实迁移。"这与另一概念有什么关系？""在现实中哪里还能看到它？"

### 5.2 POST /api/v1/nodes/{node_id}/feedback

用于 How / Why / System 诊断用户回答。

**请求体**：
```json
{
  "node_id": "n001",
  "node_name": "认知革命",
  "depth": "how",
  "source_excerpt": "约七万年前，智人开始具备虚构故事的能力...",
  "user_answer": "我认为不能，因为超过 150 人需要虚构的故事来建立共同信任...",
  "round": 1
}
```

**响应体**：
```json
{
  "feedback_card": {
    "understood": ["抓住了虚构故事的核心作用", "理解大规模协作的必要性"],
    "missing": ["缺少对 150 人阈值来源的理解", "未考虑亲属关系等非虚构纽带"],
    "guidance": "先确认邓巴数的论证来源，再思考虚构故事出现之前是否有其他协作形式。",
    "next_question": "在虚构故事出现之前，早期人类靠什么维系 100-150 人的部落？"
  },
  "depth_state": "learning",
  "covered_dimensions": ["concept", "logic"]
}
```

**字段说明**：
| 字段 | 类型 | 说明 |
|---|---|---|
| `feedback_card.understood` | string[] | 用户已理解的内容（1-2 条） |
| `feedback_card.missing` | string[] | 缺失或误解的要点（1-2 条） |
| `feedback_card.guidance` | string | 引导性提示或最小必要讲解（≤120 字） |
| `feedback_card.next_question` | string | 下一步追问 |
| `depth_state` | string | `learning` / `completed`。当前深度是否完成 |
| `covered_dimensions` | string[] | 用户回答覆盖的维度：`concept` / `logic` / `transfer` |

**depth_state 判断逻辑**：
- `completed`：回答覆盖该深度核心要点（How 问机制 → 答出结构逻辑；Why 问原因 → 答出因果链条；System 问迁移 → 答出跨领域连接）
- `learning`：理解部分概念但有明显缺口
- 连续 3 轮未达到 `completed`：保留 `learning`，不返回 `completed`

### 5.3 POST /api/v1/nodes/{node_id}/final-question

用于原问回响阶段。同一节点四层全部完成后，关卡 NPC 再次提出原始 `mysteryQuestion`，由后端判断用户回答。

**请求体**：
```json
{
  "node_id": "n001",
  "node_name": "认知革命",
  "mystery_question": "是什么让智人和其他动物不同？",
  "source_excerpt": "约七万年前，智人开始具备虚构故事的能力...",
  "user_answer": "智人具备虚构故事的能力，这让我们能组织大规模协作..."
}
```

**响应体**：
```json
{
  "passed": true,
  "coverage": {
    "concept_accurate": true,
    "mechanism_complete": true,
    "reason_explained": true,
    "transfer_awareness": false
  },
  "mentor_response": "你已经理解了认知革命的核心。虚构故事不只是语言——它让人类得以相信共同的事物，从而在更大规模上协作。这是很深刻的认知。"
}
```

**字段说明**：
| 字段 | 类型 | 说明 |
|---|---|---|
| `passed` | boolean | 用户是否通过终问 |
| `coverage.concept_accurate` | bool | 概念准确 |
| `coverage.mechanism_complete` | bool | 机制完整 |
| `coverage.reason_explained` | bool | 原因解释 |
| `coverage.transfer_awareness` | bool | 迁移意识 |
| `mentor_response` | string | 老学者认可文案（通过时）/ 引导性回应（未通过时，≤80 字） |

**边界规则**：
- `mystery_question` 必须等于该节点预制的原始谜题，后端不另生成新问题
- 用户未通过时 `passed=false`，不触发重试，`mentor_response` 给出引导后结束
- 不提供选择题或选项

---

## 6. LLMAdapter 抽象层

```python
# app/core/llm/adapter.py
from abc import ABC, abstractmethod
from typing import List, Dict, Any

class LLMAdapter(ABC):
    @abstractmethod
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> str:
        """返回纯文本"""
        pass

    @abstractmethod
    async def chat_completion_json(
        self,
        messages: List[Dict[str, str]],
        json_schema: Dict[str, Any],
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> Dict[str, Any]:
        """返回结构化 JSON"""
        pass
```

**切换模型**：新增适配器类（如 `DoubaoAdapter`），在 `main.py` 替换 `LLMAdapter` 实例即可，不动业务代码。

---

## 7. Prompt 设计

### 7.1 提问生成（/question）

```
SYSTEM:
你是一名苏格拉底式导师。你通过提问引导学习者自己发现答案。
你的风格：简洁、尖锐、只问不答。

当前深度：【{depth}】
- how → 问机制、过程、运作方式。句式："它是如何...""它的结构是什么？"
- why → 问原因、反事实、条件。句式："为什么...""如果没有...会怎样？"
- system → 问连接、迁移、关系。句式："这与...有什么关系""在现实中哪里能见到类似模式？"

USER:
节点名称：{node_name}
原始谜题：{mystery_question}
原文摘要：{source_excerpt}
导师引导语：{mentor_prompt}

请生成 1 个核心提问 + 2 个追问，50 字以内。
```

### 7.2 诊断反馈生成（/feedback）

```
SYSTEM:
你是一名苏格拉底式导师。你的任务是诊断学习者的回答，输出 JSON，不写额外文字。

节点：{node_name}
当前深度：{depth}（how=机制/why=因果/system=迁移）
原文要点：{source_excerpt}
学习者回答：{user_answer}
当前轮次：{round}/3

输出 JSON：
{
  "feedback_card": {
    "understood": ["理解正确的要点（最多2条）"],
    "missing": ["缺失或误解的要点（最多2条）"],
    "guidance": "引导性提示（≤120字）",
    "next_question": "下一步追问"
  },
  "depth_state": "learning" | "completed",
  "covered_dimensions": ["concept" | "logic" | "transfer"]
}

depth_state 判断：
- completed：回答覆盖当前深度核心要点
- learning：部分理解但有明显缺口

guidance 规则：
- 回答质量高 → 正向强化
- 部分理解 → 方向性提示
- 严重缺乏 → 最小必要讲解 + 追问（≤120字）
```

### 7.3 原问回响判断（/final-question）

```
SYSTEM:
你是一名最终评审。用户经过四层学习后回来回答同一个核心问题。
你的任务：判断用户回答是否覆盖概念准确、机制完整、原因解释、迁移意识四个维度。
输出 JSON，不写额外文字。

节点：{node_name}
原始谜题：{mystery_question}
原文要点：{source_excerpt}
用户回答：{user_answer}

输出 JSON：
{
  "passed": true | false,
  "coverage": {
    "concept_accurate": true | false,
    "mechanism_complete": true | false,
    "reason_explained": true | false,
    "transfer_awareness": true | false
  },
  "mentor_response": "老学者认可/引导文案（≤80字）"
}

通过规则：至少覆盖 3 个维度为 true。
未通过时 mentor_response 为引导性回应，不给出答案。
```

---

## 8. 输入输出校验策略

| 场景 | 策略 |
|---|---|
| 用户回答超长 | 前端截断 500 字；后端额外校验 `len(user_answer) ≤ 1000` |
| source_excerpt 为空 | 允许，Prompt 降级为通用提问 |
| LLM 返回非合法 JSON | tenacity 重试 2 次；仍失败 → 默认返回 `depth_state="learning"` |
| 字段缺失 / 类型错误 | Pydantic 校验捕获 → 500 + 默认 fallback |
| LLM 超时 | 单次调用 15s 超时；返回 `depth_state="learning"` |
| depth 参数非法 | 返回 422（FastAPI 自动校验） |
| depth=what 调用 /question | 返回 400（What 层不用此接口） |

**关键保障**：无论 LLM 如何崩，后端始终返回前端可解析的合法 JSON（字段名和类型固定）。前端完全不用处理后端异常结构。

---

## 9. 配置文件

```dotenv
# .env
OPENAI_API_KEY=sk-xxxxxxxxxxxx
OPENAI_MODEL=gpt-4o-mini
LLM_TEMPERATURE=0.7

# LLM_PROVIDER=openai              # openai | doubao | deepseek
# DOUBAO_API_KEY=
# DEEPSEEK_API_KEY=
```

---

## 10. 项目估算

| 模块 | 文件 | 估计行数 |
|---|---|---|
| 入口 + CORS + 路由 | main.py | ~60 |
| 配置 + 日志 | config.py / logging_setup.py | ~30 |
| Pydantic 模型 × 3 | models/ | ~80 |
| LLMAdapter 基类 | llm/adapter.py | ~20 |
| OpenAI 实现 | llm/openai_adapter.py | ~40 |
| 提问引擎 | services/question_engine.py | ~40 |
| 反馈引擎 | services/feedback_engine.py | ~50 |
| 终问判断 | services/final_judge.py | ~40 |
| Prompt 模板 | llm/prompts.py | ~80 |
| JSON Schema | llm/schemas.py | ~50 |
| requirements.txt | - | ~10 |
| **总计** | | **~500** |

---

## 11. 启动方式

```bash
cd apps/backend
pip install -r requirements.txt
export OPENAI_API_KEY=sk-xxx
uvicorn main:app --reload --port 8000

# 验证提问接口
curl -X POST http://localhost:8000/api/v1/nodes/n001/question \
  -H "Content-Type: application/json" \
  -d '{"node_id":"n001","node_name":"认知革命","depth":"how","mystery_question":"是什么让智人和其他动物不同？","source_excerpt":"约七万年前...","mentor_prompts":{"how":"..."}}'

# 验证反馈接口
curl -X POST http://localhost:8000/api/v1/nodes/n001/feedback \
  -H "Content-Type: application/json" \
  -d '{"node_id":"n001","node_name":"认知革命","depth":"how","source_excerpt":"约七万年前...","user_answer":"我认为...","round":1}'

# 验证终问接口
curl -X POST http://localhost:8000/api/v1/nodes/n001/final-question \
  -H "Content-Type: application/json" \
  -d '{"node_id":"n001","node_name":"认知革命","mystery_question":"是什么让智人和其他动物不同？","source_excerpt":"约七万年前...","user_answer":"智人具备虚构故事的能力..."}'
```

---

## 12. 与旧版后端方案的差异

| 项 | 旧版（初赛精简版） | 新版（产品分支对齐版） | 原因 |
|---|---|---|---|
| API 接口数 | 2 个 | 3 个 | 新增 `/final-question` 支持原问回响 |
| What 层接口 | 允许调用 /question | **不支持**（返回 400） | What 层改为数据驱动，不走 LLM |
| /question 请求体 | `layer`, `source_excerpt` | `depth`, `mystery_question`, `mentor_prompts` | 对齐新的节点数据契约 |
| /feedback 响应体 | `node_state`（5 态） | `depth_state`（2 态：learning/completed） | 去掉无关状态，聚焦单深度完成判定 |
| /feedback 请求体 | 无 `depth` | 加入 `depth` | 区别提问策略所需 |
| 终问接口 | ❌ 不存在 | ✅ POST /final-question | PRD 新增原问回响机制 |
| Prompt 数量 | 2 组 | 3 组（提问/反馈/终问） | 深度区分 + 终问专用 |
| 服务模块 | `socratic_engine.py` 一个文件 | 拆为 `question_engine` / `feedback_engine` / `final_judge` | 三个职责不同，拆分便于维护 |
| 模型文件 | 1 个 `feedback.py` | 3 个 `question.py`/`feedback.py`/`final.py` | 每个接口独立模型 |
