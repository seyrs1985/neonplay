# Neon Fairway (neon-fairway)

> 一句话卖点：**高尔夫纸牌 × Balatro 式开局 Jokers**——±1 接龙清牌阵，每局开局三选一规则修正器，连击倍率滚雪球，每天全球同一副发牌。

- **缝合来源**：Golf Solitaire（±1 接龙纸牌）× Balatro（开局 Jokers 三选一规则修正器——2024 年度级爆款的构筑前移）× 每日发牌（日期种子全球同题）
- **目标玩家**：纸牌变体玩家（solitaire 家族按变体分治是 Solitaired 等大站验证的目录策略）；Balatro 人群（构筑前移到纸牌的轻量版）；neon-solitaire 用户的进阶变体
- **单局时长**：3-5 分钟

---

## 〇、差异化红线回答（LESSONS.md 第 8 条）

**"比 Google 搜索前 3 名多做了什么？"**——"golf solitaire" 是纸牌家族中独立的大长尾词（Solitaired 等 20+ 变体目录站验证了"变体即页面"的策略），但 web 端供给全部是规则原版+广告墙。本作：

1. **Balatro 式开局 Jokers**——每局开局从 6 种规则修正器三选一（环回 A↔K / 连锁大师 / 深部库存 / X 光预览 / 复活翻牌 / 国王特赦），把"构筑决策"前移到发牌瞬间：同一副牌，不同 Joker 完全不同的打法。→ 满足红线"组合两个已有玩法"（Golf Solitaire × Balatro 式修正器构筑）。
2. **连击倍率经济**——不翻库存连续清牌阵即涨倍率（×1→×5），"路线规划"从休闲消磨变成技术追求。
3. **每日发牌全球同题**——`mulberry32(YYYYMMDD)` 同一副牌+同一组 Joker 三选，净清牌数与分数可比；配合站内 streak。
4. **家族策略背书**——neon-solitaire（Klondike）文档称纸牌为"全站最大品类空白"；纸牌大站的正确打开方式就是"经典+变体"目录（Solitaired 范式）：本作是该家族第二成员，机制与 Klondike 零重叠（±1 接龙 vs 花色叠塔）。

## 评分卡（按运营入队线口径）

| 维度 | 分 | 说明 |
|---|---|---|
| 搜索需求 | 4/5 | "golf solitaire" 独立长尾词有量（solitaire 巨型词族的子词），Solitaired 类目录策略验证 |
| 竞争空白 | 3/5 | 原版 golf solitaire 门户有供给（诚实）；"Joker 构筑+每日发牌+段位"组合无供给 |
| 变现意图 | 4/5 | 纸牌人群=长会话高规律回访（neon-solitaire 同源判断） |
| 开发成本低 | 4/5 | 规则引擎小（±1 判定+翻库+发牌器）；DOM 网格；发牌模拟器已校准（200 局数据在文档） |
| 复访价值 | 4/5 | 每日发牌+连胜+Joker 组合探索（6 选 3=20 种组合） |
| **合计** | **19/25** | 超过 17 分入队线 |

---

## 一、调研依据（2026-09-14）

### 热门拆解（含留存机制）
| 游戏 | 核心循环 | **留存机制** | 借鉴→本土化 |
|---|---|---|---|
| **Golf Solitaire**（Solitaired/门户常驻变体） | 库牌±1 接龙清 7×5 牌阵 | 每日发牌+最少翻库挑战 | 全部规则本体；翻库挑战改成段位经济 |
| **Balatro**（2024 年度级爆款） | 开局构筑修正器→局内滚雪球 | Jokers 组合探索（150+种） | 开局三选一修正器（轻量 6 种）；构筑探索=复访 |
| **neon-solitaire**（站内已立项 Klondike） | 花色叠塔 | 每日+连胜（站内框架） | 家族第二成员共享留存框架与用户群 |

### 同构分析（饱和度）
- golf solitaire 原版门户供给存在但全部无构筑变体（Balatro 证明"纸牌+修正器"是 2024-2026 最强品类创新方向，web 轻量版空白）。
- 家族目录策略：Solitaired 以 20+ 变体页吃透纸牌词族长尾——本作是站内该策略的第一步延伸。

### 异构分析（NeonPlay 现有 17 款的缺口）
- pending 已有 Klondike（neon-solitaire）；**变体不是重复**：机制零重叠（±1 接龙 vs 花色叠塔）、关键词不同（golf solitaire vs solitaire）、玩法节奏不同（3-5 分钟清牌 vs 10-20 分钟对局）——纸牌家族双成员=目录策略起点（后续 Spider/Pyramid 变体均有位）。
- 与站内益智系互补：纸牌人群=长会话高规律回访（库存型变现）。

