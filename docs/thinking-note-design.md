# 用户思考沉淀与笔记设计方案

> 在当前自由输入交互下，记录用户在各层的回答和 AI 判定结果，生成节点思考笔记和全书合集，同时后台沉淀个人知识画像供未来学习产品使用。

文档创建日期：2026-06-21
状态：设计待实现

---

## 1. 设计动机

### 1.1 要解决的问题

当前 How / Why / System 三层均为自由输入形式，用户在每层需要打字回答。这些输入的文本在经过 AI 判定后就消失了——用户花了力气组织语言，但交互结束后没有留下任何个人痕迹。

| 问题 | 表现 | 后果 |
|------|------|------|
| 输入无沉淀 | 用户答完就过，看不到自己的思考记录 | 用户觉得"白打了" |
| 弱点无记录 | AI 判定过用户的遗漏和误解，但不保留 | 无法做学习分析 |
| 全程无积累感 | 7 个节点结束后用户没有"我的收获"的实体感 | 缺乏成就感 |
| 未来学习产品无数据基础 | 如果后续要转为正式学习产品，缺乏用户知识画像 | 需要重新征集数据 |

### 1.2 核心原则

1. **当前科普模式无压力**：弱点记录完全后台化，不展示给用户
2. **每层输入都有沉淀**：用户打的每一个字都被保存为思考笔记的一部分
3. **最终形成合集**：7 个节点的思考笔记汇编成《我的〈人类简史〉》，可导出留念
4. **面向未来**：数据结构同时服务"科普展示"和"学习分析"两个场景

### 1.3 交互总览

```
正常交互（How/Why/System 自由输入 + AI 判定）
        ↓  每层提交时，自动后台记录
        ↓  保存用户原文 + AI 判定结果
完成一个节点
        ↓
展示该节点的思考笔记（只展正面内容）
        ↓
继续下一个节点
        ↓
全部 7 节点完成
        ↓
可查看/导出《我的〈人类简史〉》合集
```

---

## 2. 数据记录体系

### 2.1 每层输入记录（实时）

每次用户在 How / Why / System / 原问回响 四层中提交自由输入时，自动记录：

```typescript
interface LayerRecord {
  // 用户原文
  userInput: string;                    // 用户写的原文
  aiFeedback: string;                   // AI 当时的反馈原文

  // 结构化分析（基于 Scope 文档的掌握标准）
  coveredPoints: string[];              // ✅ 答到的点
  missedPoints: string[];               // ❌ 遗漏的点（"不清楚的地方"）
  detectedMisconceptions: string[];     // ⚠️ 命中的常见误解

  // 元数据
  depthLayer: 'how' | 'why' | 'system' | 'final';
  submittedAt: string;                  // 提交时间 ISO
  editCount: number;                    // 修改次数
  inputLength: number;                  // 回答字数
  confidence: 'high' | 'medium' | 'low'; // 基于语气和细节的置信度评估
}
```

**"不清楚的地方"的判定来源：**

| 来源 | 判定方式 | 存储位置 |
|------|---------|---------|
| AI 判定的遗漏点 | AI 反馈中提及"还缺少""你还没说"等 | `missedPoints[]` |
| 命中的常见误解 | 用户回答与 Scope 文档「常见误解」匹配 | `detectedMisconceptions[]` |
| 回答过于简短 | 字数 < 15 字，或信息量不足以覆盖掌握标准 | `confidence: 'low'` |
| 模糊表达 | 使用"好像""大概""可能吧"等不确定用语 | `confidence: 'medium'` |
| 反复修改 | 多次提交才通过 | `editCount >= 2` |

#### 记录时机

```
用户提交回答
    ↓
AI 生成判定反馈（覆盖/遗漏/误解）
    ↓
前端同时将 userInput + aiFeedback + 结构化分析
写入 knowledgeStore
    ↓
交互继续，用户无感知
```

### 2.2 节点完成聚合（每节点）

一个节点的 4 层全部完成后，聚合成该节点的完整记录：

