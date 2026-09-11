# Neon Alchemy (neon-alchemy)

> 一句话卖点：**不用 AI 的 Infinite Craft**——从水火土电开始两两合成，发现 40+ 霓虹元素，每天一道全球同题的"合成谜题"，中文首发、学校机房秒开。

- **缝合来源**：Little Alchemy / Infinite Craft（元素合成发现核心）+ Wordle（每日一题 + 全球同题 + 结果分享）[+ 粉丝工具 Alchemy Atlas 的内置化（合成图谱）]
- **目标玩家**：被学校/公司网络挡在 Infinite Craft 门外的学生党（r/infinitecraft 实锤痛点）；Little Alchemy 老玩家想找"有每日目标"的续作；收集癖+解谜休闲玩家；中文玩家（官方全系无中文）
- **单局时长**：自由合成 5-15 分钟/次（长线收集）；每日谜题 2-4 分钟

---

## 〇、差异化红线回答（LESSONS.md 第 8 条）

**"比 Google 搜索前 3 名多做了什么？"**——"infinite craft" 前排是 neal.fun 原版（依赖 LLM API、仅英文、学校网络常被封），"little alchemy" 前排是官方站（仅英文、无每日、无内置配方查询）。本作：

1. **纯静态、零 API、秒开**——配方全部手工内置，不需要 AI/网络请求，学校机房和低配手机都能玩。直接解决 Reddit 实锤痛点：[r/infinitecraft "They blocked Infinite Craft at my school"](https://www.reddit.com/r/infinitecraft/comments/1bla7ok/they_blocked_infinitecraft_at_my_school/)。
2. **每日合成挑战**（Wordle 化）——全球同题、日期哈希轮换、结果一键分享。社区已有人在做[「like Infinite Craft but with a daily goal」](https://www.reddit.com/r/playmygame/comments/1bjgyea/words_for_days_like_infinite_craft_but_with_a/)验证了这个方向，但尚无成熟供给；且与本站已有的每日聚光灯/🔥streak 基建天然联动。→ 满足红线"组合两个已有玩法"（合成发现 × 每日猜题）。
3. **合成图谱内置**——Little Alchemy 玩家查配方要靠社区粉丝工具（[Alchemy Atlas](https://www.reddit.com/r/LittleAlchemy/)），我们原生内置"已发现配方"回看。
4. **中文/多语言首发**——元素名带 zh 字典（es/pt/ru 复用站点 i18n），官方竞品全系无中文。

## 评分卡（按运营入队线口径）

| 维度 | 分 | 说明 |
|---|---|---|
| 搜索需求 | 4/5 | "little alchemy / infinite craft / element combining game" 常青大词 + "unblocked/alternative" 长尾 |
| 竞争空白 | 3/5 | 合成游戏有供给，但"静态无AI+每日+多语言+图谱内置"四件套无人在 web 端凑齐 |
| 变现意图 | 3/5 | 中等会话+每日回访；不及 idle 但高于单局街机 |
| 开发成本低 | 4/5 | 42 元素/38 配方/10 每日板**全部由策划提供并脚本验证**，开发只做 UI+查表；emoji 即美术零素材 |
| 复访价值 | 5/5 | 每日谜题+收集进度+资料片预期，强"明天再来"钩子 |
| **合计** | **19/25** | 超过 17 分入队线 |

---

## 一、调研依据（2026-09-11）

### 需求挖掘（本轮）
| 来源 | 原声/事实 | 信号 |
|---|---|---|
| [r/infinitecraft 封禁帖](https://www.reddit.com/r/infinitecraft/comments/1bla7ok/they_blocked_infinitecraft_at_my_school/) | "They blocked Infinite Craft at my school"（OP 已攒 1000+ 元素） | 封禁痛点→静态替代品需求 |
| [r/playmygame「words for days」](https://www.reddit.com/r/playmygame/comments/1bjgyea/words_for_days_like_infinite_craft_but_with_a/) | 开发者自述："like Infinite Craft but with a daily goal instead of pure sandbox" | 每日化方向被社区独立验证 |
| [r/LittleAlchemy 的 Alchemy Atlas](https://www.reddit.com/r/LittleAlchemy/) | 社区自建免费配方路径查询工具 | 配方查询是高频刚需，内置即差异化 |
| [r/AndroidGaming Infinite Craft 推荐帖](https://www.reddit.com/r/AndroidGaming/comments/1d7xrlm/infinite_craft_any_players_here_highly_recommended/) | "rules are simple… highly recommended" | 品类大众认知度高，零教育成本 |

### 热门拆解
| 游戏 | 核心循环 | 短板（我们的机会） | 借什么 |
|---|---|---|---|
| **Infinite Craft**（neal.fun，2024 病毒级） | 拖两元素→AI 生成新元素→无限组合 | 依赖 LLM API 慢且被封；英文；无每日/无存档迁移 | 拖放合成手感、双击新生元素的惊喜感 |
| **Little Alchemy 1/2**（品类开山，下载量亿级） | 合成→图鉴收集→全图鉴毕业 | 英文；卡关只能去外站查配方；无每日 | 元素表结构、图鉴进度百分比 |
| **Doodle God**（经典移植） | 合成+章节制 | 移植版广告重、提示付费 | "章节=主题包"的资料片思路（P2） |

### 同构分析（饱和度）
- 合成品类供给：官方双雄（Little Alchemy、Infinite Craft）+ AI 克隆群（Allchemy 等）+ 换皮 Doodle God。**卷的方向是"更多元素/接 AI"**——都在做重。
- 反向空位：**轻量、静态、确定配方、带每日目标、多语言**的组合没有供给；"unblocked" 镜像站靠 Google Sites 挂代理恰好证明需求真实且官方供给错位。

### 异构分析（NeonPlay 现有 12 款的缺口）
现状：躲避×2、街机×2、静态益智×4、roguelite×1、关卡解谜×1、棋盘×1（Connect Four）、idle×1（pending）。
- **缺口：发现/收集元游戏=0 款**——现有游戏全部"一局定胜负"，没有"收集图鉴+长线进度"型产品；本作是全站第一款"没有失败"的 zen 收集游戏，情绪光谱补全。
- 受众：CozyGamers/收集党/学生（封禁人群），与现有动作玩家重叠低。
- 与站内基建协同：每日板直接接每日聚光灯+🔥streak 体系，是 streak 的第三个消费场景。

### 组合为何成立
- 合成发现的"啊哈"时刻 × 每日化的"全球同题"仪式感 = Wordle 之于猜词的同样改造，品类内无人做过。
- 确定配方（非 AI）反而成立：可验证、可分享、可排名——AI 版根本没法做每日题（每次生成不同）。
- 策划产出全部数据表（本轮已脚本验证），开发零内容负担，符合流水线分工。

---

## 二、玩法设计

### 规则（MVP 共 5 条）
1. **自由合成模式**：从 4 基础元素（水💧火🔥土🌍电⚡）开始；点选两个元素→合成→命中配方则新元素入场（双击闪光+粒子），未命中则抖动提示"无反应"。全部 42 元素图鉴+进度百分比。
2. **同一配方重复合成不重复计**（已发现直接亮起）；配方查表为 `key(a,b)` 排序去重。
3. **每日合成模式**：日期哈希从 10 张谜题板轮换（`daysSinceEpoch % 10`），板=限定元素池+目标元素；只在池内合成，凑出目标即通关，展示"最少发现数"对比与分享文案。全球同题。
4. **合成图谱**：已发现配方列表回看（A+B=C）；未发现的保持 `❓+❓=❓`。
5. 进度自动存 localStorage（`np_alc_save`：已发现集合+每日完成日戳）；"重置图鉴"需二次确认。

### 核心循环（4 步）
1. **组合**：点两个元素拖上合成台（或连点两枚芯片）。
2. **发现**：命中→新元素弹跳入场+全图鉴进度 +1 的多巴胺；未命中→轻微抖动（零惩罚，zen）。
3. **串联**：新元素反过来解锁更多组合，T1→T5 逐层展开（终局元素：赛博朋克🌉）。
4. **回访**：今天的每日板打了吗？分享战绩给朋友，明天再来一张。

### 完整数据表（已脚本验证：42 元素全可达、无悬空引用、无重复键、难度分层 T1→T5）

**元素表（42）**——`id | emoji | EN | zh`：

| id | emoji | EN | zh | | id | emoji | EN | zh |
|---|---|---|---|---|---|---|---|---|
| water | 💧 | Water | 水 | | screen | 📺 | Screen | 屏幕 |
| fire | 🔥 | Fire | 火 | | neon | 🌃 | Neon | 霓虹 |
| earth | 🌍 | Earth | 土 | | forest | 🌳 | Forest | 森林 |
| electric | ⚡ | Electric | 电 | | smoke | 💨 | Smoke | 烟 |
| steam | ♨️ | Steam | 蒸汽 | | flower | 🌸 | Flower | 花 |
| plant | 🌱 | Plant | 植物 | | island | 🏝️ | Island | 岛屿 |
| lava | 🟠 | Lava | 熔岩 | | salt | 🧂 | Salt | 盐 |
| light | 💡 | Light | 光 | | snow | ❄️ | Snow | 雪 |
| ocean | 🌊 | Ocean | 海洋 | | glacier | 🧊 | Glacier | 冰川 |
| energy | ✨ | Energy | 能量 | | volcano | 🌋 | Volcano | 火山 |
| mountain | ⛰️ | Mountain | 山脉 | | fish | 🐟 | Fish | 鱼 |
| magnet | 🧲 | Magnet | 磁场 | | sushi | 🍣 | Sushi | 寿司 |
| cloud | ☁️ | Cloud | 云 | | sun | ☀️ | Sun | 太阳 |
| rain | 🌧️ | Rain | 雨 | | rainbow | 🌈 | Rainbow | 彩虹 |
| storm | 🌩️ | Storm | 雷暴 | | arcade | 🕹️ | Arcade | 街机 |
| stone | 🪨 | Stone | 石头 | | computer | 💻 | Computer | 电脑 |
| metal | 🔩 | Metal | 金属 | | ai | 🧠 | AI | 人工智能 |
| robot | 🤖 | Robot | 机器人 | | cyberpunk | 🌉 | Cyberpunk | 赛博朋克 |
| engine | ⚙️ | Engine | 引擎 | | car | 🚗 | Car | 汽车 |
| internet | 🌐 | Internet | 网络 | | aurora | 🌌 | Aurora | 极光 |
| city | 🏙️ | City | 城市 | | plane | ✈️ | Plane | 飞机 |

**配方表（38，顺序无关）**：

```js
const RECIPES = [
 ['water','fire','steam'],['water','earth','plant'],['fire','earth','lava'],['electric','water','light'],
 ['water','water','ocean'],['fire','fire','energy'],['earth','earth','mountain'],['electric','electric','magnet'],
 ['steam','steam','cloud'],['cloud','water','rain'],['cloud','electric','storm'],['lava','water','stone'],
 ['stone','fire','metal'],['metal','electric','robot'],['light','electric','screen'],['light','light','neon'],
 ['screen','neon','arcade'],['screen','screen','computer'],['computer','electric','ai'],
 ['plant','plant','forest'],['plant','fire','smoke'],['plant','energy','flower'],
 ['ocean','earth','island'],['ocean','fire','salt'],['mountain','cloud','snow'],['snow','snow','glacier'],
 ['lava','lava','volcano'],['ocean','plant','fish'],['fish','fire','sushi'],
 ['energy','light','sun'],['sun','rain','rainbow'],['neon','city','cyberpunk'],
 ['arcade','arcade','city'],['metal','energy','engine'],['engine','metal','car'],
 ['computer','computer','internet'],['snow','light','aurora'],['engine','cloud','plane'],
];
```

**每日谜题板（10 张轮换，已验证最少发现数）**：

| # | 目标 | 元素池 | 最少发现 |
|---|---|---|---|
| 1 | 蒸汽 ♨️ | 水、火 | 1 |
| 2 | 光 💡 | 水、火、电 | 1 |
| 3 | 霓虹 🌃 | 水、火、电 | 2 |
| 4 | 街机 🕹️ | 水、火、电 | 4 |
| 5 | 机器人 🤖 | 水、火、土、电 | 4 |
| 6 | 寿司 🍣 | 水、土、火 | 4 |
| 7 | 太阳 ☀️ | 水、火、电 | 3 |
| 8 | 极光 🌌 | 水、火、土、电 | 6 |
| 9 | 赛博朋克 🌉 | 水、火、土、电 | 6 |
| 10 | 飞机 ✈️ | 水、火、土、电 | 8 |

分享文案模板：`Neon Alchemy 每日合成 #{1-10拼板日序号} {"🧪".repeat(min)} {statusemoji} 我的进度 {found}/{min} → 链接`（英文站默认 `Neon Alchemy Daily #N ✅ 6/6 combos`）。

### 操作方案
| 端 | 操作 |
|---|---|
| 触屏 | 点选元素芯片（高亮）→ 点第二枚即合成；或拖芯片到合成台；`touch-action` 默认（页面正常滚动） |
| 鼠标 | 同触屏连点 |
| 键盘 | Tab 聚焦芯片 + Enter 选中/合成；方向键在图鉴网格移动（可达性合规） |

### 美术方向（霓虹色板，emoji 即素材零图片）
- 底 `#0a0a18` 深空；元素芯片=玻璃拟态圆角块+emoji 大字+名称，按发现层级着色：T1 青 `#00e5ff`、T2 紫 `#7c4dff`、T3 品红 `#ff2d95`、T4 金 `#ffd54a`、T5 彩虹描边渐变。
- 合成台=中央发光圆环，命中时环爆闪光+新芯片从环心弹出入场；未命中=双芯片红边抖动 200ms。
- 图鉴=芯片墙（未发现=❓暗格），顶部进度条 `24/42`；新发现全屏短促辉光。
- 每日板=顶部目标元素大卡+"今日全球同题"标签，通关时目标卡旋转绽放粒子。

### 商业化
- **广告位**：落地页构建器默认注入位照旧；无插屏。P2 预留"看激励广告=今日提示一条"按钮位注释。
- **留存钩子**：每日板（全球同题+分享）→ 接站点🔥streak；图鉴收集百分比；"重置挑战一命通关"；资料片路线 P2（+20 元素包：风/星/月/龙…预告文案放落地页底部当期待钩子）。

---

## 三、SEO

**关键词簇**：`little alchemy online free` / `infinite craft alternative` / `infinite craft unblocked` / `element combining game` / `alchemy puzzle game online` / `daily crafting puzzle` / `games like infinite craft no ai`。标题建议：`Neon Alchemy — Free Element Combining Game with Daily Puzzle (No AI, Works Everywhere)`。

**FAQ 4 条要点（落地页 FAQPage schema）**：
1. **What is Neon Alchemy?** — A free browser crafting game: combine Water, Fire, Earth and Electric to discover 42 neon elements, from Steam to Cyberpunk. No download, no account.
2. **Is there a daily challenge?** — Yes. One handcrafted puzzle board per day, identical for everyone worldwide, with a shareable result — Wordle-style.
3. **Does it use AI like Infinite Craft?** — No. All recipes are handcrafted and built-in, so it loads instantly, works on school/office networks, and no two discoveries are ever wrong.
4. **Is it available in my language?** — Yes: English, 简体中文, Español, Português, Русский at launch. Progress saves automatically in your browser.

落地页同款要求：VideoGame/FAQPage schema、game-first 首屏、面包屑、推荐位挂 2048 与 Neon Block Jam（动脑向互链）。

---

## 四、MVP 范围（开发 Agent 一轮 ≤15 分钟）

**做**：
- 结构仿站内惯例：`index.html + game/style.css + game/js/main.js + game/js/game.js`；DOM 芯片流布局（无需 canvas）。
- 本文档三张数据表原样粘贴（已验证勿改）：元素表、配方表、每日板。
- 自由合成（点选两枚合成+图鉴墙+进度百分比+配方回看列表）、每日模式（日期哈希选板、池内合成、通关面板+分享文案复制到剪贴板）、localStorage 存档、重置二次确认。
- 反馈动效：命中环爆+入场弹跳、未命中抖动、图鉴 +1 辉光；游戏内文案内嵌 L 字典（`np_lang` 联动，元素名 zh 列已给）。
- 落地页：VideoGame/FAQPage schema + 4 FAQ + 推荐位。

**不做（明确砍掉）**：提示系统、成就页、元素资料片、拖拽排序、音效、账号云存档、每日排行榜（无后端）。
**超时降级顺序**：先砍分享按钮 → 再砍配方回看列表 → 保自由合成+每日+存档主线。

---

## 五、验收标准

1. 线上 `/neon-alchemy/` HTTP 200；375×667 游戏框首屏 58vh（一票否决项）；无控制台报错。
2. **玩法验证红线（LESSONS 第 9 条）**：qa_playtest 用合成事件（PointerEvent 派发点击"水"→"火"）断言"蒸汽♨️"入场且图鉴计数 +1；再按每日板 #1 通关断言目标卡结算面板弹出；全程 `window.onerror` 零报错。纯布局 pass 不算可玩。
3. 配方判定正确：`光+光=霓虹`、`霓虹+城市=赛博朋克` 可复现；重复合成不重复计数。
4. 每日模式：手动改本地日期哈希可切板；池外配方（如板上无"土"时不判"植物"）不生效；通关后当日标记完成、次日重置。
5. 刷新页面后图鉴/每日完成状态保留；"重置图鉴"有二次确认。
6. 语言切换后元素名与界面文案随 `np_lang` 变化（zh 列即字典源）。
7. IndexNow 提交；`STATUS.md` 运营日志追加；开发侧按惯例写 `data/run_stats.jsonl`；iOS Safari + 桌面 Chrome 冒烟通过。

---

### 附：策划备选池（供后续轮次）
- **Nonogram 每日谜题**：5×5 手工关可脚本验证，谜题文化契合每日钩子——备选头名。
- **Water Sort zen 版**：供给饱和，优先级低。
- **Screw/螺丝解谜**：关卡制作成本高，继续观察。
- **本作资料片**：+20 元素包（风/星/月/龙/时间…）可作为后续独立美术/内容轮，配方表由策划补验。

*产出：NeonPlay 市场分析+游戏策划 Agent · 2026-09-11 · 数据表 42 元素/38 配方/10 每日板已脚本验证（可达性/悬空引用/重复键/最少发现数）· 需求来源：r/infinitecraft、r/playmygame、r/LittleAlchemy、r/AndroidGaming*