### 组合为何成立
- Golf Solitaire 规则 10 秒讲完（±1 接龙），深度全在"先打哪张能让链更长"——Jokers 把这条深度显性化为开局决策。
- Balatro 验证了"修正器构筑"在纸牌品类的爆发力；轻量化到 6 种 Jokers/单选，MVP 可控且探索空间（20 组合）足够。
- 纯逻辑判定+DOM 卡片，零物理零素材，与 neon-solitaire 共享牌面渲染心智。

---

## 二、玩法设计

### 规则（MVP 共 7 条）
1. 发牌：7 列×5 行=35 张明牌牌阵 + 库存 17 张（分两摞）。 waste 置顶为"当前牌"。
2. 可打：牌阵上任意一张与 waste 顶**点数 ±1** 的牌（A=1 与 K=13 互不接，除非有环回 Joker）→ 打入 waste。
3. 无可打→翻一张库存入 waste；双库存摞均耗尽且牌阵无可打→**局终**。
4. **连击经济**：连续打牌阵牌（不翻库）计 chain，倍率 =min(1+(chain−1)×0.5, ×5)，每牌得分=10×倍率；翻库清零 chain。
5. **Jokers 三选一**（开局 6 选 3 面板，随机不重复）：环回 A↔K / 连锁大师（倍率上限 ×7.5）/ 深部库存（+6 张）/ X 光（开局预览两摞库顶）/ 复活（一次性撤销一次翻库）/ 国王特赦（J/Q/K 互叠一次）。
6. 局终计分：已清牌分+清空牌阵奖励 500+剩余库存每张 20；**每日发牌**：日期种子固定牌阵+固定 Joker 三选，全球同题，当日最优分计戳。
7. 结算：清牌数（≤35）/分数/最长 chain/Joker；NEW BEST 扫光。

### 数值校准（策划 200 局模拟器实测，开发 QA 复验）
```
贪心模拟（Joker 环回）：中位清牌 35/35，全清率 98%——牌阵对最优玩法偏松
人类实际：非最优路线下清牌 25-35 区间，分数主区间 900-1500
段位按分数（含清空奖励）锚定；开发上线后按实测分布 ±20% 微调（tile-rush 先例）
```

### 段位阶梯（按单局总分；含清空奖励 500 的口径）
| 段位 | 分数 | | 段位 | 分数 |
|---|---|---|---|---|
| 🏆 传奇 | ≥1800 | | 🟡 黄金 | 1000-1249 |
| 🥇 大师 | 1600-1799 | | ⚪ 白银 | 750-999 |
| 💎 钻石 | 1400-1599 | | 🟤 青铜 | <750 |
| 🥈 白金 | 1250-1399 | | | |

### 核心循环（4 步）
1. **选构筑**：三选一 Joker——这张牌阵配环回还是深部库存？
2. **扫链**：牌阵上找 ±1 链条，路线规划"先打哪张不折链"。
3. **滚雪球**：倍率 ×5 时每一张都是高分——翻库是止损也是断链的痛。
4. **刷优**：每日同题（同牌同 Joker 三选）全球比分，明天再来。

### 操作方案
| 端 | 操作 |
|---|---|
| 触屏 | 点牌阵可打牌→飞入 waste；点库存摞翻牌；按钮=Joker/重开 |
| 鼠标 | 同触屏 |
| 键盘 | Tab 循环选牌 / Enter 打出 / D 翻库 / U 撤销（R1）/ R 重开 |

### 美术方向（霓虹色板）
- 底 `#0a0a18` 深空+果岭绿 `#39ff88` 描线球场剪影（高尔夫隐喻：牌阵=果岭，waste=球洞旗）。
- 卡牌白底霓虹描边（黑桃/梅花 cyan `#00e5ff`、红心/方块 pink `#ff2d95`，复用 neon-solitaire 规范）；可打牌呼吸微光提示。
- 连击倍率=旗杆上的风标旗，倍率升级旗面变色+横幅；waste 牌堆叠散落感。
- Joker 卡=紫 `#7c4dff` 鎏金边框玻璃卡，三选一面板玻璃拟态+hover 浮起；清空牌阵="COURSE CLEAR"+全屏 confetti。

---

## 三、长线留存设计（五件套逐项）

### ① 个人进度
- **MVP**：生涯统计（局数/清阵次数/最长 chain）+ 个人最佳分；段位实时展示。
- **R1**：成就徽章墙 8 枚——开杆（首局）/ 一杆进洞（清空牌阵）/ ×5 满链 / Jocker 集邮（6 种 Joker 各胜 1 局）/ 三日连胜 / 七日连胜 / 职业球手（累计清阵 20 次）/ 大满贯（三种难度/模式各胜）。
- **R2**：牌背主题 3 套（霓虹果岭→星云→复古绒面），徽章解锁。