```typescript
interface NodeRecord {
  nodeId: string;                       // 节点标识
  nodeName: string;                     // 节点名称（如"认知革命"）

  // 选择的卷轴
  selectedScroll: string;

  // 四层 + 原问回响的记录
  layers: {
    how: LayerRecord | null;
    why: LayerRecord | null;
    system: LayerRecord | null;
    final: LayerRecord | null;
  };

  // 该节点聚合分析（后台，不展示给用户）
  weaknessSummary: {
    topMissedPoints: string[];          // 该节点最常见的遗漏点
    topMisconceptions: string[];        // 命中的误解
    weakLayers: string[];               // 表现较弱的层
    overallConfidence: 'high' | 'medium' | 'low';
  };

  // 该节点的思考笔记文本（展示用）
  thinkingNote: {
    scrollText: string;                 // 选择的卷轴内容
    howAnswer: string;                  // How 层回答
    whyAnswer: string;                  // Why 层回答
    systemAnswer: string;               // System 层回答
    finalAnswer: string;                // 原问回响回答
    keywords: string[];                 // 关键词（从回答中提取）
  };

  completedAt: string;                  // 完成时间
}
```

### 2.3 全书聚合（全部节点完成）

所有 7 个节点完成后，生成全书级别的记录：

```typescript
interface BookRecord {
  nodes: NodeRecord[];                  // 7 个节点的记录

  // 全书知识画像（后台）
  knowledgeProfile: {
    strengths: {                        // 强项列表
      nodeId: string;
      layer: string;
      point: string;
    }[];
    weaknesses: {                       // 弱项列表
      nodeId: string;
      layer: string;
      missedPoint: string;
    }[];
    crossNodeMisconceptions: {          // 跨节点反复出现的误解
      misconception: string;
      occurredIn: string[];             // 出现在哪些节点
    }[];
  };

  generatedAt: string;
}
```

### 2.4 存储方案

| 数据 | 存储位置 | 生命周期 |
|------|---------|---------|
| `LayerRecord` | localStorage | 实时写入，持久保存 |
| `NodeRecord` | localStorage | 节点完成时聚合写入 |
| `BookRecord` | localStorage | 全书完成时生成 |
| 导出文件 | 用户下载 | 用户自行保存 |

**localStorage key 设计：**

```
knowledge_world_records
  └─ layers: { [nodeId_depthLayer]: LayerRecord }
  └─ nodes: { [nodeId]: NodeRecord }
  └─ book: BookRecord | null
```

规模估算：单个 LayerRecord 约 1-2KB，整本书 7 节点 × 4 层 ≈ 28 条记录，总计 < 100KB，localStorage 完全够用。

---

## 3. 思考笔记展示（每节点）

### 3.1 触发时机

每节点完成原问回响后，展示思考笔记页面。

### 3.2 界面设计

```
┌──────────────────────────────────────────┐
│  📖 认知革命 · 你的思考笔记              │
├──────────────────────────────────────────┤
│                                          │
│  ── 你选择的卷轴 ──                      │
│  📜 "虚构故事让陌生人能大规模协作"        │
│                                          │
│  ── How · 你的理解 ──                    │
│  "智人通过共同相信故事来组织协作……"      │
│                                          │
│  ── Why · 你的分析 ──                    │
│  "个体能力不是关键，协作规模才是……"      │
│                                          │
│  ── System · 你的延伸 ──                 │
│  "这和现在的公司、国家都很像……"         │
│                                          │
│  ── 你的最终回答 ──                      │
│  "智人和其他动物的本质区别是虚构能力……"  │
│                                          │
│  ⭐ 你在探索中提到：                      │
│  协作 · 虚构 · 信任 · 邓巴数字           │
│                                          │
│            [ 下一节点 → ]                 │
└──────────────────────────────────────────┘
```

### 3.3 展示规则

| 元素 | 来源 | 说明 |
|------|------|------|
| 卷轴内容 | `selectedScroll` | 该节点选择的卷轴文本 |
| 各层回答 | `LayerRecord.userInput` | 用户当时的原文，**完整保留不做删改** |
| 关键词 | 从各层回答中提取的高频/关键实词 | 自动提取，标记用户提到的核心概念 |
| 弱点信息 | **不展示** | 全部在后台 `weaknessSummary`，用户不可见 |

### 3.4 关键词提取规则

- 从 4 次回答中提取名词性关键术语（如"协作""虚构""信任""邓巴数字"）
- 对照 Scope 文档的掌握标准，出现在用户回答中的即为"提到"
- 展示 4-6 个关键词，按出现频次排序

---

## 4. 《我的〈人类简史〉》合集（全书完成）

### 4.1 触发入口

所有 7 个节点完成后，在以下位置出现入口：

