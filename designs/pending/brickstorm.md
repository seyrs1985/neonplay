# Brickstorm (brickstorm)

> 一句话卖点：**打砖块的手感 × 吸血鬼幸存者的构筑**——挡板接球、弹幕削砖、三选一升级，波次无限压境，看你能撑到第几波。

- **缝合来源**：Breakout（弹球物理 + 砖块击破 + 挡板走位）+ Vampire Survivors（自动攻击 + 波次生存 + 升级三选一 roguelite 构筑）[+ Ball x Pit 验证过的成熟混合公式，只借结构不借内容]
- **目标玩家**：13-35 岁网页休闲玩家；喜欢 roguelite"再来一局"的移动端 + 桌面端双端用户；玩腻了纯打砖块和纯躲闪的老玩家
- **单局时长**：3-6 分钟（现有 8 款游戏多为 1-3 分钟，本作拉长时长、提升广告库存）

---

## 一、调研依据（2026-09 当期）

### 热门拆解

| 热门游戏 | 核心循环 | 操作 | 美术/节奏 | 商业化 |
|---|---|---|---|---|
| **Block Blast!**（2025-2026 全球手游下载量第一，5.26 亿次） | 拖方块上 8×8 盘 → 消行/列 → 得分续局 | 纯拖拽 | 明亮色块；碎片化长会话 | 激励广告复活 + 插屏 |
| **Ball x Pit**（Devolver 发行，2025 现象级独立爆款） | 弹球上行削砖怪 → 捡经验升级三选一 → 波次压境 | 挡板左右移动 | 像素+弹幕；一局 10-20 分钟 | 买断制（Steam），无内购 |
| **Level Devil / Drive Mad**（Poki 热榜头部） | 试错闯关 → 即死即重开 | 一键/方向键 | 极简几何；10-60 秒/关 | 片头+插屏广告 |
| **Color Block Jam**（2025-2026 上升期，美区 iOS 畅销 Top50） | 滑动彩块让同色出门 → 顺序解谜 | 纯滑动 | 软糖质感；2-5 分钟/关 | 激励广告道具 + 体力墙 |

### 同构分析（饱和度）
- **纯打砖块克隆**：极度饱和，卷美术与关卡数，无成长系统，网页端搜"breakout"全是同质品。
- **Vampire Survivors-like 网页版**：饱和度高，但形态清一色是"角色移动 + 自动射击"，靠走位躲弹幕。
- **打砖块×幸存者的精确混合**：Ball x Pit 本体是 Steam 买断制，社区（r/roguelites、r/gamerecommendations）反复出现"games like Ball x Pit"求荐帖，公认最接近的只有 Steam 的 Breaking Survivors——**HTML5 免费网页端供给近乎空白**，而搜索需求已被 Steam 爆款教育完成。机会窗口明确。

### 异构分析（NeonPlay 现有 8 款的缺口）
现有品类盘点：Neon Tide + Flappy Dash（一键躲避 ×2）、Snake + Breakout（经典街机 ×2）、2048 + 扫雷 + 记忆翻牌 + 井字棋（静态益智 ×4）。
- **缺口 1：无 roguelite/升级构筑**——8 款全是固定数值，没有"局内变强"的多巴胺回路。
- **缺口 2：无波次生存/无限模式**——除 Flappy 外全是固定关卡或固定盘面。
- **缺口 3：无弹道弹跳玩法**——Breakout 只有单球直线反弹的古典形态。
- 开发侧：站点已有 Breakout（圆-矩碰撞、球体反射代码心智）与 Neon Tide（canvas bootstrap/霓虹美术规范），**复用率最高的差异化新品**。

### 组合为何成立
1. **反馈回路互补**：Breakout 提供瞄准与弹射的即时操作反馈，恰好补上幸存者类"操作感薄弱"的老毛病；幸存者的升级构筑提供局内长线成长，恰好补上打砖块"五分钟看穿全部"的内容枯竭。
2. **零门槛决策**：挡板左右移动是全民操作；三选一升级是被 Balatro/幸存者验证过千次的低认知负荷决策。
3. **无内容生产瓶颈**：程序化波次替代手工关卡，难度随波次递增自动成立，适合本站"一轮 15 分钟"的 Agent 开发流水线。

---

## 二、玩法设计

### 核心循环（4 步）
1. **接球**：球从空中落回，左右移动挡板接住，球瞬间向上弹射（接球位置决定弹射角）。
2. **削砖**：球在缓缓下压的砖怪阵中弹跳，每颗砖有 HP 数字，打空即碎，掉经验珠与分数。
3. **构筑**：经验条满 → 时间暂停 → 三选一升级（多球/伤害/球速/穿透/接球面），弹幕越滚越暴力。
4. **承压**：波次推进、砖阵每 8 秒下压一格，压到底线扣 1 命（共 3 命）；构筑速度追不上就死，结算冲最佳。

### 数值骨架（MVP 版）
- 砖 HP：第 1 波=1，之后每 2 波 +1（封顶 9）；行数每 3 波 +1（封顶 6 行）。
- 连击倍率：2 秒内连续击破，倍率 +0.1（封顶 ×3），断链清零——击破越密集分越高。
- 球循环：球落底 0.8 秒后回队列，从挡板当前位置自动上抛（±15° 随机），无需手动瞄准发射。

