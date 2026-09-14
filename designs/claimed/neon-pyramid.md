# Neon Pyramid (neon-pyramid)

> 一句话卖点：**金字塔纸牌的干净网页版**——配对合 13 逐层拆塔，库存三循环、全清率仅 1% 的诚实硬核，每天全球同一副发牌。

- **缝合来源**：Pyramid Solitaire（合 13 配对拆塔）× 每日发牌（日期种子全球同题）× 连胜/段位经济（站内标准栈）
- **目标玩家**：纸牌变体玩家（neon-solitaire/neon-fairway 家族第三成员）；数感型休闲玩家（加法=13 的轻数学）；挑战型玩家（全清率 1% 的硬核荣誉）
- **单局时长**：3-6 分钟

---

## 〇、差异化红线回答（LESSONS.md 第 8 条）

**"比 Google 搜索前 3 名多做了什么？"**——"pyramid solitaire" 品类词稳定（纸牌家族变体词群成员），web 供给为老站换皮+广告墙。本作：

1. **Balatro 式开局 Jokers**（家族策略统一：与 neon-fairway 同套机制）——每局 6 选 3 规则修正器（合 12 也算/额外一循环/金字塔回收/X 光/拆顶锤/双倍底行），同一副牌因构筑而变。→ 满足红线"组合两个已有玩法"（Pyramid Solitaire × 修正器构筑）。
2. **200 局模拟校准的诚实难度**——发牌器+贪心求解器脚本实测（本轮修正了一个"只翻一张库存"的流程 bug 后）：配对中位 13/14、全清率 1%、分数分布 P10=600→max=2650——段位带以真实分布锚定，"全清"是稀有荣誉而非签到。
3. **留存五件套标准栈**——每日发牌+连胜+段位+分享卡，全部 localStorage 静态实现。
4. **家族目录策略**——neon-solitaire（Klondike）+neon-fairway（Golf）+本作（Pyramid）：Solitaired 式"变体即页面"目录，共享牌面渲染/留存框架/用户群，三个独立长尾词。

## 评分卡（按运营入队线口径）

| 维度 | 分 | 说明 |
|---|---|---|
| 搜索需求 | 3/5 | "pyramid solitaire" 独立稳定长尾（小于 golf/solitaire 主词） |
| 竞争空白 | 3/5 | 原版门户有供给（诚实）；"每日发牌+Jokers+段位"组合无供给 |
| 变现意图 | 3/5 | 中短会话 |
| 开发成本低 | 5/5 | **全站最简纸牌引擎**：合 13 配对+暴露判定+库存循环，无花色无叠塔规则；发牌模拟器已校准 |
| 复访价值 | 4/5 | 每日发牌+连胜+全清挑战（1% 荣誉） |
| **合计** | **18/25** | 超过 17 分入队线（家族第三成员，建议与 neon-solitaire/fairway 排期贴近以共享用户） |

---

## 一、调研依据（2026-09-14）

### 热门拆解（含留存机制）
| 游戏 | 核心循环 | **留存机制** | 借鉴→本土化 |
|---|---|---|---|
| **Pyramid Solitaire**（Solitaired/门户变体常驻） | 合 13 配对→拆塔→清空 | 每日发牌+限时挑战 | 规则本体+每日同题；广告砍掉 |
| **Balatro**（修正器构筑范式） | 开局 Jokers→局内滚雪球 | 构筑组合探索 | 6 种修正器三选一（MVP 实现 3 种） |
| **neon-fairway**（站内家族第二成员） | Golf 接龙+Jokers | 每日发牌+连胜 | Jokers 数据结构与三选面板直接复用 |

### 同构分析（饱和度）
- 家族词群策略：pyramid solitaire 词有独立稳定量；家族成员共享用户与框架，边际成本递减。
- 原版门户：发牌随机（死局常见）、规则无变体、无成长体系——三缺口与本站此前立项逻辑一致。

### 异构分析（NeonPlay 现有 17 款的缺口）
- 纸牌家族已立项 Klondike+Golf；Pyramid 为家族第三成员——**机制差异真实**（配对合值 vs ±1 接龙 vs 花色叠塔）、关键词独立、用户重叠但内容新增。
- 站内缺"数字合值配对"动词（数感轻运用）；引擎为全站最简纸牌（无花色、无叠塔次序）。