- 最后一个节点的思考笔记页面底部 → "查看我的书"
- 世界地图界面 → 新增"📖 我的书"按钮
- 首页（如有）→ 新增入口

### 4.2 界面设计

```
┌────────────────────────────────────────────┐
│  📖 我的《人类简史》                        │
│  你的探索之旅 · 2026 年夏                   │
├────────────────────────────────────────────┤
│                                            │
│  目录                                       │
│                                            │
│  前言 · 你的探索之旅                        │
│                                            │
│  第一章  认知革命                           │
│    你的理解 · 你的分析 · 你的延伸 · 你的回答│
│                                            │
│  第二章  农业革命                           │
│    你的理解 · 你的分析 · 你的延伸 · 你的回答│
│                                            │
│  第三章  货币                               │
│    ...                                      │
│                                            │
│  第四章  想象的秩序                         │
│    ...                                      │
│                                            │
│  第五章  资本主义                           │
│    ...                                      │
│                                            │
│  第六章  帝国                               │
│    ...                                      │
│                                            │
│  第七章  科学革命                           │
│    ...                                      │
│                                            │
│  后记 · 你的收获                            │
│    你在探索中最常提到的关键词                │
│    你的强项 · 你的成长                      │
│                                            │
│  ⬇️ [ 导出 Markdown ]  [ 导出 PDF ]        │
└────────────────────────────────────────────┘
```

### 4.3 前言与后记

**前言**（自动生成模板 + 个性化填充）：

> 这是你在 Knowledge World 中探索《人类简史》时留下的思考记录。
> 你走过了 7 个知识节点，从认知革命到科学革命，在 What / How / Why / System 四个维度中层层深入。
> 以下是你自己的回答和思考——它们不属于书本，只属于你。

**后记**（基于后台 `knowledgeProfile` 生成个性化内容）：

> 你在探索中提到了这些关键词：协作 · 虚构 · 驯化 · 资本 · 想象秩序 · 科学方法 · 全球化
>
> 你在以下几个点上表达得特别清晰：协作规模、共同想象、资本主义的循环逻辑
>
> 如果以后你想进一步深入学习，可以特别关注：邓巴数字、小麦驯化人的反向视角、帝国与文化融合的关系

### 4.4 导出功能

| 格式 | 实现方式 | 内容 |
|------|---------|------|
| Markdown | 运行时拼接文本，通过 Blob 下载 | 全部文本内容，结构化 Markdown |
| PDF | 使用 html2canvas + jspdf 或 window.print() | 带格式的文档 |

---

## 5. 未来学习产品的数据接口

当前设计不做学习产品，但数据结构预留了接口。

### 5.1 KnowledgeProfile 的使用场景

```typescript
// 未来学习产品从 localStorage 读取
const bookRecord = JSON.parse(localStorage.getItem('knowledge_world_book'));

// 获取用户弱项
const weakPoints = bookRecord.knowledgeProfile.weaknesses;
// → 可用于推送个性化复习题

// 获取反复误解
const repeatedMisconceptions = bookRecord.knowledgeProfile.crossNodeMisconceptions;
// → 可用于针对性纠正

// 获取强项
const strengths = bookRecord.knowledgeProfile.strengths;
// → 可用于跳过已掌握的检查点
```

### 5.2 未来可能的扩展方向

| 产品模式 | 如何使用沉淀数据 |
|---------|----------------|
| 复习模式 | 根据 `weaknesses` 生成针对性选择题 |
| 知识图谱 | 根据用户回答自动标注"已掌握/部分掌握/未掌握" |
| 对比分析 | 对比用户前后两次回答，展示思维变化 |
| 教师端 | 查看整班学生的 `knowledgeProfile` 聚合数据 |

---

## 6. 实现改动清单

### 6.1 新建文件

| 文件 | 内容 |
|------|------|
| `apps/frontend/src/store/knowledgeStore.ts` | 核心存储：`LayerRecord` / `NodeRecord` / `BookRecord` 的读写、聚合、导出逻辑 |
| `apps/frontend/src/components/dialog/ThinkingNotePage.tsx` | 每节点完成后的思考笔记展示组件 |
| `apps/frontend/src/components/dialog/MyBookPage.tsx` | 全部完成后的合集展示组件 |
| `apps/frontend/src/utils/keywordExtractor.ts` | 从回答文本中提取关键词的辅助函数 |
| `apps/frontend/src/utils/exportNote.ts` | Markdown / PDF 导出功能 |