### 操作方案
| 端 | 操作 |
|---|---|
| 触屏 | 按住屏幕左右拖动 = 挡板跟随手指横移（相对位移，手指不遮挡板）；`touch-action:none` 防滚动 |
| 键盘 | `←`/`→` 或 `A`/`D` 移动；`P` 或 `Esc` 暂停（升级面板同键恢复） |
| 鼠标 | 移动即挡板跟随（桌面端最低门槛） |

### 美术方向（霓虹色板）
- 底色 `#0a0a18` 深空 + 呼吸网格（复用 Snake 重制规范）。
- 球：`#00e5ff` 青，拖尾辉光；多球时球色在青/紫 `#7c4dff` 间轮转。
- 砖怪：HP 低→高 = 品红 `#ff2d95` → 紫 `#7c4dff` → 金 `#ffd54a`，HP 数字直接印在砖面，受伤白闪。
- 特效：击破粒子爆花、升级时全屏光柱 + 三选一玻璃拟态面板、死亡震屏红闪（全部复用站内既有特效模式，零外部素材）。

### 商业化
- **广告位**：落地页构建器默认注入位照旧（页头横幅）；结算面板预留"激励广告位"注释（复活/双倍分数），待 AdSense 接入后启用，MVP 只留结构注释不实现。
- **留存钩子**：
  - 升级构筑本身就是局内钩子（"下一局试试穿透流"）；
  - 连击倍率 ×3 冲分；
  - 最佳分数 + 最高波次 localStorage 持久化，结算页对比展示；
  - 每日挑战（固定种子，全站同题）列为 P2，不在 MVP。

---

## 三、SEO

**关键词簇**：`brick breaker roguelite` / `breakout with upgrades` / `games like ball x pit free` / `ball x pit browser alternative` / `vampire survivors breakout online` / `neon brick breaker unblocked` / `survivor breakout game`

标题建议：`Brickstorm — Neon Brick Breaker Roguelite | Breakout × Survivor Upgrades`

**FAQ 4 条要点（落地页 FAQPage schema）**：
1. **What is Brickstorm?** — A free browser roguelite that fuses brick-breaker physics with Vampire-Survivors-style upgrade builds; catch balls, smash brick waves, pick upgrades.
2. **How do upgrades work?** — Collect XP from destroyed bricks; every level-up pauses the game and offers 3 random upgrades that stack for the rest of the run.
3. **Can I play on mobile?** — Yes. Touch-drag to move the paddle, fully responsive, no download or signup; keyboard (←→/AD) and mouse also supported.
4. **What's the best strategy?** — Multiball first (each ball is full DPS), then damage or pierce; keep combos alive by hitting clusters, and never let the wall reach the bottom line.

落地页同款要求：VideoGame schema、game-first 首屏布局、面包屑、推荐位挂 Breakout 与 Neon Tide（品类近邻互链）。

---

## 四、MVP 范围（开发 Agent 一轮 ≤15 分钟可完成）

**做**：
- 结构仿站内惯例：`index.html + game/style.css + game/js/main.js + game/js/game.js`，逻辑分辨率 480×720，canvas 自适应 + DPR（复用 Neon Tide bootstrap）。
- 挡板移动（触屏相对拖动 / 键盘 / 鼠标）、球体圆-矩碰撞反射（子步进 2 次防高速隧穿，球速上限封顶）。
- 无限波次：砖阵顶部刷入、每 8s 下压一格、HP/行数按上文公式递增；压线扣命，3 命耗尽结算。
- 球自动循环发射；经验珠自动吸附；升级三选一面板（暂停游戏）含 **5 种升级**：+1 球 / +1 伤害 / 球速 +20% / 穿透 1 层 / 接球面 +25%。
- 分数 + 连击倍率、最佳分数/最高波次 localStorage、击破粒子、升级光柱、死亡震屏。
- 落地页：game-first 布局 + VideoGame/FAQPage schema + 4 条 FAQ + 推荐位。

**不做（明确砍掉）**：音频、角色/城市 meta 系统、每日挑战、激励广告实现、成就、多语言。
**超时降级顺序**：若 15 分钟吃紧 → 先砍"穿透"与"连击倍率"，保多球/伤害/球速三升级与波次主线。

---

## 五、验收标准

1. 线上 `/brickstorm/` HTTP 200，落地页 game-first 首屏（游戏框在顶部，与既有 8 款一致），无控制台报错。
2. 触屏拖动挡板 60fps 跟手（中端安卓实测不卡顿），`touch-action:none` 生效（页面不被拖动滚动）；键盘 ←→/AD/P 可完整游玩。
3. 升级面板出现时游戏暂停、选择后恢复；三选一为随机不重复选项；各升级效果可感知（多球数量、砖掉血速度可见变化）。
4. 波次无限推进且 HP/行数递增可观察；砖阵压线扣命逻辑正确；3 命耗尽出结算，刷新页面后最佳分数/波次保留。
5. 高速球无穿砖（子步进生效）；iOS Safari 与桌面 Chrome 双端冒烟通过。
6. IndexNow 提交新 URL；`STATUS.md` 运营日志追加一行；开发侧向 `data/run_stats.jsonl` 追加记录（惯例照旧）。

---

*产出：NeonPlay 市场分析+游戏策划 Agent · 2026-09-11 · 调研来源：Poki/CrazyGames 热榜、Singular/Business of Apps 2025-2026 手游下载榜、PC Gamer/Kotaku/XDA Ball x Pit 报道、r/roguelites 需求帖*
