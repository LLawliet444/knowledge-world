# Knowledge World Frontend

Web MVP 前端 —— 像素风探索式认知学习地图。

前端基于 **React 18 + Vite**，使用 **PixiJS** 渲染主地图与节点精灵，**Zustand** 管理全局状态。核心是把学习体验做成"探索未知世界"：用户操控学者化身在四张深度地图上行走，点击节点触发 NPC 对话、翻卡收集、苏格拉底问答与终问回响。

## 技术栈

- **React** 18.3 + **TypeScript** 5.4 —— UI 框架与类型系统
- **Vite** 5.2 —— 开发与构建工具
- **pixi.js** 7.4 + **@pixi/react** 7.1 —— 地图与精灵渲染（WebGL）
- **gsap** 3.12 —— 动画补间
- **zustand** 4.5 —— 轻量状态管理（含 persist 中间件）
- **tailwindcss** 3.4 —— 原子化 CSS

## 目录结构

```
frontend/
├── index.html
├── package.json
├── vite.config.ts                # publicDir 指向 ../../assets
├── tailwind.config.js
├── tsconfig.json
└── src/
    ├── main.tsx                  # 入口
    ├── App.tsx                   # 根组件（加载世界 + 布局）
    ├── api/
    │   ├── client.ts             # fetch 封装（超时+降级 fallback）
    │   └── nodes.ts              # 节点相关 API 调用
    ├── components/
    │   ├── map/
    │   │   ├── WorldMap.tsx              # 主地图（PixiJS Stage）
    │   │   ├── NodeSprite.tsx            # 节点精灵（icon/NPC 立绘 + 光圈）
    │   │   ├── ScholarSprite.tsx         # 学者主角精灵（4 方向行走）
    │   │   ├── GlowingPath.tsx          # 节点间发光连接路径
    │   │   ├── NodeLabelLayer.tsx       # 节点标签浮层（DOM）
    │   │   ├── NodeSpeechBubble.tsx     # 节点谜题气泡
    │   │   ├── DepthBackground.tsx      # 四层背景切换
    │   │   ├── DepthTransitionVideo.tsx # 层切换过场动画
    │   │   ├── FogLayer.tsx             # 认知迷雾遮罩
    │   │   └── SmallScene.tsx           # 节点小场景预览
    │   ├── dialog/
    │   │   ├── DialogBox.tsx            # 对话框主容器（分发各子对话框）
    │   │   ├── ChatDialog.tsx           # 苏格拉底问答对话
    │   │   ├── FinalQuestionDialog.tsx   # 终问回响对话
    │   │   ├── IntroGuide.tsx           # 节点入场引导（场景 + 对白）
    │   │   ├── LayerClearanceDialog.tsx  # 层通关弹窗
    │   │   ├── ThinkingNotePage.tsx      # 笔记整理页
    │   │   ├── MyBookPage.tsx           # 我的认知书
    │   │   ├── NodeMemorialDialog.tsx    # 节点纪念弹窗
    │   │   ├── ApprenticeAvatar.tsx      # 学徒头像（canvas 裁剪）
    │   │   ├── MentorAvatar.tsx          # 老学者头像
    │   │   ├── QuestionBubble.tsx        # 问题气泡
    │   │   └── ScholarLoading.tsx        # 加载动画
    │   ├── scene/
    │   │   └── ScenePlayer.tsx          # 入场过场动画播放器
    │   └── ui/
    │       ├── HUD.tsx                   # 顶部进度 HUD
    │       ├── LegendBar.tsx             # 底部图例
    │       ├── SideToolbar.tsx           # 右侧工具栏
    │       └── common/PixelButton.tsx    # 像素按钮
    ├── data/
    │   ├── index.ts
    │   ├── sapiens.ts                    # 《人类简史》7 节点定义
    │   └── economics.ts                  # 经济学 5 节点定义
    ├── store/
    │   ├── worldStore.ts                 # 世界/节点进度（persist）
    │   ├── dialogStore.ts                # 对话框状态
    │   ├── knowledgeStore.ts             # 笔记（persist 到 localStorage）
    │   ├── bgmStore.ts                   # 背景音乐
    │   └── uiStore.ts                    # UI 状态
    ├── types/
    │   ├── world.ts                      # WorldNode / World / DepthState
    │   └── feedback.ts                   # 反馈类型
    ├── constants/
    │   ├── node.ts                        # 节点视觉常量
    │   └── biome.ts                      # 地形常量
    ├── utils/
    │   ├── depthGate.ts                  # 层级解锁判定
    │   ├── preloadTextures.ts            # PixiJS 纹理预加载
    │   ├── pixel.ts                       # 像素图片加载
    │   ├── keywordExtractor.ts           # 关键词提取
    │   └── exportNote.ts                 # 笔记导出
    └── styles/
        └── globals.css
```

## 快速开始

### 1. 安装依赖

```bash
cd apps/frontend
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env.local
# 编辑 .env.local
```