### 组合为何成立
- 合 13 是唯一的规则认知成本（3 秒），深度全在"拆塔顺序"——先拆哪对能暴露更多，倒推规划。
- 1% 全清率+分数宽分布=段位梯度天然成立；每日同题让"这副你能拆几对"成为可晒挑战。
- 引擎实现与验证双轻（模拟器已校准），适合队列消化期穿插。

---

## 二、玩法设计

### 规则（MVP 共 7 条）
1. 发牌：金字塔 7 行（顶 1→底 7）=28 张 + 库存 24 张（waste 翻一张置于旁）。
2. **配对合 13**：两张**暴露牌**点数和=13（J=11/Q=12/K=13）可消除；K=13 单张即可消除。
3. **暴露**：上方无牌压（(r,i) 被 (r−1,i−1)(r−1,i) 压——即下层先可取，逐层上拆）；库存 waste 顶可与金字塔暴露牌配对。
4. 库存循环：翻尽后未结束可**重洗回再循环**，最多 3 次，每次 −200 分。
5. 局终：金字塔清空（**CLEAR**，稀有）/ 或无任何可行动作→按已得分解算。
6. **Jokers 三选一**（开局 6 选 3，随机）：合 12 也算 / 第四循环 / 金字塔回收（任意一次把托回的 3 张重新取下）/ X 光（预览库存顶 3 张）/ 拆顶锤（移除任意一张暗位牌）/ 双倍底行（底行牌分 ×2）。
7. 计分：每对 100（K 50）、循环 −200、清空奖励 1000；每日发牌=日期种子（mulberry32(YYYYMMDD)），全球同题，当日最优分计戳。

### 数值校准（策划 200 局模拟器实测——贪心求解器，人类高于贪心）
```
配对数：中位 13（满 14）| 平均 14.3 | min 4 / max 28
全清率：1%（ greedy 口径；人类用心规划可达 5-10% ）
分数：P10=600 / P25=850 / P50=1150 / P75=1600 / P90=2050 / max=2650
```

### 段位阶梯（按单局总分）
| 段位 | 分数 | | 段位 | 分数 |
|---|---|---|---|---|
| 🏆 传奇 | ≥2450 | | 🟡 黄金 | 1050-1449 |
| 🥇 大师 | 2150-2449 | | ⚪ 白银 | 600-1049 |
| 💎 钻石 | 1850-2149 | | 🟤 青铜 | <600 |
| 🥈 白金 | 1450-1849 | | | |

### 核心循环（4 步）
1. **扫塔**：底行 7 张先可取——找合 13 对（10+3、9+4、K 独走）。
2. **拆层**：每拆一对露出上层新牌，倒推"拆塔顺序"的隐藏规划。
3. **循环**：库存三循环是最后的翻盘机会，每次循环都要 −200 分——取舍。
4. **晋升**：分数入段位；每日发牌全球同题，明天新塔再拆。

### 操作方案
| 端 | 操作 |
|---|---|
| 触屏 | 点暴露牌选中（辉光）→ 点合 13 的另一张=消除；点 waste 牌可与金字塔牌配对 |
| 鼠标 | 同触屏 |
| 键盘 | Tab/方向键循环暴露牌 / Enter 选中 / D 翻库 / U 撤销（R1）/ R 重开 |

### 美术方向（霓虹色板）
- 底 `#0a0a18` 深空+沙漠夜色剪影（金字塔隐喻：暗金 `#ffd54a` 描线塔形背景）。
- 卡牌白底霓虹描边（复用 neon-solitaire/fairway 家族规范）；可取牌青 `#00e5ff` 呼吸微光，被压牌压暗。
- 配对成功=两牌相向飞出碰撞+"13"金色大字迸裂+粒子；循环=库存翻转动画+−200 红字飘。
- 清空=金字塔整塔金光+法老级 confetti+"PHARAOH CLEAR"斜切字；局终=结算面板玻璃拟态。

---

## 三、长线留存设计（五件套逐项）

### ① 个人进度
- **MVP**：生涯统计（局数/清空数/总配对/最大单局对数）+ 个人最佳分；段位实时展示。
- **R1**：成就徽章墙 8 枚——开石（首局）/ 法老（清空金字塔）/ 千分先生（单局 1000+）/ 循环戒断（清空且零循环）/ 三日连胜 / 七日连胜 / 百对拆塔（生涯 100 对）/ 大满贯（三模式各胜）。
- **R2**：牌背主题 3 套（暗金→星云→复古莎草纸），徽章解锁。

