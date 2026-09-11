# Idle Neon Breaker (idle-neon-breaker)

> 一句话卖点：**挂着就能玩的 2048 打砖块**——球自己弹、砖自己合（2→4→8→16），离线全额收益、零强制广告，工作学习时开个后台标签，回来看金币落袋。

- **缝合来源**：Idle Breakout（放置弹球+商店升级）+ 2048（数字砖等值合并递增）+ Cookie Clicker（离线收益/挂机节奏）
- **目标玩家**：办公/学习挂背景页的"第二屏幕玩家"（idle 核心人群）；被强制广告劝退的 idle 手游难民；2048 老玩家（数字成长直觉零学习成本）
- **单局形态**：无"局"的概念——开放进程，前台看弹球 30 秒或后台挂 2 小时都成立

---

## 〇、差异化红线回答（LESSONS.md 第 8 条）

**"比 Google 搜索前 3 名多做了什么？"**——搜 "idle breakout game" 的前排是门户版 Idle Breakout 及其像素级克隆（社区对无新意克隆的原话：*"looks a bit TOO much like idle breakout"*）。本作：

1. **2048 合并递增机制**（Idle Breakout 及其克隆都没有）：砖上印数字=HP，每 20 秒全场等值合并 2+2→4、4+4→8……板面自动升级，玩家弹球火力必须追着数字跑——把"挂机看数字涨"的爽感和策略性同时做出来。→ 满足红线"组合两个已有玩法"。
2. **离线收益全额、无上限**——直接回应 r/incremental_games 置顶级抱怨（*"games that allow offline progress but have an arbitrary cap to it. Don't make me come back every 1-2 hours"*）。→ 满足红线"解决 Reddit/Quora 上有人抱怨找不到好方案的问题"。
3. **零强制广告承诺写进产品**——"forced ads = instant boot" 是该社区最强共识；本站无插屏架构天然满足，且作为卖点明示。
4. **首发即多语言**（zh/es/pt/ru，复用站点 i18n）——idle 品类几乎从不本地化，中文市场供给空白。

## 评分卡（按运营入队线口径）

| 维度 | 分 | 说明 |
|---|---|---|
| 搜索需求 | 4/5 | "idle breakout / idle brick breaker / idle game browser" 是跨年持续词，r/incremental_games 2021 与 2024 求荐帖都在问"like Idle Breakout" |
| 竞争空白 | 3/5 | idle 弹球供给存在但同质（无合并机制），zen/无广告/多语言切口空着 |
| 变现意图 | 5/5 | idle 是广告库存之王：超长会话+天然多次回访，直击 M3 AdSense 里程碑 |
| 开发成本低 | 3/5 | 无挡板弹球（四壁反弹，比 Breakout 还简单）+数值商店+本地存档；无关卡无内容生产 |
| 复访价值 | 5/5 | 离线收益+最高砖纪录=每天回来收菜的教科书钩子 |
| **合计** | **20/25** | 超过 17 分入队线 |

---

## 一、调研依据（2026-09-11）