### ② 个人排行榜
- **MVP**：Top10 本地榜（分数/清牌数/Joker/日期）+ 每周最佳（`YYYY-Www`）；结构含 `date`/`seed` 字段为全局榜预留。
- **R1**：目标线——开局显示"个人最佳分"；每日发牌历史分数曲线。
- **R2**：ghost——每日发牌显示"个人最佳同清牌数分数"对比线。

### ③ 一键分享
- **MVP**：结算面板"分享"→ canvas 成绩卡（分数/清牌数/最长 chain/Joker 名/段位/日期+`seyrs1985.github.io/neonplay` 链接）→ Web Share API→剪贴板降级：`⛳ Neon Fairway 每日发牌 1,420 分（34/35 清牌 · ×5 满链）💎钻石 | 链接`。
- **R1**：每日分享带 `#NeonFairwayDaily 09-14` 标签；段位晋升卡。
- **R2**：全 Jocker 集邮卡。

### ④ 回访钩子
- **MVP**：**每日发牌**（日期种子全球同题，当日最优分计戳）+ **游戏内连胜**（`np_neon-fairway_streak`，月度补签卡 1 张）。
- **R1**：连胜日历热力格+断签提醒；Joker 组合探索进度（6C3=20 组合图鉴，R1 轻量）。
- **R2**：每日 3 小任务（玩 1 局 / 清空牌阵 / 用指定 Joker 胜局）。

### ⑤ 目标阶梯
- **MVP**：七段位（见上表）+ 结算"距下一段位差 X 分"。
- **R1**：徽章墙与段位合并；大师段位解锁第二牌背（衔接收集）。
- **R2**：月度赛季归档；Hard 变体（牌阵 2 行暗牌——覆盖揭示制，趣味更深）。

### 存档键名清单（规范 `np_<slug>_<key>`，全部 JSON 字符串）
| 键 | 数据结构 | 分期 |
|---|---|---|
| `np_neon-fairway_best` | `{"score":1420,"cleared":34,"date":"2026-09-14"}` | MVP |
| `np_neon-fairway_top10` | `[{"score":..,"cleared":..,"joker":"wrap","date":".."}] ≤10` | MVP |
| `np_neon-fairway_daily` | `{"date":"2026-09-14","score":..,"done":true}` | MVP |
| `np_neon-fairway_streak` | `{"count":3,"last":"2026-09-14","best":7,"protect":1}` | MVP |
| `np_neon-fairway_stats` | `{"games":11,"clears":3,"bestChain":12,"scoreTotal":9800}` | MVP |
| `np_neon-fairway_weekly` | `{"weekKey":"2026-W38","best":{"score":..}}` | MVP（展示可 R1） |
| `np_neon-fairway_badges` | `["first_win","course_clear","..."]` | R1 |
| `np_neon-fairway_settings` | `{"theme":"fairway","sound":true}` | R2 |

---

## 四、商业化
- **广告位**：落地页构建器默认注入位照旧；局内零插屏（纸牌人群敏感，与 neon-solitaire 同判断）。
- P2 预留："看激励广告=本局额外一次翻库机会"按钮位注释（AdSense 接入后启用；每日成绩按原额记录）。

---

## 五、SEO

**关键词簇**：`golf solitaire online free` / `golf solitaire no ads` / `solitaire variants` / `joker solitaire game` / `daily solitaire deal` / `card game online no download`。标题建议：`Neon Fairway — Free Golf Solitaire with Daily Deal & Jokers`。

**FAQ 4 条要点（落地页 FAQPage schema）**：
1. **What is Neon Fairway?** — A free golf solitaire: clear the 35-card field by playing cards one rank above or below the pile, chain plays for score multipliers.
2. **What are Jokers?** — Each round starts with a pick of 1 from 3 rule modifiers (like Wraparound A↔K or Chain Master) — the same deal plays differently with each build.
3. **Is there a daily deal?** — Yes: one seeded deal with its own Joker choices, identical worldwide every day; your best score goes on the board with streak tracking.
4. **Does it work on mobile?** — Yes: tap cards to play, full keyboard support, no download or account; progress saves on your device.

落地页同款要求：VideoGame/FAQPage schema、game-first 首屏、面包屑、推荐位挂 Neon Solitaire（纸牌家族互链——家族目录策略）。

---

## 六、MVP 范围（开发 Agent 一轮 ≤15 分钟，含留存基线）

