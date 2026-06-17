# Knowledge World 前端技术方案（PixiJS v8 · 产品分支对齐版）

> 目标：按 product 分支最新 PRD 要求实现认知探索系统。本方案仅描述技术选型、架构、数据流与美术素材清单，不写具体实现代码。

---

## 1. PRD 关键要求快照

| 维度 | PRD §4.2 要求 |
|---|---|
| 地图规模 | **20 节点 × 4 张深度地图**（What / How / Why / System），节点坐标一致 |
| 节点呈现 | **关卡 NPC 头像 + 谜题标题**，不显示节点名 |
| What 交互 | **老学者翻卡**：定义 / 例子 / 连接 三张卡 + 轻量确认（选一张最关键） |
| How/Why/System | **老学者提问 → 用户回答 → 四段式反馈卡**；每节点每深度最多 3 轮 |
| 关卡 NPC 职责 | 只提 `mysteryQuestion` + 终问回响认可，不做中间教学 |
| 小场景 | **首次进入节点 What 层时 5-8 秒像素小场景**，仅一次，之后不再自动播放 |
| 门禁 | 向上门禁 + 每次只显露 1 个下一节点；向下自由（复习态） |
| 原问回响 | 四层全部完成 → 切回 What 地图，关卡 NPC 再次提出同一个 `mysteryQuestion` |
| 迷雾消散动画 | 5 个分镜：中心闪光 → 辐射光圈 → 粒子向外扩散 → 下一节点弹性浮现 → HUD 数值跳动 |
| HUD 文案 | **"认知迷雾已消散 X%"**，禁止出现"已掌握 X / 共 Y 节点" |
| 性能验收 | **1080p ≥ 30 fps** |
| 节点数据契约 | `mysteryQuestion`、`gateNpc`、`introScene`、`whatCards`、`mentorPrompts`、`nextDiscoveryId`、`finalQuestion`、`neighbors` |
| 预制世界 | 《人类简史》+《经济学原理》第一章 |

---

## 2. 技术栈决策

| 层 | 选型 | 理由 |
|---|---|---|
| 框架 | **React 18 + TypeScript** | 组件化 + 类型安全 |
| 构建 | **Vite 5** | 极速冷启动 / HMR |
| 样式 | **Tailwind CSS 3** | 像素风快速构建 |
| **地图渲染** | **PixiJS v8**（弃用 Canvas 2D） | 20 节点 × 4 地图 + 粒子 + 动画精灵 + 交叉溶解，纯 Canvas 2D 在 1080p 不满足 30fps；PixiJS 原生 WebGL |
| React-Pixi 绑定 | **@pixi/react v8** | 用 React 组件树描述场景图，避免手写 RAF 循环 |
| 动画 | **GSAP 3 + PixiJS Ticker** | 节点光晕脉冲、学者移动、深度切换交叉溶解；使用 `@pixi/gsap` 或直接写 GSAP tween Pixi 对象 |
| 对话 UI | **React 组件 + CSS 像素风**，外框用 `dialogue_box_frame.png` 作为底框 | PRD §4.2.5 / §4.2.6 要求 NPC 头像 + 翻卡 + 反馈卡，与地图渲染解耦 |
| 小场景 | **PixiJS 场景 + AnimatedSprite** | 5-8 秒的像素小舞台，非文字对话，需要动画精灵（火把、火堆、金币堆） |
| 状态 | **Zustand（原 useState 升级）** | 节点状态、小场景状态、深度选择、原问回响、门禁判断等多处需要共享状态；useState 在四层地图间传递困难 |
| 数据请求 | **原生 fetch + 本地 fallback** | 两个 POST 接口（`question`、`feedback`） |
| 字体 | **Press Start 2P + VT323**（Google Fonts） | 像素风标题 / 正文 |
| 粒子系统 | **pixi-particles** 或 **PixiJS 内置 ParticleContainer** | 迷雾粒子系统 |
| 图像加载 | **PixiJS Assets API**（`assets.add` / `assets.load`） | 替代手写 `new Image()`；支持 WebP / PNG 的现代编码 |

**生产依赖**（相较方案一从 3 个升级到 6 个）：`react`, `react-dom`, `pixi.js`, `@pixi/react`, `gsap`, `zustand`

---