### 需求挖掘（本轮）
| 来源 | 原声/事实 | 信号 |
|---|---|---|
| [r/incremental_games 2024 求荐帖](https://www.reddit.com/r/incremental_games/comments/1csbviy/help_finding_games_and_other_questions/) | "I'm looking for some more browser based idle games like Idle Breakout" | 需求跨年存在（2021 同款帖子），供给没追上 |
| [强制广告抱怨帖](https://www.reddit.com/r/incremental_games/comments/1tw54ag/i_got_tired_of_idle_games_with_forced_ads_every/) | "I got tired of idle games with forced ads every 30 seconds"（开发者因此自己做无广告游戏） | 强广告是品类公敌 |
| [离线上限抱怨帖](https://www.reddit.com/r/incremental_games/comments/rgsw0j/what_features_you_dont_like_in_incrementalidle/) | 置顶抱怨："offline progress 有任意上限……别逼我每 1-2 小时回来" | 离线要慷慨 |
| [Idle Destroyer 发布帖](https://www.reddit.com/r/incremental_games/comments/zs6rq2/idle_destroyer_is_already_available_in_your/) | 评论区批评 "a bit TOO much like idle breakout" | 克隆没新意会被社区点炮=我们的机会楔子 |

### 热门拆解
| 游戏 | 核心循环 | 节奏/商业化 | 借什么 |
|---|---|---|---|
| **Idle Breakout**（门户常青 idle） | 球自动弹→破砖→金币→买球/伤害/特种球 | 后台挂机；门户版强广告+离线收益弱 | 弹球放置骨架、商店四件套 |
| **2048**（站内已有，重制版色阶青→紫→粉→金） | 滑动合并等值数字→数值翻倍 | 3-5 分钟/局 | 数字=HP 的合并规则与整套色彩语言 |
| **Cookie Clicker**（idle 开山，浏览器端口碑之王） | 点击→产能→自动化→离线再进来收 | 无强制广告、离线慷慨=长青口碑 | "回来有收获"的信任感 |

### 同构分析（饱和度）
- idle 弹球供给：Idle Breakout 原版+克隆群（Idle Destroyer、Idle BrickBreaker、Bouncy Weapons…），社区持续要"更多、更不一样的"。
- 它们卷：球种数量、prestige 深度、像素皮肤。**没人做"数字合并递增板面"**，也没人在 web 端打"无强制广告+中文"牌。
- Cookie Clicker / Kittens Game / Universal Paperclips 被 Reddit 反复推荐为"干净浏览器 idle"——证明"无广告浏览器 idle"这个生态位有真实流量入口。

### 异构分析（NeonPlay 现有 11 款的缺口）
现状：躲避×2、街机×2、静态益智×4、roguelite×1（Brickstorm）、关卡解谜×1（Neon Block Jam）。
- **缺口：idle/放置=0 款**——全站所有游戏都要"操作"，没有一款服务"不操作"的场合（工作/学习/挂后台）。这是留存原型级的空白，且与运营北极星（复访/广告库存）完全同向。
- 受众新增：大龄休闲、办公人群、收菜党——与现有动作/解谜玩家重叠度低，是纯增量人群。
- 工程侧：无挡板四壁反弹比 Breakout 更简单；无关卡、无内容生产，纯数值——是三种弹球形态里实现成本最低的。

### 组合为何成立
- 弹球提供"视觉上一直在发生什么"的挂机观赏性；2048 合并提供"数字一直在变大"的进度感——两者叠加正是 idle 的两味主药（看着爽+数字涨）。
- 合并机制天然解决 idle 数值平衡难题：玩家火力升级（买球/伤害）与板面难度升级（合并翻倍）互为螺旋，无需手工关卡曲线。
- 零操作门槛=全站触达面最宽的一款；2048 玩家看到数字即懂规则。

---

## 二、玩法设计

### 规则（MVP 共 6 条）
1. 480×640 画布：顶部 2 行×5 列=10 个砖位，下方为封闭弹球区；**无挡板**，球碰四壁全反弹。
2. 砖上数字=HP（2 起）；球每命中一次扣 `damage` 点，扣到 0 砖碎，金币 += 砖数字 × 金币倍率。
3. **合并脉冲**：每 20 秒执行一次 2048 式合并——每行内相邻等值砖合并为×2（向左吸附），合并后空位补新"2"砖。数字只会越来越大（HP 越高、碎后金币越多）。
4. 商店（金币购买，即时生效）：
   | 升级 | 效果 | 成本公式 | 上限 |
   |---|---|---|---|
   | 球 +1 | 多一颗弹球 | ceil(25 × 1.7^(n-1)) | 30 颗 |
   | 伤害 +1 | 每次命中多扣 1 | ceil(50 × 1.8^(d-1)) | 无 |
   | 弹速 +10% | 全体球速 | ceil(80 × 2^s) | 5 级 |
   | 金币 +25% | 碎砖收益 | ceil(100 × 2.2^c) | 无 |
5. **离线收益**：关闭/切走期间按当前"每分钟金币"全额累积、**无上限**；回来时欢迎面板一次性结算入账（"你不在的时候 +N 金币"）。
6. 自动存档：localStorage（`np_inb_save`），每 10 秒 + 关键事件时写入；刷新/关浏览器不丢档。

> 数值允许开发侧 5 分钟试玩后微调，但只准动成本公式的底数（1.5–2.0 区间），公式结构不得改。

### 核心循环（4 步）
1. **挂机**：球自动弹、砖自动破，金币入账，数字砖在合并脉冲中缓慢变贵。
2. **收割**：回来看一眼——收离线金币，清一次商店。
3. **升级**：买球/伤害/倍率，火力追着翻倍的砖跑。
4. **炫纪录**：HUD 常驻"历史最高砖"（2048 式），16→32→64……每次破纪录给一次全屏辉光——明天回来的理由。

### 操作方案（本作是"零操作"游戏，但按模板给出可达路径）
| 端 | 操作 |
|---|---|
| 触屏/鼠标 | 点商店卡购买；拖动页面滚动；无战斗操作 |
| 键盘 | Tab/方向键聚焦商店卡 + Enter 购买（可达性合规即可） |
| 节奏 | 全部逻辑基于时间戳 dt（setInterval 1s 档），**后台标签页照常推进**（浏览器节流到 1s 粒度对 idle 无损）；渲染用 rAF 仅前台跑 |

### 美术方向（霓虹色板，直接继承站内 2048 重制语言）
- 底 `#0a0a18` 深空 + 呼吸网格；砖色随数字档位走 2048 色阶：2=青 `#00e5ff`、4=紫 `#7c4dff`、8=品红 `#ff2d95`、16=金 `#ffd54a`、32+=金底白字+外圈辉光，数字大字居中。
- 球=白心青尾光点+短拖尾；碎砖=同色粒子爆花+金币飘字；合并=两砖聚拢挤压弹开+闪光。
- 商店卡=玻璃拟态横条（图标+名称+等级+价格），可购买时边框呼吸；欢迎回来面板=全屏玻璃拟态+金币雨粒子。
- 最高砖破纪录：全屏边框辉光扫过+大数字定帧 1 秒。

### 商业化
- **广告位**：落地页构建器默认注入位（页头横幅）照旧；**游戏内零插屏、零强制广告**，此承诺写进 FAQ 和落地页文案（本作的差异化卖点之一）。预留：过关式"看激励广告领 2 小时离线收益翻倍"按钮位注释（AdSense 接入后启用，MVP 不实现）。
- **留存钩子**：离线收益（无上限）、历史最高砖纪录、合并脉冲的"下一档数字"期待感、每日回访收菜节奏。成就/记录页列 P2。

---

## 三、SEO

**关键词簇**：`idle breakout game` / `idle brick breaker` / `idle game browser no ads` / `2048 idle game` / `merge brick breaker` / `incremental game online unblocked` / `idle game offline progress`。标题建议：`Idle Neon Breaker — Idle Brick Breaker with 2048 Merges (No Forced Ads)`。

**FAQ 4 条要点（落地页 FAQPage schema）**：
1. **What is Idle Neon Breaker?** — A free browser idle game: balls bounce and break numbered bricks on their own; bricks merge 2048-style and double over time; you buy upgrades and watch numbers explode.
2. **Does it earn while I'm away?** — Yes. Offline progress is full-rate with no cap — close the tab, come back, claim everything. No "come back every 2 hours" nonsense.
3. **Are there forced ads or paywalls?** — No forced ads, ever. No accounts, no paywalls; progress saves automatically in your browser.
4. **What's the goal?** — Grow your highest brick: 2 → 4 → 8 → 16… Keep firepower ahead of the merges and chase the record.

落地页同款要求：VideoGame/FAQPage schema、game-first 首屏、面包屑、推荐位挂 2048 与 Brickstorm（数字/弹球近亲互链）。

---

## 四、MVP 范围（开发 Agent 一轮 ≤15 分钟）

**做**：
- 结构仿站内惯例：`index.html + game/style.css + game/js/main.js + game/js/game.js`；画布+商店 DOM 混合（商店用 DOM 省时）。
- 上述 6 条规则完整实现：四壁反弹弹球（多球碰撞彼此忽略）、砖 HP/碎裂/金币、合并脉冲（每行相邻等值向左合并×2+补位）、商店四件套、离线收益（全额无上限+欢迎面板）、localStorage 存档（10s 定期+beforeunload/visibilitychange）。
- HUD：金币/每分钟金币/最高砖/球数/伤害；破纪录辉光；碎砖粒子+飘字；游戏内文案内嵌 L 字典（`np_lang` 联动，首版英文，键位预留 zh）。
- 落地页：VideoGame/FAQPage schema + 4 FAQ + 推荐位 + "No forced ads" 文案点。

**不做（明确砍掉）**：特种球（穿透/狙击等）、prestige 转生、成就页、音效、云端存档、离线上限升级项。
**超时降级顺序**：先砍"弹速升级"→再砍"金币倍率升级"（保球/伤害/离线/合并主线）；合并脉冲可从 20s 放宽到 30s。

---

## 五、验收标准

1. 线上 `/idle-neon-breaker/` HTTP 200；375×667 游戏框首屏 58vh（一票否决项）；无控制台报错。
2. 挂机可玩：加载后 60 秒内发生≥1 次碎砖与金币入账；合并脉冲触发后可见等值砖合并×2、空位补"2"。
3. 刷新页面进度保留（金币/升级/最高砖）；离开≥2 分钟后回来弹出离线收益面板并入账（验收可用改本地时间或短等待验证）。
4. 后台标签页推进：切走 1 分钟再切回，金币数与时间戳逻辑一致（时间基驱动，非帧基）。
5. 商店四件套生效可感知（球数上限 30、伤害/倍率递增）；30 球同屏 60fps 无卡顿。
6. 零插屏/零强制广告代码路径；游戏内文案走 L 字典键位。
7. IndexNow 提交；`STATUS.md` 运营日志追加；开发侧按惯例写 `data/run_stats.jsonl`；iOS Safari + 桌面 Chrome 冒烟通过。

---

### 附：策划备选池（供后续轮次）
- **Little Alchemy 式元素合成发现游戏**：zh 本地化缺口+收集元型；元素表需策划手工设计（40+ 配方），留作一轮纯内容轮。
- **Water Sort zen 版**：楔子同款可复制，但 web 供给饱和度高——优先级降。
- **Nonogram 每日谜题**：5×5 手工关可脚本验证（同 Block Jam 方法论），谜题文化契合每日钩子——备选。
- **Screw/螺丝解谜**：关卡制作成本高，继续观察。

*产出：NeonPlay 市场分析+游戏策划 Agent · 2026-09-11 · 需求来源：r/incremental_games（2021/2024 求荐帖、强广告/离线上限抱怨帖、Idle Destroyer 发布帖）· 市场参照：Idle Breakout、Cookie Clicker、站内 2048 重制版*
