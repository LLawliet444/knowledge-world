# Knowledge World 前端技术方案（初赛精简版）

> 目标：初赛演示可跑通的认知探索系统。只做演示必需的，其余全砍。

---

## 1. 交付范围

| 功能 | 是否包含 | 说明 |
|---|---|---|
| 预制世界加载 | ✅ | 前端硬编码 JSON，首屏即展示 |
| 节点点击交互 | ✅ | Canvas 点击检测 + 学者移动动画 |
| AI 苏格拉底提问 | ✅ | 点击节点后在对话框中展示 AI 提问 |
| 用户回答 + 反馈卡 | ✅ | 右侧显示诊断反馈卡（已理解/缺失/提示/追问）|
| 迷雾消散动画 | ✅ | GSAP + Canvas 粒子系统，节点解锁后播放 |
| PDF 上传生成世界 | ⚠️ | 尽量（后置接入，不阻塞初赛演示）|
| 世界列表 / 切换 | ❌ | 不做（固定加载第一个预制世界）|
| 区域征服徽章 | ❌ | 不做 |
| 学习进度持久化 | ❌ | 不做（仅内存状态，刷新重置）|
| 完整埋点 / 分析 | ❌ | 不做 |

---

## 2. 技术栈

| 层 | 选型 | 理由 |
|---|---|---|
| 框架 | React 18 + TypeScript | 组件化 + 类型安全 |
| 构建 | Vite 5 | 极速冷启动 / HMR |
| 样式 | Tailwind CSS 3 | 像素风快速构建，颜色统一 |
| 地图渲染 | Canvas 2D API | 原生绘制节点、路径、生物群系，无外部图片依赖 |
| 动画 | GSAP 3 | 学者移动 + 迷雾消散动画时序调度 |
| 状态 | React useState | 单页面内存状态足够，砍掉 Zustand/SWR |
| 数据请求 | 原生 fetch | 仅 2 个 POST 接口，无需 SWR 缓存 |
| 图标 | Canvas 纯绘制 / emoji | 砍掉 lucide-react |
| 字体 | Press Start 2P + VT323 (Google Fonts) | 像素风标题/正文 |

**生产依赖**：`react`, `react-dom`, `gsap`（仅 3 个核心库）

---

## 3. 目录结构

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
    ├── main.tsx              # React 入口
    ├── App.tsx               # 单页面应用根组件（直接加载预制世界）
    ├── styles/globals.css    # Tailwind + 像素风全局样式
    ├── types/
    │   ├── world.ts          # World / Layer / Node / LayerType / NodeState
    │   └── feedback.ts       # DiagnosticResponse / FeedbackCard
    ├── data/                 # 预制世界（初赛硬编码）
    │   ├── sapiens.ts        # 《人类简史》世界 JSON
    │   ├── economics.ts      # 《经济学原理》世界 JSON
    │   └── index.ts          # 导出 PREBUILT_WORLDS 数组
    ├── api/
    │   ├── client.ts         # fetch 封装（带错误处理）
    │   └── nodes.ts          # getQuestion + getFeedback（内置 Fallback 文本）
    ├── components/
    │   ├── map/WorldMap.tsx  # Canvas 挂载点 + React 生命周期绑定
    │   ├── dialog/
    │   │   ├── DialogBox.tsx       # 底部对话浮窗容器
    │   │   ├── QuestionBubble.tsx  # AI 提问气泡
    │   │   └── FeedbackCard.tsx    # 诊断反馈卡（四象限展示）
    │   └── common/PixelButton.tsx  # 像素风按钮（提交/关闭）
    ├── engine/               # Canvas 渲染引擎（核心）
    │   ├── MapRenderer.ts       # 渲染主类（底图/节点/路径/化身/点击检测）
    │   ├── ForceLayout.ts       # 网格布局（每层横向均匀分布）
    │   ├── AnimationManager.ts  # GSAP 动画调度（学者移动/迷雾消散）
    │   └── FogSystem.ts         # 迷雾粒子系统（Canvas 径向渐变粒子）
    ├── constants/
    │   ├── biome.ts            # 四层生物群系颜色映射（黄→绿→棕→紫）
    │   └── node.ts             # 节点状态样式映射（未探索/已访问/学习/掌握/迁移）
    └── utils/pixel.ts          # Canvas 像素绘制辅助函数
```

---

## 4. 核心数据流

```
用户点击节点
    │
    ▼
 MapRenderer.hitTest() → 返回 nodeId
    │
    ▼
 App.setState({ currentNode, isDialogOpen: true })
    │
    ├── MapRenderer.moveScholarTo(nodeId)   ──┐
    │                                          │ 并行：1.5s 移动动画
    └── DialogBox useEffect → POST /question ──┘ 同时：请求 AI 提问
                                               │
                                               ▼
                                       对话框显示 AI 提问
                                               │
                                     用户输入回答 → 点击提交
                                               │
                                               ▼
                                       POST /feedback → 拿到 DiagnosticResponse
                                               │
                         ┌─────────────────────┼─────────────────────┐
                         ▼                     ▼                     ▼
             FeedbackCard 展示          节点状态更新          若 mastered/transfer
           （已理解/缺失/提示/追问）   （world state 更新）   → 迷雾消散动画
