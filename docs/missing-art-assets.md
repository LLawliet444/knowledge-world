# 美术素材缺失清单

> 基于 [frontend-tech-design.md §11](docs/frontend-tech-design.md#L344-L467) 规范，以 `assets/` 目录现有文件为基准。
> 更新日期：2026-06-17
> 状态：product 分支开发中

---

## 一、必须补齐（P0 — 阻塞 demo 演示）

### 1. P0 小场景动画精灵（3 项）

小场景要求 5-8 秒像素动画，PRD §4.2.4 明确使用 **AnimatedSprite** 驱动。以下 3 个场景的背景图和 NPC 头像已齐全，缺动画精灵 sheet。

| # | 场景 | 节点 | 缺失文件 | 规格要求 | 用途 |
|---|---|---|---|---|---|
| 1 | 洞穴火堆 | 认知革命 | `assets/scenes/cave_fire/fire_spritesheet.png` | 256×64（4 帧 64×64，水平排列） | 洞穴火把/篝火摇曳动画，用于 5-8 秒小场景 |
| 2 | 金色麦浪 | 农业革命 | `assets/scenes/grain_field/wheat_spritesheet.png` | 256×64（4 帧 64×64，水平排列） | 田野麦穗随风摆动动画，用于小场景 |
| 3 | 金币旋转 | 货币 | `assets/scenes/market_trade/gold_coin_spritesheet.png` | 512×64（8 帧 64×64，水平排列） | 金币正面旋转 8 帧动画，货币场景核心视觉 |

> **Prompt 模板**（供 AI 生成参考）：
> ```
> Pixel art, 16x16 sprite, [场景], [帧描述],
> transparent background, PNG, no outlines,
> game asset, no antialiasing, clean pixel grid
> ```

---

## 二、加分项（P1 — 显著提升观感，初赛前补齐）

### 2. 世界封面（2 项）

用于世界列表页面（PRD §4.2 未列入初赛主链路，但初赛提交需有完整入口体验）。

| # | 缺失文件 | 规格要求 | 用途 |
|---|---|---|---|
| 4 | `assets/badges/world_cover_economics.png` | 512×288 PNG，带透明背景或统一边框 | 《经济学原理》第一章世界列表缩略图 |
| 5 | `assets/badges/badge_fog_cleared.png` | 256×256 PNG，透明背景 | 区域征服徽章（完整通关《人类简史》全部节点后展示） |

> **Prompt 模板**：
> ```
> Pixel art game badge, [世界/主题名称] icon,
> ornate medieval/fantasy style, parchment texture,
> [对应色调：What=暖黄 / How=金绿 / Why=棕褐 / System=紫蓝],
> transparent background, PNG, no antialiasing
> ```

---

## 三、暂缓（P2 — 复赛或后续迭代）

### 3. P1 节点小场景动画精灵（4 项）

以下 4 个场景已有背景图 + NPC 头像 + focus_symbol，缺动画精灵。P1 阶段可使用静态图替代，不阻塞初赛。

| # | 场景 | 节点 | 缺失文件 | 规格要求 |
|---|---|---|---|---|
| 6 | 祭司篝火 | 虚构故事 | `assets/scenes/temple_myth/fire_spritesheet.png` | 256×64（4 帧 64×64） |
| 7 | 石碑场景 | 想象的秩序 | `assets/scenes/stone_law/stone_spritesheet.png` | 256×64（4 帧 64×64，暂无具体动画需求可留空） |
| 8 | 帝国城门 | 帝国 | `assets/scenes/empire_gate/flag_spritesheet.png` | 256×64（4 帧 64×64，旗帜飘动） |
| 9 | 观星台 | 科学革命 | `assets/scenes/stargazing/star_spritesheet.png` | 256×64（4 帧 64×64，星光闪烁） |

---

## 四、已齐全但命名差异（供参考，不影响使用）

以下现有文件功能上等效于规范要求，PixiJS 实现直接使用现有文件即可，无需补齐。

| 规范要求文件名 | 现有等效文件 | 说明 |
|---|---|---|
| `scholar_walk_sprite_sheet.png`（4×4 合并版） | `scholar_apprentice_sprite_walk_{down,right,left,up}_4f_clean.png`（4 张分方向单方向精灵表） | 功能完全等效；PixiJS AnimatedSprite 实际需要的就是分方向精灵，现有更利于实现 |
| `world_map_sapiens.jpg` | `world_map_sapiens.jpg` ✅ | 规范 §11 漏列，已存在 |
| 小场景 NPC 立绘 | 各 `scenes/*/gate_npc.png` ✅ | 规范 §11.7 要求的 NPC 立绘已齐全 |

---

## 五、素材统计

| 类别 | 要求总数 | 已有 | 缺失（P0） | 缺失（P1） | 缺失（P2） |
|---|---|---|---|---|---|
| 世界背景 | 4 | 4 | 0 | 0 | 0 |
| 节点 NPC 头像 | 8 | 8 | 0 | 0 | 0 |
| 导师 NPC | 2 | 2 | 0 | 0 | 0 |
| 学者化身 | 1 | 1（分方向） | 0 | 0 | 0 |
| 对话 UI | 8 | 8 | 0 | 0 | 0 |
| HUD / 图标 | 15 | 15 | 0 | 0 | 0 |
| 迷雾粒子 | 8 | 8 | 0 | 0 | 0 |
| 小场景（背景 + NPC + 精灵） | 7 场景 × 3-4 文件 | 背景 7 + NPC 7 + focus 7 = 21 | **3**（P0 动画精灵） | 0 | **4**（P2 动画精灵） |
| 加载动画 | 1 | 1（含多种格式） | 0 | 0 | 0 |
| 徽章与世界封面 | 3 | 1 | 0 | **2** | 0 |
| **合计** | **~75** | **~73** | **3** | **2** | **4** |

**P0 缺失：3 项（全部为小场景动画精灵）**
**P1 缺失：2 项（世界封面）**
**P2 缺失：4 项（P1 节点动画精灵）**

---

## 六、P0 优先级说明

P0 的 3 项缺失均为小场景动画精灵，用于 PRD §4.2.4 要求的"首次进入节点 What 层时播放 5-8 秒像素小场景"：

- 认知革命洞穴场景（`cave_fire`）：火焰/火把摇曳是场景氛围核心，缺动画精灵小场景只剩静态图
- 农业革命田野场景（`grain_field`）：麦浪是场景核心视觉，缺动画精灵则小场景退化为 PPT 翻页
- 货币市场场景（`market_trade`）：金币旋转是"信任让交换成立"的核心隐喻，缺动画精灵视觉冲击力大幅下降

3 个 P0 小场景是初赛 demo 最直接的视觉记忆点，**建议优先生成**，其余内容可暂缓。