### 6.2 修改文件

| 文件 | 变更 |
|------|------|
| `apps/frontend/src/store/dialogStore.ts` | 每层提交回调中同步触发 `knowledgeStore.recordLayer()` |
| `apps/frontend/src/types/world.ts` | 新增 `LayerRecord`、`NodeRecord`、`BookRecord`、`KnowledgeProfile` 等类型 |
| `apps/frontend/src/components/dialog/DialogBox.tsx` | 节点完成后展示 `ThinkingNotePage` |
| `apps/frontend/src/components/map/WorldMap.tsx` | 全部完成后添加"📖 我的书"入口按钮 |

### 6.3 数据类型新增

```typescript
// --- 用户输入记录 ---

interface LayerRecord {
  userInput: string;
  aiFeedback: string;
  coveredPoints: string[];
  missedPoints: string[];
  detectedMisconceptions: string[];
  depthLayer: 'how' | 'why' | 'system' | 'final';
  submittedAt: string;
  editCount: number;
  inputLength: number;
  confidence: 'high' | 'medium' | 'low';
}

interface NodeThinkingNote {
  scrollText: string;
  howAnswer: string;
  whyAnswer: string;
  systemAnswer: string;
  finalAnswer: string;
  keywords: string[];
}

interface NodeWeaknessSummary {
  topMissedPoints: string[];
  topMisconceptions: string[];
  weakLayers: string[];
  overallConfidence: 'high' | 'medium' | 'low';
}

interface NodeRecord {
  nodeId: string;
  nodeName: string;
  selectedScroll: string;
  layers: {
    how: LayerRecord | null;
    why: LayerRecord | null;
    system: LayerRecord | null;
    final: LayerRecord | null;
  };
  weaknessSummary: NodeWeaknessSummary;
  thinkingNote: NodeThinkingNote;
  completedAt: string;
}

interface KnowledgeProfile {
  strengths: { nodeId: string; layer: string; point: string }[];
  weaknesses: { nodeId: string; layer: string; missedPoint: string }[];
  crossNodeMisconceptions: { misconception: string; occurredIn: string[] }[];
}

interface BookRecord {
  nodes: NodeRecord[];
  knowledgeProfile: KnowledgeProfile;
  generatedAt: string;
}

// --- Store 接口 ---

interface KnowledgeStore {
  // 写入
  recordLayer(nodeId: string, record: LayerRecord): void;
  aggregateNode(nodeId: string): void;
  generateBook(): void;

  // 读取
  getThinkingNote(nodeId: string): NodeThinkingNote | null;
  getBookRecord(): BookRecord | null;
  getAllNodesRecord(): Record<string, NodeRecord>;

  // 导出
  exportMarkdown(): string;
  exportPDF(): void;

  // 工具
  clearAll(): void;
}
```

---

## 7. 向后兼容

- 所有记录存储在 `localStorage`，不影响现有交互逻辑
- 如果 `localStorage` 中没有数据，思考笔记入口不显示
- 思考笔记展示组件不做强制展示——如果当前节点没有记录，跳过笔记页面直接进入下一节点
- 导出功能仅在全书完成时可用，未完成时入口不可点击

---

## 8. 验收标准

- [ ] How / Why / System / 原问回响 每层提交时，`knowledgeStore.recordLayer()` 被自动调用
- [ ] `LayerRecord` 正确保存用户原文、AI 反馈、覆盖/遗漏/误解信息
- [ ] 节点完成时，自动聚合生成 `NodeRecord`，包含完整的思考笔记
- [ ] 节点完成后展示思考笔记页面，内容正确（卷轴、各层回答、关键词）
- [ ] 思考笔记只展示正面内容（用户的回答原文），不展示弱点分析
- [ ] 全部 7 节点完成后，世界地图出现"📖 我的书"入口
- [ ] 《我的〈人类简史〉》合集展示正确的 7 章内容 + 前言 + 后记
- [ ] 后记中的强项/弱项/关键词基于正确聚合的数据
- [ ] 导出 Markdown 功能正常工作，内容完整
- [ ] 导出 PDF 功能正常工作
- [ ] 无数据时，思考笔记和合集入口不展示
- [ ] 所有记录存储在 localStorage，清除后数据消失
- [ ] 数据规模估算 < 100KB，不影响游戏性能
