# Knowledge World 后端技术方案（初赛精简版）

> 目标：支撑前端演示的 2 个核心接口。砍掉全部非演示必需的功能与模块。

---

## 1. 交付范围

| 接口 / 模块 | 是否包含 | 说明 |
|---|---|---|
| AI 苏格拉底提问 | ✅ | POST /question（节点首次进入） |
| AI 诊断反馈 | ✅ | POST /feedback（用户提交回答） |
| LLM 抽象适配层 | ✅ | LLMAdapter + OpenAI 实现（可切换豆包/DeepSeek） |
| PDF 上传 → 生成世界 | ⚠️ | 初赛后置，不阻塞演示 |
| 世界 CRUD API | ❌ | 不做（世界挪到前端硬编码） |
| 文件解析（PDF/TXT/MD）| ❌ | 初赛不做 |
| 世界生成引擎（分块/聚类/分类）| ❌ | 初赛不做 |
| SSE 进度推送 / 异步任务 | ❌ | 不做 |
| 存储层 / 数据库 | ❌ | 不做（无状态） |
| 用户体系 / 登录 | ❌ | 不做 |
| 徽章系统 | ❌ | 不做 |
| 埋点 / 日志分析 | ❌ | 仅基础日志 |

---

## 2. 技术栈

| 层 | 选型 | 理由 |
|---|---|---|
| Web 框架 | FastAPI 0.110 | 异步原生 + 类型提示 + 自动 OpenAPI |
| LLM 接入 | 自研 LLMAdapter + OpenAI SDK 1.30+ | 统一接口封装，切换模型只改配置 |
| 配置 | pydantic-settings 2.2 | .env 文件加载（OPENAI_API_KEY 等） |
| 日志 | structlog | 结构化日志，方便排查 LLM 调用链路 |
| 并发 | asyncio（原生） | 2 个接口，不需要 Celery |
| 数据模型 | Pydantic v2 | 请求/响应类型校验，与前端 TS 类型一一对应 |
| JSON 输出强制 | OpenAI structured_output / JSON mode | 保证反馈卡字段合法，前端不崩 |
| 重试 | tenacity | LLM 调用 3 次指数退避 |

**核心依赖**：`fastapi`, `uvicorn[standard]`, `openai`, `pydantic-settings`, `tenacity`, `structlog`

---

## 3. 目录结构

```
apps/backend/
├── main.py                        # FastAPI 入口（2 个 POST 路由 + CORS 配置）
├── requirements.txt
├── .env.example                   # OPENAI_API_KEY / OPENAI_MODEL / LLM_PROVIDER
└── app/
    ├── config.py                  # Settings（pydantic-settings 加载 .env）
    ├── logging_setup.py           # structlog 初始化
    ├── core/
    │   ├── models/
    │   │   └── feedback.py        # 请求/响应 Pydantic 模型
    │   ├── services/
    │   │   └── socratic_engine.py # 核心逻辑：生成提问 + 生成反馈
    │   └── llm/
    │       ├── adapter.py         # LLMAdapter 抽象基类
    │       ├── openai_adapter.py  # OpenAI 实现（JSON mode + 重试）
    │       ├── prompts.py         # 提问 Prompt 模板 + 诊断反馈 Prompt 模板
    │       └── schemas.py         # LLM 输出 JSON Schema（结构化输出约束）
```

---

## 4. LLM 抽象层设计

```python
# app/core/llm/adapter.py
class LLMAdapter(ABC):
    @abstractmethod
    async def chat_completion(self, messages: List[Dict[str, str]],
                             temperature: float = 0.7, max_tokens: int = 512) -> str:
        """返回纯文本"""
        pass

    @abstractmethod
    async def chat_completion_json(self, messages: List[Dict[str, str]],
                                    json_schema: Dict[str, Any],
                                    temperature: float = 0.7,
                                    max_tokens: int = 1024) -> Dict[str, Any]:
        """返回结构化 JSON（用于反馈卡输出）"""
        pass
```

**切换模型**：只需新增 `doubao_adapter.py` / `deepseek_adapter.py`，在 `main.py` 替换实例即可，不动业务代码。

---

## 5. Prompt 结构

### 5.1 苏格拉底提问（System + User）

```
SYSTEM:
你是一名苏格拉底式导师。你从不直接给答案，而是通过提问引导学习者自己发现答案。
你的风格：简洁、尖锐、关注推理链。

USER:
学习者正在探索节点【{node_name}】
该节点属于【{layer}】认知层级（what=是什么，how=结构如何，why=为什么如此，system=系统关联）
原文摘要：{source_excerpt}

请生成 1 个苏格拉底式核心提问。
规则：
- 用"为什么 / 如果...会怎样 / 这与...有什么关系"句式
- 不直接给结论，不提供选项
- 问题要能激发深度思考，而不是事实复述
- 50 字以内
```

### 5.2 诊断反馈（System + User + JSON Schema）