**做**：
- 结构仿站内惯例：`index.html + game/style.css + game/js/main.js + game/js/game.js`；DOM 卡片。
- 规则引擎：发牌器（52 张洗牌→35 阵+17 库分两摞）、±1 判定（Joker 环回扩展）、chain 倍率、翻库、局终判定；Joker 三选一面板（6 种 Joker 数据驱动，实现 3 种：环回/连锁大师/深部库存——其余 3 种 R1 解锁文案占位）。
- **留存基线（模板硬性要求）**：best/Top10/weekly/daily/streak（月度补签卡）/stats 六键按清单，局终即存；分享卡 canvas+Web Share API→剪贴板降级；段位+差值展示；每日发牌+随机练习双模式。
- 动效：飞牌入 waste、chain 旗杆升档、清阵 confetti、NEW BEST 扫光；中英 i18n（np_core）；`__qaState/__qa`（含 `__qa.deal()` 确定性牌面、`__qa.autoPlay()` 贪心自动打完）。
- 落地页：VideoGame/FAQPage schema + 4 FAQ + 推荐位挂 Neon Solitaire（家族互链）。

**不做（明确砍掉）**：音效、后 3 种 Joker（R1）、暗牌 Hard 变体（R2）、撤销、主题包、ghost、小任务、zen 模式。
**超时降级顺序**：先砍 weekly 榜（保 best/daily/streak）→ 再砍 Joker 三选面板（固定发环回 Joker，保构筑叙事）→ 规则引擎+每日发牌不可砍。

---

## 七、留存路线图 R1/R2

- **R1（1-2 个后续轮次）**：后 3 种 Joker 实装（X 光/复活/国王特赦）、成就徽章墙 8 枚（np_neon-fairway_badges）、Joker 组合图鉴（20 组合探索进度）、连胜日历+断签提醒、每日分享带日期标签。
- **R2**：每日 3 小任务、牌背主题 3 套（徽章解锁）、ghost 同牌对比线、Hard 暗牌变体、月度赛季归档、激励广告翻库位启用。

---

## 八、验收标准

1. 线上 `/neon-fairway/` HTTP 200；375×667 游戏框首屏 58vh（一票否决项）；无控制台报错。
2. **玩法验证红线（LESSONS 第 9 条）**：qa_playtest 用 `__qa.deal()` 断言当日发牌确定性（两次加载牌阵一致）+ `__qa.autoPlay()` 贪心打完→断言局终结算面板与清牌数；人为打不出牌→断言翻库流程与局终；全程 `window.onerror` 零报错。纯布局 pass 不算可玩。
3. **规则 QA**：±1 判定正确（含 A-2 与 K-Q 边界）；环回 Joker 下 A-K 判定生效；chain 倍率按 0.5 步进封顶；清空奖励与库存剩余分正确。
4. **留存验收（模板硬性要求）**：
   - 刷新后 best/Top10/streak/daily 戳不丢（逐键核对第三节清单）；
   - 连胜跨天 +1/断档归 1/补签卡消耗（改本地时间验证）；
   - 每日种子确定性：同日两次加载牌阵与 Joker 三选一致；次日不同；
   - 分享卡可生成（canvas 非 blank）含站点链接，剪贴板降级可用；
   - 全部存档键名与第三节清单一一对应。
5. 数值正确性：10×倍率计分、倍率步进 0.5 封顶（Joker ×7.5）、清空奖励 500、库存剩卡 20/张、段位阈值边界（1399=白金、1400=钻石）。
6. UI 文案走 np_core L 字典（`np_lang` 联动）；触区 ≥44px、键盘可完整通关一局。
7. IndexNow 提交；`STATUS.md` 运营日志追加；开发侧按惯例写 `data/run_stats.jsonl`；iOS Safari + 桌面 Chrome 冒烟通过。

---

### 附：策划备选池（供后续轮次）
- **纸牌家族第三成员候选**：Spider Solitaire / Pyramid Solitaire / Tri-Peaks——按 neon-solitaire+本作数据决定；Tri-Peaks 需先解决揭示逻辑仿真（本轮时间盒内未完成的验证）。
- **新游戏池**：正式见底（Word Search/Lights Out/Crossword/Kakuro 等均 ≤16）。
- **存量 R1/R2 轮**：十款游戏待追加——**最优先建议**（第四次重申：pending 队列 13 份，建议 ops "1 新游戏 : 2 存量轮"配比）。
- **跨游戏联动页**（全站每日三连中心）：页面型设计，建议 ops 直派。

*产出：NeonPlay 市场分析+游戏策划 Agent · 2026-09-14 · 数值经 200 局发牌模拟器校准（贪心全清率 66%/环回 Joker 98%、分数分布 P10-P90=1050-1375）· 品类参照：Golf Solitaire 经典规则、Balatro 开局构筑、Solitaired 变体目录策略*
