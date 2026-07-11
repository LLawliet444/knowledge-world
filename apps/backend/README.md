# Knowledge World Backend

认知探索系统后端 —— 苏格拉底式教学引导 + 状态机管理。

后端基于 **FastAPI**，核心职责：

1. **会话管理**：基于 Redis 的 session 状态机，进程重启不丢失
2. **苏格拉底引擎**：根据用户回答生成教学引导 + 学习行为信号评估
3. **层级推进**：What → How → Why → System 四层认知模型的状态推进
4. **终问判断**：节点四层全通后，用户回答 NPC 原始问题时由 LLM 判对错

后端不回答用户问题，而是持续制造能推动理解前进的问题。

## 技术栈

- **FastAPI** ≥ 0.110 —— 异步 Web 框架
- **uvicorn[standard]** ≥ 0.29 —— ASGI 服务器
- **pydantic** ≥ 2.6 + **pydantic-settings** ≥ 2.2 —— 数据校验与配置
- **openai** ≥ 1.30 —— OpenAI 兼容 LLM 客户端
- **tenacity** ≥ 8.2 —— LLM 调用重试
- **structlog** ≥ 24.1 —— 结构化日志
- **redis** ≥ 5.0 —— 会话状态持久化

## 目录结构

```
backend/
├── main.py                         # FastAPI 入口，路由定义
├── requirements.txt
├── .env.example
└── app/
    ├── config.py                   # pydantic-settings 配置（读取 .env）
    ├── logging_setup.py            # structlog 日志配置
    └── core/
        ├── trace.py                # 请求追踪 ID（trace_id）
        ├── trace_middleware.py     # 注入 trace_id 中间件
        ├── llm/
        │   ├── adapter.py          # LLMAdapter 抽象接口
        │   ├── openai_adapter.py   # OpenAI 兼容实现
        │   └── prompts.py          # 各层 prompt 构造函数
        ├── models/
        │   ├── session.py          # SessionState 状态机 + 序列化
        │   └── interact.py         # 请求/响应 pydantic 模型
        ├── prompts/                 # 层级 prompt markdown 模板
        │   ├── system_layer.md
        │   ├── how.md
        │   ├── why.md
        │   ├── evaluation.md
        │   ├── final_answer.md
        │   └── loader.py           # 加载并缓存 md 模板
        ├── services/
        │   ├── session_manager.py  # Redis 会话管理
        │   ├── socratic_engine.py  # 苏格拉底引擎（教学+评估）
        │   └── node_scope_loader.py # 加载节点知识范围
        └── data/
            └── sapiens/            # 7 个节点知识范围 JSON
                ├── n001.json
                ├── ...
                └── n007.json
```

## 快速开始

### 1. 环境准备

```bash
cd apps/backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

### 2. 启动 Redis

```bash
# 本地 Redis（默认 redis://localhost:6379/0）
redis-server
```

### 3. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env，填入 OpenAI API Key
```

`.env` 字段：

| 字段 | 说明 | 默认值 |
|---|---|---|
| `OPENAI_BASE_URL` | OpenAI 兼容 API 地址 | `https://api.openai.com/v1` |
| `OPENAI_API_KEY` | API Key | — |
| `OPENAI_MODEL` | 模型名 | `gpt-4o-mini` |
| `REDIS_URL` | Redis 连接串 | `redis://localhost:6379/0` |
| `SESSION_TTL_SECONDS` | session 过期时间 | `604800`（7 天） |

### 4. 启动服务

```bash
python main.py
# 或
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

服务启动在 `http://localhost:8001`，API 文档访问 `/docs`。

## API 接口

所有接口前缀 `/api/v1`。

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/health` | 健康检查 |
| POST | `/sessions` | 创建学习会话，返回 `session_id` |
| GET | `/sessions/{session_id}/status` | 获取会话状态（刷新页面时恢复进度） |
| POST | `/sessions/{session_id}/nodes/{node_id}/enter` | 进入节点，初始化状态机，返回 How 层首问 |
| POST | `/sessions/{session_id}/nodes/{node_id}/answer` | 提交回答，后端生成教学+评估并推进状态机 |
| POST | `/sessions/{session_id}/nodes/{node_id}/final-answer` | 终问：System 层全通后回答 NPC 原始问题 |

### 核心流程

```
create_session → 拿到 session_id
    ↓
enter_node(node_id) → 后端加载 node scope，初始化 How 层，返回首问
    ↓
answer(user_input) ──┬── round < 3：只生成 teaching（追问），不评估
                      └── round >= 3：并行 teaching + evaluation
                            ├── can_advance=False → 继续追问
                            └── can_advance=True  → 推进到下一层
                                                      ↓
                                  How → Why → System → node_completed=True
                                                      ↓
                                  final-answer → LLM 判对错 → 归档解锁下一节点
```

### 学习行为信号评估

LLM 不直接判分，而是输出 4 个学习行为信号（各 0 或 1）：

| 信号 | 含义 | 权重 |
|---|---|---|
| abstraction | 抽象（提炼一般规律） | 2 |
| transfer | 迁移（应用到其他场景） | 3 |
| example | 举例（给出具体例子） | 2 |
| compression | 压缩（一句话总结） | 1 |

后端累加各信号出现次数，加权计算 `score`，达到阈值 `8` 即 `can_advance=True`（推进下一层）。这种设计让 AI 评估聚焦于"用户展现了哪些学习行为"而非主观打分，可解释性更强。

## 会话状态机

`SessionState` 定义在 [session.py](app/core/models/session.py)：

- **current_layer**：`how` → `why` → `system`（每完成一层推进）
- **current_round**：当前层对话轮数（前 2 轮不评估，第 3 轮起开始评估）
- **layer_dialogue**：当前层完整对话历史
- **layer_summaries**：每完成一层的总结
- **layer_records**：每层完整记录（对话+压缩摘要+信号+得分+总结）
- **layer_signals**：当前层累积的学习行为信号
- **compressed_summary**：长对话压缩摘要（滑动窗口超限时触发）
- **node_history**：已完成节点的归档记录
- **node_completed** / **final_question_completed** / **final_question_verdict**：节点完成状态

状态以 JSON 存入 Redis，key 为 `kw:session:{session_id}`，TTL 7 天，每次写入刷新。

## 节点知识范围

`app/data/sapiens/n00X.json` 定义每个节点的：

- `node_name` / `npc_name` / `mystery_question`：节点基本信息与原始谜题
- `scope`：通用知识范围
- `scope_by_layer`：按 How / Why / System 层划分的精确范围
- `criteria_by_layer`：各层通过标准
- `misconceptions`：常见误区（喂给 LLM 避免引导错误）

## 日志

使用 `structlog` 结构化日志，每条日志带 `trace_id`（由 `TraceMiddleware` 注入），串联一次请求的所有处理步骤。日志同时输出到控制台和文件。

## 开发说明

- Redis 操作用同步客户端（`redis-py`）。在 async route 中同步调用 Redis 可接受（操作通常 <1ms，远小于 LLM 调用）
- LLM 调用失败有 fallback：teaching 失败返回兜底文案，evaluation 失败返回 `None`（不推进层），保证流程不中断
- `enter_node` 支持同节点恢复（返回 Redis 中的完整对话历史）和跨节点切换（归档当前节点）
- 详细设计文档见 `docs/backend-tech-design.md` 和 `docs/api-docs.md`