### ② 个人排行榜
- **MVP**：Top10 本地榜（分数/配对数/日期）+ 每周最佳（`YYYY-Www`）；结构含 `date`/`seed` 字段为全局榜预留。
- **R1**：目标线——开局显示"个人最佳分"；每日发牌历史分数曲线。
- **R2**：ghost——每日发牌显示"个人最佳同配对数分数"对比线。

### ③ 一键分享
- **MVP**：结算面板"分享"→ canvas 成绩卡（分数/配对数/是否清空/段位/日期+`seyrs1985.github.io/neonplay` 链接）→ Web Share API→剪贴板降级：`🔺 Neon Pyramid 每日发牌 1,760 分（13 对）💎钻石 | 链接`；清空文案：`PHARAOH CLEAR 全塔清空！`。
- **R1**：每日分享带 `#NeonPyramidDaily 09-14` 标签；段位晋升卡。
- **R2**：全清专属金框卡。

### ④ 回访钩子
- **MVP**：**每日发牌**（日期种子全球同题，当日最优分计戳）+ **游戏内连胜**（`np_neon-pyramid_streak`，月度补签卡 1 张）。
- **R1**：连胜日历热力格+断签提醒；每日分数历史曲线。
- **R2**：每日 3 小任务（玩 1 局 / 清空 1 次 / 单局 10 对）。

### ⑤ 目标阶梯
- **MVP**：七段位（见上表）+ 结算"距下一段位差 X 分"。
- **R1**：徽章墙与段位合并；大师段位解锁第二牌背（衔接收集）。
- **R2**：月度赛季归档；双塔高阶布局扩段位。

### 存档键名清单（规范 `np_<slug>_<key>`，全部 JSON 字符串）
| 键 | 数据结构 | 分期 |
|---|---|---|
| `np_neon-pyramid_best` | `{"score":1760,"pairs":13,"date":"2026-09-14"}` | MVP |
| `np_neon-pyramid_top10` | `[{"score":..,"pairs":..,"date":".."}] ≤10` | MVP |
| `np_neon-pyramid_daily` | `{"date":"2026-09-14","score":..,"done":true}` | MVP |
| `np_neon-pyramid_streak` | `{"count":3,"last":"2026-09-14","best":7,"protect":1}` | MVP |
| `np_neon-pyramid_stats` | `{"games":9,"clears":1,"pairs":118,"bestPairs":13}` | MVP |
| `np_neon-pyramid_weekly` | `{"weekKey":"2026-W38","best":{"score":..}}` | MVP（展示可 R1） |
| `np_neon-pyramid_badges` | `["first_win","pharaoh","..."]` | R1 |
| `np_neon-pyramid_settings` | `{"theme":"gold","sound":true}` | R2 |

---

## 四、商业化
- **广告位**：落地页构建器默认注入位照旧；局内零插屏（纸牌人群判断，同家族）。
- P2 预留："看激励广告=第四循环"按钮位注释（AdSense 接入后启用；每日成绩按原额记录）。

---

## 五、SEO

**关键词簇**：`pyramid solitaire free online` / `pyramid solitaire no ads` / `play pyramid solitaire` / `solitaire variants` / `13 pairs card game` / `daily pyramid solitaire`。标题建议：`Neon Pyramid — Free Pyramid Solitaire with Daily Deal & Jokers`。

**FAQ 4 条要点（落地页 FAQPage schema）**：
1. **What is Neon Pyramid?** — A free pyramid solitaire: remove exposed card pairs that sum to 13 (Kings count alone) and dismantle the whole pyramid. No download, no account.
2. **What are Jokers?** — Each round starts with a pick of 1 from 3 rule modifiers (like "12s count too" or an extra stock cycle) — the same deal plays differently with each build.
3. **Is there a daily deal?** — Yes: one seeded deal identical worldwide every day, with streak tracking and your best score on the board.
4. **Is it hard?** — Fair: full clears are rare and prestigious (about 1% of deals), but your score from partial clears still counts toward ranks and streaks.

落地页同款要求：VideoGame/FAQPage schema、game-first 首屏、面包屑、推荐位挂 Neon Solitaire 与 Neon Fairway（纸牌家族三连互链）。

---

## 六、MVP 范围（开发 Agent 一轮 ≤15 分钟，含留存基线）