```

---

## 5. 地图渲染规范

- **画布基准**：1366 × 768（16:9），响应式铺满容器宽度
- **布局算法**：网格均匀分布（每层节点横向均匀分布，y 坐标由层级决定）
- **节点尺寸**：半径 22px，光晕 45px 半径
- **生物群系配色**：
  - What（认知大草原）：`#f4d37a → #e8b34f`（金黄）
  - How（结构丛林）：`#8fbf6d → #5d9c3f`（翠绿）
  - Why（原理高地）：`#c0a87a → #8b7355`（棕褐）
  - System（系统迷雾）：`#6b5b95 → #3d2f5c`（紫蓝，默认覆雾）
- **节点状态样式**：
  - `unexplored`：灰色圆 + `?` 字符
  - `visited`：深色边框 + 节点名
  - `learning`：黄色弱光晕
  - `mastered`：绿色强光晕
  - `transfer`：紫色光晕
- **迷雾粒子**：每未解锁节点生成 20-30 个紫蓝色径向渐变粒子，解锁后扩散淡出
- **学者化身**：蓝色圆 + 白色边框（半径 12px），跟随移动动画

---

## 6. 对话组件规范

- **位置**：固定在页面底部 38% 高度
- **左侧（60%）**：AI 提问气泡 + 用户回答输入框（≤500字）
- **右侧（40%）**：诊断反馈卡（四象限布局：已理解 / 缺失 / 提示 / 追问）
- **状态**：
  - `loading`：显示"思考中..."占位
  - `question`：显示 AI 提问 + 输入框
  - `feedback`：显示反馈卡 + "继续追问" 按钮
  - 若 `node_state = mastered/transfer`：额外显示"✓ 已解锁"按钮

---

## 7. API 接口约定

```
POST /api/v1/nodes/{node_id}/question
请求体: { node_id, node_name, layer, source_excerpt }
响应体: { question: string }

POST /api/v1/nodes/{node_id}/feedback
请求体: { node_id, node_name, source_excerpt, user_answer, round }
响应体: {
  cognitive_level: string,
  covered_dimensions: string[],
  main_misconception: string,
  missing_points: string[],
  next_best_question: string,
  feedback_level: "reinforce" | "hint" | "minimal_explain",
  feedback_card: { understood, missing, guidance, next_question },
  node_state: "unexplored" | "visited" | "learning" | "mastered" | "transfer"
}
```

**关键设计**：两个 API 函数内置 Fallback 文本。后端未启动时前端仍能演示（不阻塞开发节奏）。

---

## 8. 性能与渲染策略

| 场景 | 策略 |
|---|---|
| Canvas 渲染 | requestAnimationFrame 循环；节点/路径只在状态变化时重绘；迷雾粒子每帧更新 |
| 粒子数控制 | 1080p ≤ 200 个粒子总数；小屏自动减半 |
| 动画 | 学者移动 / 解锁用 GSAP transform（GPU 加速），不阻塞 Canvas 主线程 |
| 对话历史 | 每节点保留最近 5 轮，超出自动截断 |

---

## 9. 开发节奏

| 阶段 | 时间 | 产出 |
|---|---|---|
| Day 1-2 | 脚手架 | Vite + React + TS + Tailwind + 类型 + 预制世界 JSON |
| Day 3-5 | 地图引擎 | MapRenderer + 网格布局 + 节点/路径绘制 + 点击检测 |
| Day 6-8 | 动画系统 | 学者移动 + FogSystem 迷雾 + GSAP 解锁消散动画 |
| Day 9-11 | 对话系统 | DialogBox + FeedbackCard + API + Fallback 文本 |
| Day 12-15 | 后端接入 | 联调 2 个接口 + Prompt 质量调优 |
| Day 16-20 | 打磨 | 图标美化 + 生物群系纹理 + 字体/颜色 polish |

---

## 10. 与完整版的差异对比

| 项 | 初赛版 | 完整版（后续） |
|---|---|---|
| 页面数 | 1 页 | 3 页（上传/列表/地图） |
| 状态管理 | useState | Zustand + SWR |
| 持久化 | 不做 | localStorage |
| 地图布局 | 网格均匀 | 力导向布局 |
| API 接口数 | 2 个 | 5+ 个 |
| 上传生成 | 后置接入 | P0 |
| 世界列表 | 无 | 有 |
| 徽章系统 | 无 | 有 |
| 无后端演示 | ✅ 支持 | ❌ 依赖后端 |