## 3. 架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         React 18 Application                            │
│                                                                         │
│  ┌──────────────┐  ┌────────────────────┐  ┌────────────────────────┐  │
│  │  DepthSwitch │  │  HUD + WorldTitle  │  │  DialogBox (HTML/CSS)  │  │
│  │  (四入口切   │  │  "认知迷雾已消散X%"│  │  └ NPC头像 / 翻卡 /     │  │
│  │   深度地图) │  │                    │  │    反馈卡 / 终问回响  │  │
│  └─────┬────────┘  └──────────┬────────┘  └──────────┬────────────┘  │
│        │                      │                      │               │
│        └──────────────────────┼──────────────────────┘               │
│                               │                                      │
│                    ┌──────────▼──────────────┐                      │
│                    │   Zustand (state store) │                      │
│                    │  currentDepth, world,   │                      │
│                    │  nodeProgress[],        │                      │
│                    │  introSceneState,       │                      │
│                    │  dialogPhase             │                      │
│                    └──────┬──────────┬──────┘                      │
│                           │          │                              │
│           ┌───────────────┘          └───────────────               │
│           ▼                                     ▼                    │
│ ┌─────────────────────┐              ┌────────────────────┐        │
│ │  PixiJS Scene Tree  │              │  Fetch API Client  │        │
│ │  (via @pixi/react) │              │  question/feedback│        │
│ │                     │              │  + local fallback │        │
│ │  ├── Background     │              └──────────┬────────┘        │
│ │  │    (DepthBG:    │                        ▼                 │
│ │  │    4 preloaded   │              ┌────────────────────┐        │
│ │  │    images with   │              │  Dialog Model      │        │
│ │  │    cross dissolve)│            │  (parses AI resp,  │        │
│ │  │                   │            │   updates node state│        │
│ │  ├── FogSystem       │              └──────────┬────────┘        │
│ │  │  (ParticleCont.  │                         ▼                 │
│ │  │    with reveal    │             ┌─────────────────────┐        │
│ │  │    punch holes)   │             │  SmallScene         │        │
│ │  │                   │             │  (Pixi AnimatedSprite│        │
│ │  ├── NodeLayer       │              │   5-8s小场景舞台)  │        │
│ │  │    (20 nodes,     │             └──────────┬────────┘         │
│ │  │    each w/ NPC    │                        ▼                 │
│ │  │    avatar + halo  │             ┌────────────────────┐        │
│ │  │    + title)       │             │  CognitiveProgress  │        │
│ │  │                   │             │  Model (state flow) │        │
│ │  └── ScholarSprite   │             └──────────┬────────┘         │
│ │       (animated      │                       ▼                 │
│ │        4 directions) │            ┌──────────────────────┐       │
│ │                       │            │  Fog Dispersion      │       │
│ │  1080p / 30 fps      │            │  (5分镜动画)          │       │
│ └──────────────────────┘            └──────────────────────┘       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**关键设计原则**：
1. **地图用 PixiJS 渲染，对话 UI 用 React DOM** —— 两者解耦；对话对话框是一张带像素边框的浮层，覆盖在地图之上。
2. **节点数据从 JSON 驱动**，不在前端代码里硬编码坐标；节点集合与位置由后端/预制 JSON 决定。
3. **四层地图共用同一批节点坐标**，不同深度只改变背景图像、节点光晕颜色和可见性（根据门禁判断是否渲染）。
4. **深度切换 = 交叉溶解动画**，两张深度的 `Container.alpha` 从 0→1 / 1→0。
5. **迷雾系统不使用全局 mask**，而是每个节点周围堆叠径向渐变粒子 + punch-hole（从节点中心向外消退的孔洞动画）。

---

## 4. 目录结构

```
apps/frontend/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── .env.example              # VITE_API_BASE_URL=http://localhost:8000
└── src/
    ├── main.tsx              # React 入口，全局 PixiJS 初始化
    ├── App.tsx               # 应用根组件
    ├── styles/globals.css    # Tailwind + 像素风全局样式
    ├── types/
    │   ├── world.ts          # World / Node / LayerType / NodeProgress
    │   ├── feedback.ts       # DiagnosticResponse / FeedbackCard
    │   └── pixi.d.ts         # @pixi/react 类型声明（如需全局）
    ├── store/
    │   ├── worldStore.ts     # Zustand：当前世界、节点集合、深度、迷雾进度
    │   ├── nodeStore.ts      # 每个节点的小场景已观看、whatChoice、各深度状态、原问回响状态
    │   ├── dialogStore.ts    # 当前打开节点、对话阶段（loading/reading/question/feedback/final）
    │   └── uiStore.ts        # 深切切换动画状态、小场景播放状态
    ├── data/                 # 预制世界 JSON（初赛硬编码）
    │   ├── sapiens.ts        # 《人类简史》20 节点
    │   ├── economics.ts      # 《经济学原理》第一章
    │   └── index.ts          # 导出 PREBUILT_WORLDS
    ├── api/
    │   ├── client.ts         # fetch 封装 + timeout + 本地 fallback
    │   └── nodes.ts          # getQuestion / getFeedback（两个 POST 接口）
    ├── components/
    │   ├── ui/
    │   │   ├── PixelButton.tsx
    │   │   ├── PixelCard.tsx
    │   │   └── HUD.tsx           # 迷雾消散百分比 + 深度切换器入口
    │   ├── dialog/
    │   │   ├── DialogBox.tsx     # 主对话框（外框使用 dialogue_box_frame.png）
    │   │   ├── NpcAvatar.tsx     # 关卡 NPC 头像展示（用 gateNpc.avatar）
    │   │   ├── MentorAvatar.tsx  # 老学者头像 / 立绘
    │   │   ├── WhatCards.tsx     # 翻卡阅读 + 轻量确认
    │   │   ├── QuestionBubble.tsx # 提问气泡
    │   │   └── FeedbackCard.tsx  # 四段式反馈卡
    │   └── map/
    │       ├── WorldMap.tsx        # <PixiWorld> 挂载点 + 场景组装
    │       ├── DepthBackground.tsx # 四层背景图的交叉溶解
    │       ├── NodeSprite.tsx      # 单个节点（关卡 NPC 头像 + 谜题标题 + 光晕）
    │       ├── ScholarSprite.tsx   # 学者化身（4方向 walk 动画）
    │       ├── FogLayer.tsx        # 迷雾粒子层 + punch-hole 动画
    │       └── SmallScene.tsx      # 5-8 秒像素小场景（首次进入节点 What 层）
    ├── engine/               # PixiJS 场景引擎辅助类（非 React 组件）
    │   ├── PixiApp.ts        # 应用实例（Application + resize）
    │   ├── FogEffect.ts      # 迷雾 punch hole 扩散 / 辐射光圈
    │   └── AnimationTrack.ts # 解锁 5 分镜时序编排
    ├── constants/
    │   ├── biome.ts          # 四层生物群系调色板（暖黄/金绿/石灰/紫蓝）
    │   └── node.ts           # 节点状态样式（locked/available/completed/learning）
    └── utils/
        ├── assetLoader.ts    # PixiJS Assets API 加载美术资源
        └── depthGate.ts      # 门禁与下一节点计算逻辑
```

---

## 5. 认知状态机（Cognitive Progress Model）

每个节点 × 每个深度有独立状态：

```
locked → available → learning → completed
              ↘ whatCard read ↗
```

| 状态 | 进入条件 | 视觉表现 |
|---|---|---|
| locked | 不满足门禁条件（该深度尚未有节点完成，或当前节点在本深度不可见） | 完全被迷雾覆盖，不可点击 |
| available | 满足门禁 + 上一节点已完成 What 或已被 nextDiscoveryId 指向 | 关卡 NPC 头像可见 + 谜题标题，点击后触发小场景或对话 |
| learning | 用户正在阅读 / 回答但尚未达到"掌握"阈值 | 黄色弱脉冲光晕 |
| completed | 用户回答覆盖 How/Why/System 核心要点；或完成 What 翻卡 | 绿色 / 紫色强光晕，触发迷雾向邻接节点扩散 |

**原问回响专用状态**：同一节点的 what/how/why/system 全部 completed → `finalQuestion` 变为 available → 用户回到 What 地图关卡 NPC 面前回答同一个 `mysteryQuestion` → 成功后 `nodeClear=true`。

---

## 6. 核心数据流（基于 PRD §4.2）

```
进入世界 (App 加载 world JSON)
  │
  ├── assetsLoader.load() → 预加载 4 张背景图 + 20 NPC 头像 + 学者精灵 + 迷雾粒子图
  │
  ├── worldStore.setState({ world, currentDepth: "what" })
  │
  └── WorldMap 挂载 → 渲染: DepthBackground (what=100%, 其他=0%) + FogLayer + NodeLayer + ScholarSprite
                            │
    用户点击 available 节点（NodeSprite pointerdown）
                            │
                            ├── ScholarSprite 从当前位置移动到目标节点（GSAP tween x/y, walk anim）
                            │
                            ├── introScene 判断：
                            │    └ if unseen → SmallScene 播放 5-8 秒 → 标记为 seen
                            │
                            ├── dialogStore.open(node) → DialogBox 打开
                            │    │
                            │    └ 根据深度切换：
                            │          │
                            │          ├── What 深度 → WhatCards.tsx（翻卡阅读 + 轻量确认）
                            │          │     完成：nodeStore.markWhatCompleted(nodeId) → 迷雾 punch hole 扩散
                            │          │                                          → 只显露 1 个 nextDiscoveryId 指向的相邻节点
                            │          │                                          → 首次完成时老学者文案："迷雾散去了一部分..."
                            │          │
                            │          └── How / Why / System → QuestionBubble + 反馈卡
                            │                1) POST /question → 拿到核心提问（1 + 2追问）
                            │                2) 用户回答 → POST /feedback → DiagnosticResponse
                            │                3) feedback_level: reinforce/hint/minimal_explain
                            │                4) depth_state: learning / completed
                            │                   └ if completed: 迷雾消散 + 只显露 nextDiscoveryId 节点
                            │                   └ 3 轮未完成：保留 learning，下次进入新的 3 轮周期
                            │
                            └── 四层全部完成后：
                                  nodeStore.markForFinalQuestion(nodeId)
                                  dialogStore.showFinalQuestion()
                                  系统提示切回 What 地图，由关卡 NPC 再次提出同一个 mysteryQuestion
```

---

## 7. 门禁与可见性计算（PRD §4.2.3 规则约束）

```
深度切换器的四个入口状态由全局聚合推导：

  what       → 永远可用（无门禁前提）
  how        → 至少 1 个节点 what.completed
  why        → 至少 1 个节点 how.completed
  system     → 至少 1 个节点 why.completed

同一节点在多张地图中坐标相同，但可见性由该节点在当前深度的状态决定：
  1. 当前深度 = what：所有节点可见（按 what 状态）
  2. 当前深度 = how：
     · startNode + 所有 what.completed 节点在 how 上可用
     · 所有 how.completed 节点的 nextDiscoveryId 指向的节点在 how 上可用
  3. why / system：同理，按上一深度完成情况，每个已完成节点显露 1 个下一节点

每次完成节点时，仅使 1 个下一节点变为 available，而非一次性解锁全部邻居
```

---

## 8. 性能与渲染策略

| 场景 | 策略 |
|---|---|
| **地图渲染** | PixiJS WebGL，单 Application 实例；四层背景作为 4 个 Container，alpha tween 做交叉溶解；20 节点作为 Sprite 挂在 NodeLayer；学者用 AnimatedSprite |
| **迷雾系统** | ParticleContainer（约 60-80 个径向渐变粒子贴图）+ 每个节点 punch-hole（使用 `PIXI.Graphics` 圆形孔洞叠加 mask）；完成节点时孔洞向外扩张动画 |
| **节点光晕** | PixiJS `Filter`（GlowFilter / BloomFilter）仅用于 completed 节点的轻微光晕；learning 节点用 tween alpha 脉冲 |
| **动画帧率** | 目标 60fps，最低 30fps 合格；PixiJS Ticker 驱动所有动画 |
| **小场景** | 作为独立 Scene 覆盖在地图之上，5-8 秒后自动淡出；使用 AnimatedSprite（火把、火堆、人物剪影、金币堆等） |
| **节点数量** | ≤20（PRD 写死上限） |
| **图像资源总大小** | 目标 ≤ 10MB（PNG + WebP，gzip 后 ≈5-7MB）；可根据网络条件启用懒加载背景图 |
| **响应式尺寸** | 固定 16:9 画布，内容缩放至容器，不扭曲像素坐标；使用 PixiJS `resizeTo` 或手写 resize |

---

## 9. 与 PRD 的差异管理

| PRD 要求 | 本方案实现 | 备注 |
|---|---|---|
| "认知迷雾已消散 X%" | HUD 组件读取 worldStore 中迷雾进度，计算方式：已完成的 (node, depth) 对 / 总节点 × 总深度数 | 不显示"已掌握"等词汇 |
| 节点显示谜题标题而非节点名 | `NodeSprite` 渲染 `node.mysteryQuestion` 作为标题，忽略 `node.name` | 通过 gateNpc 显示头像 |
| What 翻卡最小阅读节流（2秒） | WhatCards.tsx 中使用 `useTimeout` 禁止按钮点击 | 防误触 |
| 小场景只在首次进入 What 播放 | nodeStore 中 `introSeen[nodeId]` 记录 | 原问回响不触发小场景 |
| 同一节点同一高阶深度 3 轮未完成 → 新 3 轮周期 | dialogStore 中 `round[nodeId][depth]`；`nodeStore.feedbackCache` 保留历史反馈 | UI 不显示"第 4 轮" |
| 原问回响复用同一个 mysteryQuestion | finalQuestion 阶段直接读 `node.mysteryQuestion` | 不另生成新问题 |
| 向上门禁 | `depthGate.calculateAvailableNodes(world, depth, progressMap)` | 纯函数，便于单测 |
| 每次只显露 1 个下一节点 | `nextDiscoveryId` 指向的节点；若为空，按 neighbors[0] | 与 PRD §2.1.3 "依赖解锁"一致 |

---

## 10. API 接口契约（对齐 PRD §4.2.2 数据契约）

```
POST /api/v1/nodes/{node_id}/question

请求体:
{
  "node_id": "n_xxx",
  "node_name": "认知革命",
  "depth": "what" | "how" | "why" | "system",
  "mystery_question": "...",
  "source_excerpt": "...",
  "mentor_prompts": { "whatIntro": "...", "how": "...", "why": "...", "system": "...", "finalReturn": "..." },
  "round": 1 | 2 | 3
}

响应体 (What)：三张翻卡内容（由前端取 node.whatCards 直接渲染，不走此接口）
响应体 (How/Why/System)：
{
  "question": "核心提问",
  "followups": ["追问 1", "追问 2"],
  "depth": "how" | "why" | "system"
}

POST /api/v1/nodes/{node_id}/feedback

请求体:
{
  "node_id": "n_xxx",
  "node_name": "认知革命",
  "source_excerpt": "...",
  "user_answer": "...",
  "depth": "how" | "why" | "system",
  "round": 1 | 2 | 3,
  "feedback_level": "reinforce" | "hint" | "minimal_explain"
}

响应体:
{
  "feedback_card": {
    "understood": ["..."],
    "missing": ["..."],
    "guidance": "...",
    "next_question": "..."
  },
  "depth_state": "learning" | "completed",
  "node_state": "learning" | "mastered" | "transfer"
}
```

---

## 11. 美术素材清单

> 素材目录：`assets/`（repo 根目录），按 PRD §9 "美术资源全部由 AI 生成"的统一像素风 prompt 生成。
> 统一输出：PNG / WebP，透明背景，256×256 / 512×512 / 1024×1024 三种规格。

### 11.1 世界背景（4 张深度地图全屏背景）

| 文件 | 尺寸 | 用途 | PRD 映射 |
|---|---|---|---|
| `assets/biomes/world_what.png` | 1920×1080 | What 层大地图背景（暖黄色调，草原/开阔地平线，带远山与阳光） | PRD §4.2.3 "What 地图" |
| `assets/biomes/world_how.png` | 1920×1080 | How 层大地图背景（金绿色调，田野/村庄，更多细节） | PRD §4.2.3 "How 地图" |
| `assets/biomes/world_why.png` | 1920×1080 | Why 层大地图背景（石灰/棕褐色调，黄昏山野，更高层思考感） | PRD §4.2.3 "Why 地图" |
| `assets/biomes/world_system.png` | 1920×1080 | System 层大地图背景（紫蓝色调，夜空/星云） | PRD §4.2.3 "System 地图" |

### 11.2 节点素材（最多 20 节点 · 关卡 NPC 头像）

| 文件 | 尺寸 | 用途 | PRD 映射 |
|---|---|---|---|
| `assets/nodes/npc_storyteller.png` | 256×256 | 认知革命 NPC（讲故事的人，火把/洞穴壁画） | §4.2.4 小场景 P0 |
| `assets/nodes/npc_farmer.png` | 256×256 | 农业革命 NPC（老农，田野/镰刀） | §4.2.4 小场景 P0 |
| `assets/nodes/npc_merchant.png` | 256×256 | 货币 NPC（商人，金币堆/交易市场） | §4.2.4 小场景 P0 |
| `assets/nodes/npc_priest.png` | 256×256 | 虚构故事 NPC（祭司，篝火/神秘符号） | §4.2.4 小场景 P1（暂缓） |
| `assets/nodes/npc_scribe.png` | 256×256 | 想象的秩序 NPC（石碑书记，石碑/卷轴） | §4.2.4 小场景 P1（暂缓） |
| `assets/nodes/npc_emperor.png` | 256×256 | 帝国 NPC（帝王使者，王冠/旗帜） | §4.2.4 小场景 P1（暂缓） |
| `assets/nodes/npc_astronomer.png` | 256×256 | 科学革命 NPC（观星者，望远镜/星空图） | §4.2.4 小场景 P1（暂缓） |
| `assets/nodes/npc_*.png`（~12 张，根据实际节点需求补齐） | 256×256 | 剩余节点的 NPC 角色（工匠/铁匠/教师/工程师等，按节点内容设计） | PRD §4.2.2 "≤20 节点" |
| `assets/nodes/node_unknown.png` | 128×128 | 未解锁节点占位图（问号图标） | §11.2 节点不可见态 |

### 11.3 导师 NPC（全程引导角色）

| 文件 | 尺寸 | 用途 | PRD 映射 |
|---|---|---|---|
| `assets/characters/mentor_old_scholar.png` | 512×512 | 老学者头像（对话浮窗中显示） | §4.2.1 / §4.2.5 / §4.2.6 |
| `assets/characters/mentor_old_scholar_half_body.png` | 512×512 | 老学者半身立绘（用于翻卡阅读时的立绘） | §4.2.5 "老学者翻卡" |
| `assets/characters/scholar_walk_sprite_sheet.png` | 1024×256（4 帧 × 4 方向） | 学者化身（主角），走路动画精灵图（含 idle / walk_*） | §4.2.3 "节点点击 → 学者化身移动" |

### 11.4 对话 UI 素材

| 文件 | 尺寸 | 用途 | PRD 映射 |
|---|---|---|---|
| `assets/ui/dialogue/dialogue_box_frame.png` | 1200×400 | 对话外框底图（九切片风格，可平铺中间区域） | §4.2.5 / §4.2.6 对话容器 |
| `assets/ui/dialogue/dialogue_panel_what.png` | 900×360 | What 翻卡专用底框（略大，适合三张卡片并排） | §4.2.5 |
| `assets/ui/dialogue/card_definition.png` | 360×240 | What "定义"卡背景 | §4.2.5 whatCards[0] |
| `assets/ui/dialogue/card_example.png` | 360×240 | What "例子"卡背景 | §4.2.5 whatCards[1] |
| `assets/ui/dialogue/card_bridge.png` | 360×240 | What "连接"卡背景 | §4.2.5 whatCards[2] |
| `assets/ui/dialogue/choice_highlight.png` | 380×260 | 用户选择的卡片高亮（外框 + 金色边框） | §4.2.5 "轻量确认" |
| `assets/ui/dialogue/feedback_frame.png` | 800×400 | 四段式反馈卡外框 | §4.2.6 |
| `assets/ui/dialogue/answer_input.png` | 800×80 | 回答输入框背景 | §4.2.6 |

### 11.5 HUD / UI 通用图标

| 文件 | 尺寸 | 用途 | PRD 映射 |
|---|---|---|---|
| `assets/ui/hud_fog_percentage_bg.png` | 260×80 | HUD 迷雾百分比条背景 | §4.2.3 / §8.11 |
| `assets/ui/icon_lock.png` | 64×64 | 深度切换器锁定态图标 | §4.2.3 "锁形图标" |
| `assets/ui/icon_what.png` | 64×64 | What 深度图标（太阳/知识） | §4.2.3 深度切换器 |
| `assets/ui/icon_how.png` | 64×64 | How 深度图标（齿轮/机制） | §4.2.3 |
| `assets/ui/icon_why.png` | 64×64 | Why 深度图标（箭头/因果链） | §4.2.3 |
| `assets/ui/icon_system.png` | 64×64 | System 深度图标（星座/系统图） | §4.2.3 |
| `assets/ui/icon_arrow_prev.png` | 64×64 | 上一张按钮 | §4.2.5 |
| `assets/ui/icon_arrow_next.png` | 64×64 | 下一张按钮 | §4.2.5 |
| `assets/ui/icon_submit.png` | 64×64 | 提交回答按钮 | §4.2.6 |
| `assets/ui/icon_continue.png` | 64×64 | 继续追问按钮 | §4.2.6 |
| `assets/ui/icon_close.png` | 64×64 | 关闭按钮 | §4.2.5 |
| `assets/ui/halo_mastered.png` | 128×128 | 已掌握节点光圈（绿色） | §2.1.3 "completed" 视觉 |
| `assets/ui/halo_learning.png` | 128×128 | 学习中节点光圈（黄色脉冲） | §2.1.3 "learning" 视觉 |
| `assets/ui/halo_available.png` | 128×128 | 可进入节点光圈（白色低亮度） | §2.1.3 "available" 视觉 |
| `assets/ui/halo_clear.png` | 256×256 | 完整通关节点超大光晕（紫金色，原问回响完成） | §4.2.7 nodeClear |

### 11.6 迷雾与粒子素材

| 文件 | 尺寸 | 用途 | PRD 映射 |
|---|---|---|---|
| `assets/fog/fog_particle_1.png` | 64×64 | 紫蓝色径向渐变粒子（主粒子） | §4.2.8 迷雾粒子系统 |
| `assets/fog/fog_particle_2.png` | 64×64 | 深紫径向渐变粒子（深色叠加） | §4.2.8 |
| `assets/fog/fog_particle_3.png` | 64×64 | 带纹理的灰紫粒子（补充层次） | §4.2.8 |
| `assets/fog/fog_tile.png` | 512×512 | 迷雾平铺底图（用于大面积 fog 覆盖层） | §4.2.8 |
| `assets/fog/flash_center.png` | 256×256 | 节点中心闪光贴图（白色径向渐变） | §4.2.8 动画分镜 1 |
| `assets/fog/radial_ring.png` | 256×256 | 辐射光圈贴图（向外扩散用） | §4.2.8 分镜 2 |
| `assets/fog/punch_out.png` | 512×512 | punch-hole 遮罩（黑色径向渐变，用于从节点向外"挖洞"） | §4.2.8 分镜 3 |
| `assets/fog/reveal_sparkle.png` | 128×128 | 节点浮现时的金光闪粒 | §4.2.8 分镜 4 |

### 11.7 小场景素材（3 个 P0 + 4 个 P1 暂缓）

| 文件 | 尺寸 | 用途 | 对应节点 |
|---|---|---|---|
| `assets/scenes/cave_fire/` 目录 | 多文件 | 洞穴壁画前的火堆 + 故事场景 sprite sheet：`cave_bg.png`（洞穴背景 1024×576）、`fire_spritesheet.png`（8 帧火焰动画）、`people_shadow.png`（人物剪影）、`wall_symbols.png`（壁画符号） | 认知革命 |
| `assets/scenes/grain_field/` 目录 | 多文件 | 粮仓田野场景：`field_bg.png`、`wheat_spritesheet.png`（麦浪 4 帧）、`old_farmer.png`（老农立绘）、`grain_sack.png`（粮袋堆） | 农业革命 |
| `assets/scenes/market_trade/` 目录 | 多文件 | 市场交易场景：`market_bg.png`、`gold_coin_spritesheet.png`（金币旋转 8 帧）、`merchant_avatar.png`（商人立绘）、`customer.png`（顾客立绘） | 货币 |
| `assets/scenes/temple_myth/` 目录（P1 暂缓） | 多文件 | 祭司讲神话场景 | 虚构故事 |
| `assets/scenes/stone_law/` 目录（P1 暂缓） | 多文件 | 石碑规则场景 | 想象的秩序 |
| `assets/scenes/empire_gate/` 目录（P1 暂缓） | 多文件 | 帝国城门场景 | 帝国 |
| `assets/scenes/stargazing/` 目录（P1 暂缓） | 多文件 | 观星者场景 | 科学革命 |

### 11.8 加载动画

| 文件 | 尺寸 | 用途 |
|---|---|---|
| `assets/loading/explorer_spritesheet.png` | 1024×128（8 帧 128×128） | 探险家绘制地图动画（用于 PDF 上传→生成世界阶段的等待画面） |

### 11.9 徽章与世界封面

| 文件 | 尺寸 | 用途 | PRD 映射 |
|---|---|---|---|
| `assets/badges/badge_fog_cleared.png` | 256×256 | 区域征服徽章（完成《人类简史》全部节点） | §4.2.7 / P1 加分项 |
| `assets/world_cover_sapiens.png` | 512×288 | 《人类简史》世界封面（世界列表缩略图） | 世界列表页面 |
| `assets/world_cover_economics.png` | 512×288 | 《经济学原理》第一章世界封面 | 世界列表页面 |

---

## 12. 素材总表（快速清单）

- **世界背景**：4 张（what/how/why/system，1920×1080 PNG）
- **节点 NPC 头像**：最多 20 张（256×256 PNG，透明背景）
- **导师 NPC**：2 张（头像 256×256、立绘 512×512）
- **学者化身**：1 张（1024×256，4 方向 × 4 帧 sprite sheet）
- **对话 UI**：8 张（dialogue box frame, What panel, 3 张卡背景, 高亮, 反馈框, 输入框）
- **HUD 图标**：14 张（迷雾百分比 bg, 锁/what/how/why/system 图标, 4 个操作按钮, 3 个节点状态光晕, 1 张完整通关光晕）
- **迷雾粒子**：7 张（3 种粒子 + 平铺底图 + 中心闪光 + 辐射光圈 + punch hole 遮罩）
- **小场景**：3 个完整场景，每个场景 ~4 张素材（背景 + 1-2 张动画精灵 sheet + 2-3 张立绘）
- **加载动画**：1 张（8 帧 spritesheet）
- **徽章与封面**：3 张（1 徽章 + 2 世界封面）

**保守估算总图片数：4 + 20 + 2 + 1 + 8 + 14 + 7 + ~15 + 1 + 3 ≈ 75 张图像资产**

---

## 13. 与旧方案（Canvas 2D）的差异

| 项 | 旧方案（Canvas 2D） | 新方案（PixiJS v8） |
|---|---|---|
| 地图渲染 | 手写 Canvas 2D 绘制 | PixiJS SceneGraph（@pixi/react） |
| 节点坐标 | 前端自动布局 | 从 JSON 取（PRD §2.1.4 新增字段支持） |
| 节点视觉 | 圆形节点 + 字符节点名 | 关卡 NPC 头像 sprite + 谜题标题（不显示节点名） |
| What 交互 | 跟 How/Why/System 同一段回答逻辑 | 独立翻卡阅读 + 轻量确认（无打字） |
| 关卡 NPC | 未做 | 有（mysteryQuestion + 终问回响） |
| 小场景 | 未做 | 5-8 秒像素小场景，首次进入 What 播放 |
| 门禁 | 仅简单解锁 | 完整向上门禁 + 依赖解锁 + 只显露 1 个下一节点 |
| 迷雾动画 | 简单扩散 | 5 个分镜的动画时序 |
| 粒子 | 每帧手写 canvas.arc | ParticleContainer（GPU 加速） |
| 深度切换 | 背景图重新绘制 | 交叉溶解动画（alpha tween） |
| 状态管理 | useState | Zustand（共享状态，门禁、对话、小场景、进度） |
| 性能 | 1080p ≈ 20-25 fps | 1080p ≥ 40-50 fps |

---

## 14. 开发节奏建议

| 阶段 | 时间 | 产出 |
|---|---|---|
| Day 1 | 0.5 天 | 升级脚手架：Vite + React + TS + Tailwind + PixiJS v8 + @pixi/react + Zustand + GSAP |
| Day 2-3 | 1.5 天 | 类型与状态层：world.ts / feedback.ts + worldStore + nodeStore + dialogStore；预制世界 JSON |
| Day 4-6 | 3 天 | PixiJS 地图核心：DepthBackground + NodeSprite（关卡 NPC + 谜题标题）+ ScholarSprite + FogLayer punch hole |
| Day 7-9 | 3 天 | 对话 UI：DialogBox（用 dialogue_box_frame.png 底框）+ MentorAvatar + WhatCards（翻卡+轻量确认）+ FeedbackCard |
| Day 10-12 | 3 天 | 小场景引擎 + 3 个 P0 小场景接入 |
| Day 13-15 | 3 天 | 深度切换器 + 门禁逻辑 + 迷雾消散 5 分镜动画 + HUD 百分比 |
| Day 16-18 | 3 天 | 原问回响 + 节点完整通关 + 反馈四象限调试 + 最小必要讲解（≤120 字） |
| Day 19-20 | 2 天 | 后端 API 联调 + 本地 fallback 兜底文本 + 性能优化（粒子数/节点数/缓存策略） |
| Day 21-25 | 5 天 | 打磨：节点配色、生物群系背景细节、HUD、小场景动画时序 |

**总计：25 个工作日 / 5 周**（初赛 30 天内完成，留 5 天 buffer）
