# Knowledge World API 接口文档

> 后端版本：0.3.0 | 基础 URL：`http://localhost:8000` | 协议：HTTP/JSON

---

## 目录

1. [通用约定](#1-通用约定)
2. [健康检查](#2-健康检查)
3. [创建学习会话](#3-创建学习会话)
4. [获取会话状态](#4-获取会话状态)
5. [获取节点问题](#5-获取节点问题)
6. [提交回答](#6-提交回答)
7. [状态机流转说明](#7-状态机流转说明)
8. [数据模型](#8-数据模型)
9. [错误码](#9-错误码)

---

## 1. 通用约定

### 1.1 基础地址

```text
http://localhost:8000
```

### 1.2 请求格式

所有 POST 请求使用 `Content-Type: application/json`。

### 1.3 响应格式

成功返回 `200 OK`。错误返回统一 JSON：

```json
{
  "detail": "错误描述"
}
```

### 1.4 CORS

全开放 CORS（开发阶段），所有来源和方法均允许。

### 1.5 对话流程概要

```text
Step 1: POST /sessions            → 创建会话，拿到 session_id
Step 2: POST /sessions/{id}/nodes/{nid}/enter  → 获取节点问题（新建=how首问 / 恢复=当前层最后AI消息）
Step 3: POST /sessions/{id}/nodes/{nid}/answer  → 用户回答，返回下一轮引导（循环）
Step 4: GET  /sessions/{id}/status  → 刷新页面后恢复对话状态

状态机自动流转：how → why → system → completed
每层至少 3 轮对话后方可进入下一层
会话状态持久化在 Redis，TTL 7 天，进程重启不丢失
```

### 1.6 会话存储

会话状态（SessionState）持久化在 Redis 中：

- **Key 格式**：`kw:session:{session_id}`
- **存储格式**：JSON 字符串
- **TTL**：7 天（`SESSION_TTL_SECONDS` 可配置），每次写入刷新
- **进程重启不丢失**：服务重启后 session 仍可用
- **多实例共享**：多 worker / 多实例部署时 session 跨实例共享

---

## 2. 健康检查

### GET /api/v1/health

**请求示例**：

```bash
curl http://localhost:8000/api/v1/health
```

**响应**：

```json
{
  "status": "ok"
}
```

---

## 3. 创建学习会话

### POST /api/v1/sessions

创建一次学习会话。返回 `session_id`，后续所有接口需携带此 ID。

**请求体**：无

**响应字段**：

| 字段 | 类型 | 说明 |
|---|---|---|
| `session_id` | string | 会话 ID，格式 `sess_xxxxxxxxxxxx` |

**请求示例**：

```bash
curl -X POST http://localhost:8000/api/v1/sessions
```

**响应示例**：

```json
{
  "session_id": "sess_a1b2c3d4e5f6"
}
```

---

## 4. 获取会话状态

### GET /api/v1/sessions/{session_id}/status

前端刷新页面后调用，从 Redis 恢复当前节点状态和最后一次问答，无需重新进入节点。

**路径参数**：

| 参数 | 说明 |
|---|---|
| `session_id` | 会话 ID |

**响应字段**：

| 字段 | 类型 | 说明 |
|---|---|---|
| `session_id` | string | 会话 ID |
| `node_id` | string \| null | 当前节点 ID；未进入节点时为 null |
| `current_layer` | string \| null | 当前层（`how`/`why`/`system`）；未进入节点时为 null |
| `current_round` | int | 当前层已回答次数 |
| `node_completed` | bool | 节点是否全部完成 |
| `last_ai_question` | string | 最后一次 AI 问题（核心问题文本） |
| `last_user_answer` | string | 最后一次用户回答 |

**请求示例**：

```bash
curl http://localhost:8000/api/v1/sessions/sess_a1b2c3d4e5f6/status
```

**响应示例（对话进行中）**：

```json
{
  "session_id": "sess_a1b2c3d4e5f6",
  "node_id": "n001",
  "current_layer": "how",
  "current_round": 1,
  "node_completed": false,
  "last_ai_question": "虚构故事是如何让陌生人之间产生信任的？",
  "last_user_answer": "虚构故事让陌生人有了共同信仰"
}
```

**响应示例（刚进入节点，尚未回答）**：

```json
{
  "session_id": "sess_a1b2c3d4e5f6",
  "node_id": "n001",
  "current_layer": "how",
  "current_round": 0,
  "node_completed": false,
  "last_ai_question": "为什么人类能与成千上万个陌生人合作？",
  "last_user_answer": ""
}
```

**响应示例（未进入任何节点）**：

```json
{
  "session_id": "sess_a1b2c3d4e5f6",
  "node_id": null,
  "current_layer": null,
  "current_round": 0,
  "node_completed": false,
  "last_ai_question": "",
  "last_user_answer": ""
}
```

**前端使用建议**：

- 页面加载时调用此接口，根据 `node_id` / `current_layer` 恢复 UI 状态
- 用 `last_ai_question` 渲染对话区最后一条 AI 消息
- 用 `last_user_answer` 渲染对话区最后一条用户消息（若为空则只显示 AI 问题）
- `node_completed=true` 时直接展示完成态

**错误**：

| 状态码 | 说明 |
|---|---|
| `404` | session_id 不存在或已过期 |

---

## 5. 获取节点问题

### POST /api/v1/sessions/{session_id}/nodes/{node_id}/enter

获取节点当前要展示的问题。前端每次进入节点 UI（how / why / system 任意层）都调用此接口，后端根据 Redis 中的状态自动判断是新建还是恢复：

- **首次进入 / 换节点**：重置状态机到 how 层，调用 LLM 生成 how 首问，存入对话历史
- **同节点恢复**：读 Redis 当前层，**不调用 LLM**，直接返回对话历史里最后一条 AI 消息
- **节点已完成**：返回 409

该接口是幂等的，可安全重复调用，不会丢失进度也不会重复消耗 LLM。

**路径参数**：

| 参数 | 说明 |
|---|---|
| `session_id` | 会话 ID |
| `node_id` | 节点 ID，可选值：`n001` — `n007` |

**可用节点**：

| node_id | 节点名称 | NPC |
|---|---|---|
| `n001` | 认知革命 | 讲故事的人 |
| `n002` | 农业革命 | 田野老者 |
| `n003` | 货币的诞生 | 商人 |
| `n004` | 想象的秩序 | 律法师 |
| `n005` | 资本主义与法律虚构 | 银行家 |
| `n006` | 帝国的崛起 | 旅人 |
| `n007` | 科学革命 | 探索者 |

**响应字段**：

| 字段 | 类型 | 说明 |
|---|---|---|
| `current_layer` | string | 当前层：`"how"` / `"why"` / `"system"`（取决于 Redis 中的进度） |
| `layer_index` | int | 层索引：`0` = how, `1` = why, `2` = system |
| `total_layers` | int | 总层数，固定 `3` |
| `teaching_content` | object | 教学内容 |
| `teaching_content.format` | string | 格式：how 层为 `"guided_question"`；why/system 层为 `"essence"` / `"model"` |
| `teaching_content.opening` | string \| null | 开场引导语（仅新建 how 首问时有值；恢复时为 null） |
| `teaching_content.core_question` | string \| null | 核心问题（仅新建 how 首问时有值；恢复时为 null） |
| `teaching_content.thinking_direction` | string \| null | 思考方向（仅新建 how 首问时有值；恢复时为 null） |
| `teaching_content.content` | string \| null | why/system 层文本内容；恢复时（任意层）存放对话历史里最后一条 AI 消息 |
| `evaluation` | null | 固定为 `null`（评估在 answer 接口返回） |

**请求示例**：

```bash
curl -X POST http://localhost:8000/api/v1/sessions/sess_a1b2c3d4e5f6/nodes/n001/enter
```

**响应示例 A — 首次进入节点（新建，how 层）**：

```json
{
  "current_layer": "how",
  "layer_index": 0,
  "total_layers": 3,
  "teaching_content": {
    "format": "guided_question",
    "opening": "欢迎来到这一层，我们将探讨智人如何通过虚构故事实现大规模协作。",
    "core_question": "虚构故事是如何让陌生人之间产生信任的？",
    "thinking_direction": "想象一个原始部落，他们通过共同的神话和传说来团结，你能描述这种团结如何产生信任吗？",
    "content": null
  },
  "evaluation": null
}
```

**响应示例 B — 同节点恢复（已到 system 层，不调 LLM）**：

```json
{
  "current_layer": "system",
  "layer_index": 2,
  "total_layers": 3,
  "teaching_content": {
    "format": "model",
    "opening": null,
    "core_question": null,
    "thinking_direction": null,
    "content": "现在让我们把前面的推导整合起来，构建一个完整的认知模型……"
  },
  "evaluation": null
}
```

> **注意**：恢复场景下 `teaching_content` 只用 `content` 字段返回对话历史里最后一条 AI 消息，`opening` / `core_question` / `thinking_direction` 均为 null（结构化字段无法从历史文本还原）。前端用 `content` 渲染即可。

**错误**：

| 状态码 | 说明 |
|---|---|
| `404` | session_id 不存在 |
| `404` | node_id 不存在（非 n001-n007） |
| `409` | 该节点已在当前会话中完成 |

---

## 6. 提交回答

### POST /api/v1/sessions/{session_id}/nodes/{node_id}/answer

每次用户回答后调用。后端做两件事：
1. **教学**：根据当前层 prompt + 节点范围 + 历史对话，生成下一轮引导内容
2. **评估**：如果轮次 ≥ 3，LLM 同时判断用户是否掌握本层，自动推进状态机

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `user_input` | string | 是 | 用户本次的回答，最长 1000 字 |

**响应字段**：

| 字段 | 类型 | 说明 |
|---|---|---|
| `session_id` | string | 会话 ID |
| `node_id` | string | 当前节点 ID |
| `current_layer` | string | 当前层（推进后可能是新层） |
| `current_round` | int | 当前层轮次计数 |
| `can_advance` | bool | 是否通过了本层评估 |
| `node_completed` | bool | 节点是否全部完成 |
| `layer_summary` | string | can_advance=true 时，本层完成总结（≤60 字） |
| `teaching_content` | object \| null | 下一轮教学内容（节点完成时为 null） |
| `teaching_content.format` | string | 格式：`"guided_question"` / `"essence"` / `"model"` |
| `teaching_content.opening` | string \| null | how 层有值；why/system 层为 null |
| `teaching_content.core_question` | string \| null | how 层有值；why/system 层为 null |
| `teaching_content.thinking_direction` | string \| null | how 层有值；why/system 层为 null |
| `teaching_content.content` | string \| null | why/system 层有值；how 层为 null |
| `evaluation` | object \| null | 评估结果（轮次 < 3 时为 null） |
| `evaluation.can_advance` | bool | 是否可以推进到下一层 |
| `evaluation.reason` | string | 判断理由 |
| `evaluation.summary` | string | 本层达成总结，传递给下一层 |

**请求示例（轮次 1，未达评估门槛）**：

```bash
curl -X POST http://localhost:8000/api/v1/sessions/sess_a1b2c3/nodes/n001/answer \
  -H "Content-Type: application/json" \
  -d '{"user_input": "人类更聪明所以胜出"}'
```

**响应示例（how 层，can_advance=false，继续追问）**：

```json
{
  "session_id": "sess_a1b2c3",
  "node_id": "n001",
  "current_layer": "how",
  "current_round": 1,
  "can_advance": false,
  "node_completed": false,
  "layer_summary": "",
  "teaching_content": {
    "format": "guided_question",
    "opening": "「更聪明」是一个直觉判断，但我们需要更精确地分析。",
    "core_question": "如果仅仅是因为更聪明，那为什么黑猩猩、海豚、大象这些同样聪明的动物，没有建立起城市和国家？",
    "thinking_direction": "比较人类和这些聪明动物在群体规模上的差异，想想除了智力之外还有什么能力是人类独有的。",
    "content": null
  },
  "evaluation": null
}
```

**请求示例（轮次 ≥ 3，触发评估）**：

```bash
curl -X POST http://localhost:8000/api/v1/sessions/sess_a1b2c3/nodes/n001/answer \
  -H "Content-Type: application/json" \
  -d '{"user_input": "虚构故事让陌生人之间有了共同的信仰和规则，这样即使不认识的人也能互相信任并合作"}'
```

**响应示例（can_advance=true，推进到下一层）**：

```json
{
  "session_id": "sess_a1b2c3",
  "node_id": "n001",
  "current_layer": "why",
  "current_round": 0,
  "can_advance": true,
  "node_completed": false,
  "layer_summary": "用户理解了虚构故事通过建立共同信任让陌生人协作",
  "teaching_content": {
    "format": "essence",
    "content": "规律一：协作规模 = 信任半径\n信任半径越大的群体，能够协作的规模越大。血缘的信任半径约 150 人，共同虚构的信任半径可以无限延伸。\n\n规律二：虚构降低信任成本\n不需要逐一验证对方是否可信，只要都相信同一个虚构故事，信任就自动建立。\n\n【关键追问】\n如果信任可以靠虚构来建立，那么「真相」在人类协作中到底扮演了多大的角色？"
  },
  "evaluation": {
    "can_advance": true,
    "reason": "用户能准确描述虚构故事到协作的完整过程，覆盖了how层掌握标准",
    "summary": "用户理解了虚构故事通过建立共同信任让陌生人协作"
  }
}
```

**响应示例（节点全部完成）**：

```json
{
  "session_id": "sess_a1b2c3",
  "node_id": "n001",
  "current_layer": "system",
  "current_round": 4,
  "can_advance": true,
  "node_completed": true,
  "layer_summary": "用户构建了虚构故事驱动协作的完整认知模型",
  "teaching_content": null,
  "evaluation": {
    "can_advance": true,
    "reason": "用户能整合三层理解并迁移到现代场景",
    "summary": "用户对认知革命形成了结构化认知"
  }
}
```

**错误**：

| 状态码 | 说明 |
|---|---|
| `404` | session_id 不存在 |
| `400` | session 不在该节点中（node_id 不匹配） |
| `404` | node_id 不存在 |
| `422` | 请求体 JSON 校验失败（user_input 超长等） |

---

## 7. 状态机流转说明

### 7.1 层定义

| 层 | 认知目标 | System Prompt 结构 | 输出 format | 结构化字段 |
|---|---|---|---|---|
| **how** | 机制理解 | 苏格拉底式提问，引导用户推导机制 | `"guided_question"` | `opening` / `core_question` / `thinking_direction` |
| **why** | 本质抽象 | 提炼 1-3 个跨场景规律 + 关键追问 | `"essence"` | `content` |
| **system** | 体系建模 | 整合前三层为结构化模型 | `"model"` | `content` |

### 7.2 流转规则

```
what(前端) ──enter──→ how ──(3+ 轮 + 评估通过)──→ why ──(通过)──→ system ──(通过)──→ 完成
```

- **enter 接口**幂等：首次进入/换节点→新建 how；同节点→恢复当前层（读 Redis，不调 LLM）
- 每层**至少满 3 轮**后才触发 LLM 评估
- LLM 的 `evaluation.can_advance = true` → 自动推进到下一层
- 推进时，LLM 产出的 `summary`（≤60 字）自动传递给下一层作为「前层总结」
- system 层也通过后 → `node_completed = true`

### 6.3 层间上下文传递

```
how 层对话（多轮）
    ↓ LLM 评估产出 summary：「用户理解了虚构故事让陌生人协作」
    ↓
why 层 prompt 注入【前层总结：用户理解了虚构故事让陌生人协作】
    ↓ 基于该 summary 生成 why 层引导
    ↓ LLM 评估产出 summary：「用户能解释虚构能力为何让智人胜出」
    ↓
system 层 prompt 注入前两层 summary
    ↓ 整合全部理解构建认知模型
```

---

## 8. 数据模型

### 8.1 TeachingContent

教学内容对象。不同层使用不同字段，`format` 决定哪些字段有值。

```typescript
interface TeachingContent {
  /**
   * 内容格式：
   * - "guided_question" (how 层)：使用 opening / core_question / thinking_direction
   * - "essence"         (why 层)：使用 content
   * - "model"           (system 层)：使用 content
   */
  format: "guided_question" | "essence" | "model";

  /** how 层：开场引导语；why/system 层：null */
  opening: string | null;

  /** how 层：核心问题；why/system 层：null */
  core_question: string | null;

  /** how 层：1 个思考方向；why/system 层：null */
  thinking_direction: string | null;

  /** why/system 层：教学内容文本；how 层：null */
  content: string | null;
}
```

**前端渲染建议**：

- `format === "guided_question"`：渲染为「开场语 + 核心问题 + 思考方向」
- `format === "essence"` / `"model"`：直接渲染 `content` 文本（可按 `\n\n` 分段）

### 8.2 Evaluation

```typescript
interface Evaluation {
  /** 是否可以推进到下一层 */
  can_advance: boolean;
  /** LLM 的判断理由 */
  reason: string;
  /** 本层达成总结（≤60 字），传递给下一层 */
  summary: string;
}
```

### 7.3 EnterNodeResponse

```typescript
interface EnterNodeResponse {
  current_layer: "how" | "why" | "system";
  layer_index: number;         // 0=how, 1=why, 2=system
  total_layers: number;        // 固定 3
  teaching_content: TeachingContent;
  evaluation: null;            // 首次进入不评估
}
```

### 7.4 AnswerRequest

```typescript
interface AnswerRequest {
  /** 用户本次回答（≤ 1000 字） */
  user_input: string;
}
```

### 8.5 AnswerResponse

```typescript
interface AnswerResponse {
  session_id: string;
  node_id: string;
  current_layer: "how" | "why" | "system";
  current_round: number;
  can_advance: boolean;
  node_completed: boolean;
  layer_summary: string;       // 推进时才有值
  teaching_content: TeachingContent | null;  // 完成时为 null
  evaluation: Evaluation | null;             // 轮次 < 3 时为 null
}
```

### 8.6 SessionResponse

```typescript
interface SessionResponse {
  session_id: string;          // 格式：sess_xxxxxxxxxxxx
}
```

### 8.7 SessionStatusResponse

会话状态对象，用于前端刷新后恢复对话状态。

```typescript
interface SessionStatusResponse {
  session_id: string;
  /** 当前节点 ID；未进入节点时为 null */
  node_id: string | null;
  /** 当前层；未进入节点时为 null */
  current_layer: "how" | "why" | "system" | null;
  /** 当前层已回答次数 */
  current_round: number;
  /** 节点是否全部完成 */
  node_completed: boolean;
  /** 最后一次 AI 问题（核心问题文本，用于恢复对话显示） */
  last_ai_question: string;
  /** 最后一次用户回答（用于恢复对话显示，未回答时为空串） */
  last_user_answer: string;
}
```

---

## 9. 错误码

| 状态码 | 含义 | 典型场景 |
|---|---|---|
| `200` | OK | 正常返回 |
| `400` | Bad Request | node_id 与 session 不匹配 |
| `404` | Not Found | session_id 不存在 / node_id 不存在 |
| `409` | Conflict | 节点在本会话中已完成 |
| `422` | Unprocessable Entity | 请求体 JSON 格式错误 / user_input 超长 |
| `500` | Internal Server Error | LLM 调用超时或内部错误（降级为 fallback 文本） |

---

## 附录

### A. 节点数据目录

```text
apps/backend/app/data/sapiens/
├── n001.json   认知革命
├── n002.json   农业革命
├── n003.json   货币的诞生
├── n004.json   想象的秩序
├── n005.json   资本主义与法律虚构
├── n006.json   帝国的崛起
└── n007.json   科学革命
```

每个 JSON 文件包含：`scope（知识范围）`、`criteria_by_layer（分层掌握标准）`、`misconceptions（常见误解）`。

### B. 完整对话流程（控制台模拟）

```python
import httpx

BASE = "http://localhost:8000"

# 1. 创建会话
sid = httpx.post(f"{BASE}/api/v1/sessions").json()["session_id"]

# 2. 获取节点问题（认知革命）— 首次进入返回 how 层结构化字段
r = httpx.post(f"{BASE}/api/v1/sessions/{sid}/nodes/n001/enter")
tc = r.json()["teaching_content"]
if tc["content"]:
    # 恢复场景：直接用 content
    print(tc["content"])
else:
    # 新建场景：how 层结构化字段
    print(tc["opening"])
    print(tc["core_question"])
    print(f"  - {tc['thinking_direction']}")

# 3. 三轮问答
for i in range(3):
    answer = input("你的回答：")
    r = httpx.post(
        f"{BASE}/api/v1/sessions/{sid}/nodes/n001/answer",
        json={"user_input": answer}
    )
    data = r.json()
    print(f"轮次 {data['current_round']} | 推进: {data['can_advance']}")

    tc = data.get("teaching_content")
    if tc:
        if tc["format"] == "guided_question":
            # how 层：结构化字段
            print(tc["core_question"])
        else:
            # why/system 层：content 文本
            print(tc["content"])

    if data["node_completed"]:
        print("节点完成！")
        break

# 4. 刷新页面后恢复状态
status = httpx.get(f"{BASE}/api/v1/sessions/{sid}/status").json()
print(f"当前层: {status['current_layer']}, 轮次: {status['current_round']}")
print(f"最后 AI 问题: {status['last_ai_question']}")
print(f"最后用户回答: {status['last_user_answer']}")
```
