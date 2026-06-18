# Knowledge World API 接口文档

> 后端版本：0.3.0 | 基础 URL：`http://localhost:8000` | 协议：HTTP/JSON

---

## 目录

1. [通用约定](#1-通用约定)
2. [健康检查](#2-健康检查)
3. [创建学习会话](#3-创建学习会话)
4. [进入节点](#4-进入节点)
5. [提交回答](#5-提交回答)
6. [状态机流转说明](#6-状态机流转说明)
7. [数据模型](#7-数据模型)
8. [错误码](#8-错误码)

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
Step 2: POST /sessions/{id}/nodes/{nid}/enter  → 进入节点，返回 how 层第一轮教学
Step 3: POST /sessions/{id}/nodes/{nid}/answer  → 用户回答，返回下一轮引导（循环）

状态机自动流转：how → why → system → completed
每层至少 3 轮对话后方可进入下一层
```

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

## 4. 进入节点

### POST /api/v1/sessions/{session_id}/nodes/{node_id}/enter

前端完成 What 层后调用。后端加载该节点知识范围（Node Scope），初始化状态机，返回 How 层第一轮教学内容。

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
| `current_layer` | string | 当前层，固定为 `"how"` |
| `layer_index` | int | 层索引，`0` = how |
| `total_layers` | int | 总层数，固定 `3` |
| `teaching_content` | object | 教学内容 |
| `teaching_content.format` | string | 格式：`"mechanisms"` |
| `teaching_content.content` | string | 教学内容文本，含机制路径和引导问题 |
| `evaluation` | null | 首次进入不评估，固定为 `null` |

**请求示例**：

```bash
curl -X POST http://localhost:8000/api/v1/sessions/sess_a1b2c3d4e5f6/nodes/n001/enter
```

**响应示例**：

```json
{
  "current_layer": "how",
  "layer_index": 0,
  "total_layers": 3,
  "teaching_content": {
    "format": "mechanisms",
    "content": "机制路径一：共同神话建立信任\n智人通过语言讲述虚构的故事，比如部落起源神话，让原本陌生的个体共同相信一个不存在的神灵或祖先。这种共同相信本身就是信任的种子。\n\n机制路径二：虚构规则替代血缘纽带\n当陌生人合作时，血缘无法提供信任基础。但一个共同承认的规则——比如「欺瞒神灵会遭报应」——可以充当看不见的契约。\n\n机制路径三：大规模协作的信息基础\n有了共同虚构的故事，信息能够在更大的网络中被共享和认同，使得成千上万的人可以围绕同一个目标行动。\n\n【引导问题】\n上面三种路径都强调「相信」的作用。你觉得，相信一个虚构的故事和相信一个真实存在的人，有什么区别？"
  },
  "evaluation": null
}
```

**错误**：

| 状态码 | 说明 |
|---|---|
| `404` | session_id 不存在 |
| `404` | node_id 不存在（非 n001-n007） |
| `409` | 该节点已在当前会话中完成 |

---

## 5. 提交回答

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
| `teaching_content` | object \| null | 下一轮教学内容（节点完成时为空） |
| `teaching_content.format` | string | 格式：`"mechanisms"` / `"essence"` / `"model"` |
| `teaching_content.content` | string | 教学内容文本 |
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

**响应示例（can_advance=false，继续追问）**：

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
    "format": "mechanisms",
    "content": "如果仅仅是因为「更聪明」，那为什么黑猩猩、海豚、大象这些同样聪明的动物，没有像人类一样建立起城市、国家和文明？\n\n【引导问题】\n个体智力水平和群体协作能力之间，是否存在某种关键的差异？"
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

## 6. 状态机流转说明

### 6.1 层定义

| 层 | 认知目标 | System Prompt 结构 | 输出 format |
|---|---|---|---|
| **how** | 机制理解 | 给出 2-3 个机制路径 + 引导问题 | `"mechanisms"` |
| **why** | 本质抽象 | 提炼 1-3 个跨场景规律 + 关键追问 | `"essence"` |
| **system** | 体系建模 | 整合前三层为结构化模型 | `"model"` |

### 6.2 流转规则

```
what(前端) ──enter──→ how ──(3+ 轮 + 评估通过)──→ why ──(通过)──→ system ──(通过)──→ 完成
```

- **进入节点**时默认进入 how 层
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

## 7. 数据模型

### 7.1 TeachingContent

```typescript
interface TeachingContent {
  /** 内容格式：mechanisms | essence | model */
  format: "mechanisms" | "essence" | "model";
  /** 教学内容文本，含机制描述/规律提炼/认知模型 */
  content: string;
}
```

### 7.2 Evaluation

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

### 7.5 AnswerResponse

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

### 7.6 SessionResponse

```typescript
interface SessionResponse {
  session_id: string;          // 格式：sess_xxxxxxxxxxxx
}
```

---

## 8. 错误码

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

# 2. 进入节点（认知革命）
r = httpx.post(f"{BASE}/api/v1/sessions/{sid}/nodes/n001/enter")
print(r.json()["teaching_content"]["content"])

# 3. 三轮问答
for i in range(3):
    answer = input("你的回答：")
    r = httpx.post(
        f"{BASE}/api/v1/sessions/{sid}/nodes/n001/answer",
        json={"user_input": answer}
    )
    data = r.json()
    print(f"轮次 {data['current_round']} | 推进: {data['can_advance']}")
    if data.get("teaching_content"):
        print(data["teaching_content"]["content"])
    if data["node_completed"]:
        print("🎉 节点完成！")
        break
```