```
SYSTEM:
你是一名苏格拉底式导师。你的任务是诊断学习者的回答，指出理解缺陷，并给出下一步最优问题。
你必须严格以 JSON 输出，不写任何额外文字。

USER:
节点：{node_name}
层级：{layer}
原文摘要：{source_excerpt}
学习者回答：{user_answer}
当前轮次：{round} / 3

请诊断并输出以下 JSON 结构（严格遵守字段名与类型）：
{
  "cognitive_level": "what|how|why|system",
  "covered_dimensions": ["concept"|"logic"|"transfer", ...],
  "main_misconception": "一句话描述最大误区",
  "missing_points": ["缺失要点1", "缺失要点2"],
  "next_best_question": "下一步追问（苏格拉底式）",
  "feedback_level": "reinforce|hint|minimal_explain",
  "feedback_card": {
    "understood": ["理解正确的要点"],
    "missing": ["缺失/误解的要点"],
    "guidance": "一句话引导性提示（≤120字）",
    "next_question": "与 next_best_question 相同"
  },
  "node_state": "visited|learning|mastered|transfer"
}

node_state 判断规则：
- mastered：覆盖核心概念 + 逻辑链条完整
- transfer：能举例迁移或类比
- learning：理解部分概念但有明显缺口
- visited：几乎没理解，但愿意继续

feedback_level 规则：
- reinforce：回答质量高，给予正向反馈
- hint：部分理解，给出方向性提示
- minimal_explain：严重缺乏理解，给予最小必要讲解 + 引导
```

---

## 6. API 接口

### 6.1 POST /api/v1/nodes/{node_id}/question

**请求体**：
```json
{
  "node_id": "n001",
  "node_name": "认知革命",
  "layer": "what",
  "source_excerpt": "约七万年前，智人开始..."
}
```

**响应体**：
```json
{
  "question": "如果没有虚构故事的能力，智人还能组织超过 150 人的大规模协作吗？"
}
```

### 6.2 POST /api/v1/nodes/{node_id}/feedback

**请求体**：
```json
{
  "node_id": "n001",
  "node_name": "认知革命",
  "source_excerpt": "约七万年前，智人开始...",
  "user_answer": "我认为不能，因为超过 150 人后需要虚构的故事来建立信任...",
  "round": 1
}
```

**响应体**：（严格匹配前端 `DiagnosticResponse` 类型）
```json
{
  "cognitive_level": "how",
  "covered_dimensions": ["concept", "logic"],
  "main_misconception": "未考虑非虚构的其他纽带（如亲属关系、威胁）",
  "missing_points": ["缺少对 '150 人阈值' 的具体论证", "未提及反例"],
  "next_best_question": "在虚构故事出现之前，早期人类靠什么维系 100-150 人的部落？",
  "feedback_level": "hint",
  "feedback_card": {
    "understood": ["抓住了虚构故事的核心作用", "理解了大规模协作的必要性"],
    "missing": ["缺少对 150 人阈值来源的理解", "未考虑亲属关系等非虚构纽带"],
    "guidance": "先确认 150 人阈值的论证来源（邓巴数），再思考：虚构故事之前，是否已有其他协作形式？",
    "next_question": "在虚构故事出现之前，早期人类靠什么维系 100-150 人的部落？"
  },
  "node_state": "learning"
}
```

---

## 7. 输入输出校验策略

| 场景 | 策略 |
|---|---|
| 用户回答过长 | 前端截断 500 字；后端额外校验 `len(user_answer) ≤ 1000` |
| source_excerpt 过短 | 允许空字符串（Prompt 自动降级为通用提问） |
| LLM 返回非合法 JSON | tenacity 重试 2 次；仍失败 → 按默认结构返回（`node_state="learning"`） |
| LLM 字段缺失 | Pydantic 校验捕获异常 → 返回错误码 500 + 默认 fallback |
| LLM 超时 | 单次调用 15s 超时；`feedback_level="hint"` + 文本提示"AI 响应超时" |

**关键保障**：无论 LLM 如何崩，后端始终返回前端可解析的 JSON 对象（字段类型正确）。前端完全不用处理后端返回结构异常。

---

## 8. 配置文件

```dotenv
# .env
OPENAI_API_KEY=sk-xxxxxxxxxxxx
OPENAI_MODEL=gpt-4o-mini            # 4o-mini 够用且便宜，调试快
LLM_TEMPERATURE=0.7                 # 生成时需要一些创造力

# 可选：切换模型时用
# LLM_PROVIDER=openai                # openai | doubao | deepseek
# DOUBAO_API_KEY=...
# DEEPSEEK_API_KEY=...
```

---

## 9. 启动方式

```bash
# 开发环境
cd apps/backend
pip install -r requirements.txt
export OPENAI_API_KEY=sk-xxx        # 或放到 .env
uvicorn main:app --reload --port 8000

# 验证
curl -X POST http://localhost:8000/api/v1/nodes/n001/question \
  -H "Content-Type: application/json" \
  -d '{"node_id":"n001","node_name":"认知革命","layer":"what","source_excerpt":"约七万年前..."}'
```

---

## 10. 与完整版的差异对比

| 项 | 初赛版 | 完整版（后续） |
|---|---|---|
| API 接口数 | 2 个 | 5+ 个（含上传/生成/列表/删除） |
| 文件解析 | 无 | PDF / TXT / MD 解析 |
| 世界生成引擎 | 无 | 分块 + 概念抽取 + 聚类 + 分类 + 建结构 |
| SSE / 异步任务 | 无 | 上传生成进度推送 |
| 存储层 | 无（无状态） | JSON 文件 / SQLite |
| 用户体系 | 无 | 待定 |
| 模型切换 | 仅 OpenAI | 豆包 / DeepSeek 多模型可选 |
| 并发控制 | 无 | 每用户并发生成 ≤1 |
| 日志/监控 | structlog（终端） | 接入 Sentry + 日志分析 |
