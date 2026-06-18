# Knowledge World API 接口文档

> 后端版本：0.2.0 | 基础 URL：`http://localhost:8000` | 协议：HTTP/JSON

---

## 目录

1. [通用约定](#1-通用约定)
2. [健康检查](#2-健康检查)
3. [教学交互](#3-教学交互)
4. [理解等级判断](#4-理解等级判断)
5. [错误码](#5-错误码)
6. [数据模型](#6-数据模型)

---

## 1. 通用约定

### 1.1 基础地址

```text
http://localhost:8000
```

### 1.2 请求格式

所有 POST 请求使用 `Content-Type: application/json`。

### 1.3 响应格式

成功响应返回 `200 OK`。错误响应统一格式：

```json
{
  "detail": "错误描述信息"
}
```

### 1.4 CORS

全开放 CORS（开发阶段），所有来源和方法均允许。

### 1.5 节点 ID 说明

`{node_id}` 为 URL 路径参数，由前端传入。后端不校验节点 ID 合法性，仅用于日志追踪。

---

## 2. 健康检查

### GET /api/v1/health

验证服务是否正常运行。

**请求示例**：

```bash
curl http://localhost:8000/api/v1/health
```

**响应示例**：

```json
{
  "status": "ok"
}
```

---

## 3. 教学交互

### POST /api/v1/nodes/{node_id}/interact

通过苏格拉底式提问引导用户构建理解。首次进入节点和每次用户回答后都调用此接口。

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `node` | `NodeInfo` | 是 | 当前知识节点的信息 |
| `node.node_name` | string | 是 | 节点名称，最长 12 字 |
| `node.concept` | string | 是 | 核心概念描述 |
| `node.examples` | string | 是 | 关键例子，多个用逗号或换行分隔 |
| `node.misconceptions` | string | 是 | 常见误区描述 |
| `node.learning_goals` | string | 是 | 学习目标描述 |
| `user_input` | string | — | 用户本次的回答，首次进入填空字符串 `""`，最长 1000 字 |
| `level` | int | — | 用户当前理解等级，范围 `1`-`4`，默认 `1` |
| `chat_history` | string | — | 历史对话文本，首次进入填空字符串 `""` |

**响应体**：

| 字段 | 类型 | 说明 |
|---|---|---|
| `question` | string | 核心提问 |
| `directions` | `ThinkingDirection[]` | 三个思考方向，固定 3 个 |
| `directions[].dimension` | string | 维度标识：`observe` / `reason` / `abstract` |
| `directions[].text` | string | 思考方向文本 |
| `hint` | string | 可选提示，无需提示时为空字符串 |

**请求示例（首次进入节点）**：

```bash
curl -X POST http://localhost:8000/api/v1/nodes/n001/interact \
  -H "Content-Type: application/json" \
  -d '{
    "node": {
      "node_name": "认知革命",
      "concept": "人类通过虚构故事实现大规模协作",
      "examples": "宗教、国家、货币、公司",
      "misconceptions": "不是智商突然暴涨，关键不在个体而在群体协作",
      "learning_goals": "理解共同虚构能力如何带来大规模协作"
    },
    "user_input": "",
    "level": 1,
    "chat_history": ""
  }'
```

**响应示例（首次进入）**：

```json
{
  "question": "你觉得，是什么让成千上万的陌生人能够为了同一个目标而合作？",
  "directions": [
    {
      "dimension": "observe",
      "text": "想一想，你和完全陌生的人之间有哪些共同的「相信」？"
    },
    {
      "dimension": "reason",
      "text": "如果没有这些共同相信的东西，陌生人之间的合作会变成什么样？"
    },
    {
      "dimension": "abstract",
      "text": "这种「共同相信」的能力，为什么在动物世界中唯独人类发展到了极致？"
    }
  ],
  "hint": "如果觉得有点难，可以想想「货币」这个例子——为什么你会相信一张纸能换到一顿饭？"
}
```

**请求示例（用户回答后追问）**：

```bash
curl -X POST http://localhost:8000/api/v1/nodes/n001/interact \
  -H "Content-Type: application/json" \
  -d '{
    "node": {
      "node_name": "认知革命",
      "concept": "人类通过虚构故事实现大规模协作",
      "examples": "宗教、国家、货币、公司",
      "misconceptions": "不是智商突然暴涨",
      "learning_goals": "理解共同虚构能力如何带来大规模协作"
    },
    "user_input": "因为人类更聪明",
    "level": 2,
    "chat_history": "导师问：为什么人类最终能统治地球？\n用户答：因为人类更聪明"
  }'
```

**响应示例（追问）**：

```json
{
  "question": "如果仅仅是因为「更聪明」，那为什么黑猩猩、海豚、大象这些同样聪明的动物，没有像人类一样建立起城市、国家和文明？",
  "directions": [
    {
      "dimension": "observe",
      "text": "智人和尼安德特人在脑容量上差别不大，但结果却截然不同。这个事实说明了什么？"
    },
    {
      "dimension": "reason",
      "text": "如果聪明的动物不止人类一种，那么是什么独特条件让人类走上了不同的道路？"
    },
    {
      "dimension": "abstract",
      "text": "个体智能和群体智能之间，是否存在某种关键的能力差异？"
    }
  ],
  "hint": ""
}
```

**通用对话流程**：

```text
Step 1. 用户首次进入节点
        → POST /interact (user_input="", level=1)
        → 返回 【问题】+【思考方向】×3 + 可选【提示】

Step 2. 用户回答后
        → POST /interact (user_input="用户回答", level=当前等级)
        → 返回新的 【问题】+【思考方向】×3 + 可选【提示】

Step 3. 反复执行 Step 2，持续引导

Step 4. 可选：每次回答后 POST /judge-level 判断等级
        前端用返回的 level 更新下一轮交互请求
```

**前端集成建议**：

```typescript
// 首次进入节点
const res = await fetch("/api/v1/nodes/n001/interact", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    node: { node_name, concept, examples, misconceptions, learning_goals },
    user_input: "",
    level: 1,
    chat_history: "",
  }),
});

// 用户回答后
const res = await fetch("/api/v1/nodes/n001/interact", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    node: { ... },          // 节点信息不变
    user_input: "用户的回答",
    level: currentLevel,    // 从 judge-level 接口获取
    chat_history: history,  // 前端维护的对话文本
  }),
});
```

---

## 4. 理解等级判断

### POST /api/v1/nodes/{node_id}/judge-level

可选接口。根据用户的回答，判断其对当前知识点的理解等级，供前端更新状态后在下一轮 `interact` 请求中传入。

**Level 定义**：

| Level | 含义 | 策略 |
|---|---|---|
| 1 | 完全不理解 / 纯猜测 | 降低思考门槛，给更明确的思考方向 |
| 2 | 有直觉但表达模糊 | 帮助澄清思路，引导建立因果关系 |
| 3 | 能够结构化表达 | 深入追问，引导抽象思考 |
| 4 | 接近本质理解 | 提出综合性问题，引导迁移思考 |

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `user_input` | string | 是 | 用户的回答文本 |

**响应体**：

| 字段 | 类型 | 说明 |
|---|---|---|
| `level` | int | 理解等级，范围 `1`-`4` |

**请求示例**：

```bash
curl -X POST http://localhost:8000/api/v1/nodes/n001/judge-level \
  -H "Content-Type: application/json" \
  -d '{"user_input": "因为人类更聪明"}'
```

**响应示例**：

```json
{
  "level": 1
}
```

---

## 5. 错误码

| 状态码 | 含义 | 说明 |
|---|---|---|
| `200` | OK | 请求成功 |
| `400` | Bad Request | 请求参数校验失败（如字段超长、超出范围） |
| `422` | Unprocessable Entity | 请求体 JSON 格式错误或缺失必填字段 |
| `500` | Internal Server Error | LLM 调用超时或内部错误，此时服务会自动降级返回预设的 Fallback 响应 |

**注意**：即使 LLM 调用失败，后端也会返回 `200` 和合法的 JSON 结构（Fallback 文本），仅 `500` 表示服务本身异常。前端通常不需要额外处理错误。

---

## 6. 数据模型

### 6.1 NodeInfo

```typescript
interface NodeInfo {
  /** 节点名称，最长 12 字 */
  node_name: string;
  /** 核心概念描述 */
  concept: string;
  /** 关键例子，多个例子用逗号或换行分隔 */
  examples: string;
  /** 常见误区 */
  misconceptions: string;
  /** 学习目标 */
  learning_goals: string;
}
```

### 6.2 ThinkingDirection

```typescript
interface ThinkingDirection {
  /** 维度标识：observe | reason | abstract */
  dimension: "observe" | "reason" | "abstract";
  /** 思考方向文本 */
  text: string;
}
```

### 6.3 InteractRequest

```typescript
interface InteractRequest {
  /** 当前知识节点信息 */
  node: NodeInfo;
  /** 用户本次的回答，首次进入填空字符串 "" */
  user_input: string;
  /** 用户当前理解等级，范围 1-4，默认 1 */
  level: number;
  /** 历史对话文本，首次进入填空字符串 "" */
  chat_history: string;
}
```

### 6.4 InteractResponse

```typescript
interface InteractResponse {
  /** 核心提问 */
  question: string;
  /** 三个思考方向，固定 3 个 */
  directions: ThinkingDirection[];
  /** 可选提示，无需提示时为空字符串 */
  hint: string;
}
```

---

## 附录

### A. Level 与 Prompt 策略对照

```
Level 1: 使用简单问题，降低思考门槛，提供更明确的思考方向
Level 2: 帮助澄清思路，引导用户建立因果关系
Level 3: 深入追问，引导抽象思考
Level 4: 提出综合性问题，引导本质思考和迁移思考
```

### B. 维度说明

| dimension | 中文 | 引导方向 |
|---|---|---|
| `observe` | 事实观察 | 关注现象、事实、表层信息 |
| `reason` | 因果推理 | 思考原因、关系、逻辑 |
| `abstract` | 本质抽象 | 思考深层规律、本质、概念 |

### C. 正确对话 vs 错误对话

**正确示例**：

```
导师问：你觉得，是什么让成千上万的陌生人能够为了同一个目标而合作？
用户答：因为他们有共同的信念。
导师追问：什么样的信念？能举一个具体的例子吗？
```

**错误示例**：

```
导师问：你觉得，是什么让成千上万的陌生人能够为了同一个目标而合作？
导师直接答：因为人类有虚构故事的能力。
```

后者违背了苏格拉底式教学的核心原则——不直接给答案。