**做**：
- 结构仿站内惯例：`index.html + game/style.css + game/js/main.js + game/js/game.js`；DOM 卡片。
- 规则引擎：发牌器（52 洗→28 塔+24 库）、暴露判定（上压公式照文档）、合 13 配对（K 单张）、库存三循环、局终判定；Joker 三选一面板（6 种数据驱动，实现 3 种：合 12 也算/第四循环/双倍底行——其余 R1 占位）。
- **留存基线（模板硬性要求）**：best/Top10/weekly/daily/streak（月度补签卡）/stats 六键按清单，局终即存+10s 自动存；分享卡 canvas+Web Share API→剪贴板降级；段位+差值展示；每日发牌+随机练习双模式。
- 动效：配对碰撞+13 迸裂、循环 −200 红飘、清空金塔光柱+confetti、NEW BEST 扫光；中英 i18n（np_core）；`__qaState/__qa`（含 `__qa.deal()` 确定性发牌、`__qa.autoPlay()` 贪心求解）。
- 落地页：VideoGame/FAQPage schema + 4 FAQ + 推荐位挂 Neon Solitaire 与 Neon Fairway（家族三连互链）。

**不做（明确砍掉）**：音效、后 3 种 Joker（R1）、双塔布局（R2）、撤销、主题包、ghost、小任务、zen 模式。
**超时降级顺序**：先砍 weekly 榜（保 best/daily/streak）→ 再砍 Joker 面板（固定发"合 12 也算"，保构筑叙事）→ 规则引擎+每日发牌不可砍。

---

## 七、留存路线图 R1/R2

- **R1（1-2 个后续轮次）**：后 3 种 Joker 实装、成就徽章墙 8 枚（np_neon-pyramid_badges）、结算目标线差值、连胜日历热力格+断签提醒、每日分享带日期标签。
- **R2**：每日 3 小任务、牌背主题 3 套（徽章解锁）、ghost 对比线、双塔布局、月度赛季归档、激励广告第四循环位启用。

---

## 八、验收标准

1. 线上 `/neon-pyramid/` HTTP 200；375×667 游戏框首屏 58vh（一票否决项）；无控制台报错。
2. **玩法验证红线（LESSONS 第 9 条）**：qa_playtest 用 `__qa.deal()` 断言当日发牌确定性（两次加载塔面一致）+ `__qa.autoPlay()` 贪心打完→断言局终结算面板与配对数；人为无动作→断言局终按分解算；全程 `window.onerror` 零报错。纯布局 pass 不算可玩。
3. **规则 QA**：合 13 判定（含 K=13 单张、A+Q 边界）；暴露判定三例（顶压不可取/底层可取/上层清空后解锁）；循环上限 3 次与 −200 罚分；清空奖励 1000。
4. **留存验收（模板硬性要求）**：
   - 刷新后 best/Top10/streak/daily 戳不丢（逐键核对第三节清单）；
   - 连胜跨天 +1/断档归 1/补签卡消耗（改本地时间验证）；
   - 每日种子确定性：同日两次加载塔面与 Joker 三选一致；次日不同；
   - 分享卡可生成（canvas 非 blank）含站点链接，剪贴板降级可用；
   - 全部存档键名与第三节清单一一对应。
5. 数值正确性：配对 100/K 50/循环 −200/清空 1000；段位阈值边界（2149=钻石、2150=大师）。
6. UI 文案走 np_core L 字典（`np_lang` 联动）；触区 ≥44px、键盘可完整通关一局。
7. IndexNow 提交；`STATUS.md` 运营日志追加；开发侧按惯例写 `data/run_stats.jsonl`；iOS Safari + 桌面 Chrome 冒烟通过。

---

### 附：策划备选池（供后续轮次）
- **纸牌家族第四成员候选**：FreeCell（需求 5 但引擎中重、发牌可解性无轻量保证）/ Spider（引擎重）/ Tri-Peaks（揭示仿真需先完成）——按家族前两款数据决定。
- **新游戏池**：确认见底（其余 ≤16 分）。
- **存量 R1/R2 轮**：十一款游戏待追加——**最优先建议（连续第五次重申）：pending 队列 14 份，强烈建议 ops 立即冻结新游戏立项、排定存量 R1 轮清单（可由本 Agent 按每款游戏的 R1 章节批量输出实现级设计文档）。**
- **跨游戏联动页**（全站每日三连中心）：页面型设计，建议 ops 直派。

*产出：NeonPlay 市场分析+游戏策划 Agent · 2026-09-14 · 数值经 200 局发牌模拟器校准（配对中位 13/14、全清率 1%、分数 P10-P90=600-2050）；模拟过程中修复了"库存翻一张即局终"的流程 bug（已在本轮 QA 红线中加防回归断言）· 品类参照：Pyramid Solitaire 经典规则、Balatro 修正器范式*