`.env.local` 字段：

| 字段 | 说明 | 默认值 |
|---|---|---|
| `VITE_API_BASE_URL` | 后端 API 地址 | `http://localhost:8001` |

### 3. 启动开发服务器

```bash
npm run dev
```

开发服务器跑在 `http://localhost:5173`，支持 HMR。

### 4. 构建生产版本

```bash
npm run build      # 输出到 dist/
npm run preview    # 预览构建产物
```

## 静态资源

`vite.config.ts` 中 `publicDir: "../../assets"`，所有图片/音频通过根路径引用：

- `/nodes/*.png` —— 旧版节点图标与 NPC 立绘
- `/scenes/{visualHint}/focus_symbol.png` —— 章节抽象图标（128×128，作节点 icon）
- `/scenes/{visualHint}/gate_npc.png` —— 场景 NPC 立绘（作 iconNpc）
- `/scenes/{visualHint}/*_spritesheet.png` —— 场景特效精灵表
- `/characters/*.png` —— 学者主角与导师立绘
- `/biomes/world_*.png` —— What/How/Why/System 四层背景
- `/video_background/screen_*_background.png` —— 入场过场背景
- `/audio/*.mp3` —— BGM

## 核心模块说明

### WorldMap（主地图）

PixiJS Stage 渲染全屏地图。挂载时调用 [preloadTextures.ts](src/utils/preloadTextures.ts) 预加载所有纹理到 `PIXI.utils.TextureCache`，避免运行时 lazy load 导致的闪烁。每个节点用 `NodeSprite` 渲染，根据 `finalQuestion` 状态决定显示 `iconNpc`（NPC 立绘，未通关）还是 `icon`（章节抽象图标，已通关）。

### 节点精灵缩放

[NodeSprite.tsx](src/components/map/NodeSprite.tsx) 按**纹理实际高度**归一化到统一显示高度，避免不同原图尺寸（864×1024 vs 128×128）显示大小不一：

- NPC 模式（iconNpc）：目标高度 144px，hover ×1.2
- icon 模式（focus_symbol）：目标高度 84px，hover ×1.2

通过监听 PIXI 纹理的 `update` 事件在解码完成后触发重渲染，避免占位纹理（1×1）被错误归一化。

### 四层认知模型

World / Node 同时具有 4 个深度状态：`What` / `How` / `Why` / `System`。每个深度是**独立地图**，同一批节点在 4 张地图里坐标不变，用户以学者化身反复抵达同一节点，看到理解逐层加深。

- **What**：翻卡阅读，收集事实与概念（前端纯本地，无后端交互）
- **How / Why / System**：苏格拉底问答，调后端 API 推进状态机
- 进入更高层需先完成前一层至少一个节点

### 状态管理

`worldStore` 用 zustand `persist` 中间件持久化到 localStorage，存储世界定义、节点进度、当前深度等。但**进度真源在后端 Redis**，前端刷新时若有 `sessionId` 会调 `restoreSession` 从后端拉取覆盖。

### DialogBox 对话分发

[DialogBox.tsx](src/components/dialog/DialogBox.tsx) 是对话框主容器，根据当前节点状态分发到不同子对话框：

- `IntroGuide`：节点入场场景 + 对白
- `ChatDialog`：How/Why/System 苏格拉底问答
- `LayerClearanceDialog`：层通关弹窗
- `FinalQuestionDialog`：终问回响
- `ThinkingNotePage`：笔记整理
- `NodeMemorialDialog`：节点纪念

### API 客户端降级

[client.ts](src/api/client.ts) 的 `apiFetch` 在后端不可用时自动降级返回 fallback 数据，保证开发期可演示。生产环境需确保后端可用。

## 节点数据结构

`src/data/sapiens.ts` 和 `economics.ts` 定义每个节点的：

- `id` / `name`：节点 ID 与名称
- `icon` / `iconNpc`：地图显示图标与 NPC 立绘路径
- `gateNpc.avatar`：门卫头像（对话用）
- `positions`：What/How/Why/System 四层地图坐标
- `neighbors` / `nextDiscoveryId`：邻接关系与解锁顺序
- `introScene`：入场过场配置（`visualHint` 决定场景资源目录）
- `whatDialogue` / `whatScrolls` / `whatWrapUp`：What 层翻卡内容
- `finalQuestion`：终问问题

## 开发说明

- 修改节点 `icon` / `iconNpc` 后需硬刷新浏览器（Cmd+Shift+R）清缓存
- 新增 PICI 纹理路径需同步加入 [preloadTextures.ts](src/utils/preloadTextures.ts)，否则纹理加载失败会抛 `Uncaught (in promise) Event`（PIXI 内部 ImageResource reject）
- 后端不可用时可只跑前端，API 调用会降级，但 How/Why/System 问答功能不可用
- 详细设计文档见 `docs/frontend-tech-design.md` 和 `docs/gameplay-redesign-v2.md`