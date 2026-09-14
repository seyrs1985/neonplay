# Reflex Rush (reflex-rush)

> 一句话卖点：**你的反应到底多少毫秒？**——霓虹目标收缩消失前点中它，30 秒打出一串反应时成绩，段位从青铜到传奇，每日全球同题，晒出你的 ms 卡片。

- **缝合来源**：Human Benchmark（反应时基准测试 + 晒分文化）× 打地鼠/Whack-a-Mole（目标生成-点击街机循环）× 段位阶梯（评级成长体系）
- **目标玩家**：FPS/竞技玩家（用 Human Benchmark 自证的成熟人群，r/HumanBenchmark 整个社区在晒分）；想知道"自己反应多快"的泛用户（体检式零门槛）；碎片时间点击玩家
- **单局时长**：30 秒（全站最短局，一局即一个完整体验闭环）

---

## 〇、差异化红线回答（LESSONS.md 第 8 条）

**"比 Google 搜索前 3 名多做了什么？"**——搜 "reaction time test" 前排是 [Human Benchmark](https://humanbenchmark.com/tests/reactiontime) 等纯工具站：一次只测一下、无游戏性、无段位、无每日、无移动端体验。本作：

1. **基准测试的游戏化**——反应时不再是"按 5 次看平均值"的体检，而是 30 秒连击街机：目标环收缩倒逼出手、连击倍率滚雪球、失误清零的心跳感。→ 满足红线"组合两个已有玩法"（基准测试 × 打地鼠街机循环）。
2. **晒分文化落地为产品**——[r/HumanBenchmark](https://www.reddit.com/r/HumanBenchmark/) 整个社区以比较反应时为乐（FPS 玩家拿它对标枪法，帖子里全是"我 195ms"）；本作把晒分做成一键分享卡（分数/均速 ms/段位/日期+站点链接），并给每日全球同题。→ 满足红线"解决 Reddit/Quora 上有人抱怨找不到好方案的问题"（社区想要游戏化变体而工具站多年不变）。
3. **移动端原生**——现有 aim trainer 类全是桌面鼠标向；本作触屏点按+键盘可达双支持。
4. **段位锚定真实数据**——段位阈值取自公开讨论的人类反应分布（均值 210-280ms，FPS 顶尖 130-180ms），段位不是玄学而是体检结论。

## 评分卡（按运营入队线口径）

| 维度 | 分 | 说明 |
|---|---|---|
| 搜索需求 | 4/5 | "reaction time test / reflex game / aim trainer" 常青大词，Human Benchmark 心智全民普及 |
| 竞争空白 | 4/5 | 反应测试=工具非游戏；游戏化版移动端供给薄；"段位+每日+分享卡"组合无供给 |
| 变现意图 | 3/5 | 超短局高频次（一局 30 秒=一天可刷 N 局），会话频次型库存 |
| 开发成本低 | 5/5 | 全站最简街机：生成圆环+命中检测+计时器；零素材零物理引擎 |
| 复访价值 | 5/5 | 每日同题+连胜+段位晋升+"今天状态好不好测一下"的体检式回访 |
| **合计** | **21/25** | 显著超过 17 分入队线 |

---

## 一、调研依据（2026-09-12）

### 需求挖掘（本轮）
| 来源 | 原声/事实 | 信号 |
|---|---|---|
| [r/HumanBenchmark（整个社区）](https://www.reddit.com/r/HumanBenchmark/) | 成立专门 subreddit 晒反应时分数、比较凹 bananas 式刷分 | 晒分文化=现成传播引擎，工具无游戏化 |
| [r/Competitiveoverwatch 帖](https://www.reddit.com/r/Competitiveoverwatch/comments/50o7mc/) | 玩家晒"段位 SR + Human Benchmark 分数"双卡 | 反应时=竞技身份象征，段位化有心智基础 |
| [r/FPSAimTrainer 帖](https://www.reddit.com/r/FPSAimTrainer/comments/pxvamq/) | 大神 130-140ms、普通 210-280ms 分布讨论 | 段位阈值可用真实分布锚定 |
| [r/GlobalOffensive 讨论](https://www.reddit.com/r/GlobalOffensive/comments/3k0dlw/) | 玩家争论 benchmark 分数与实战的关系 | 话题自传播性强 |

### 热门拆解（含留存机制，按新模板要求单列）
| 游戏 | 核心循环 | **留存机制** | 借鉴→本土化 |
|---|---|---|---|
| **Human Benchmark**（工具站顶流） | 点击→测 ms→看百分位 | **分享攀比**（r/ 子版晒分）、百分位排名感 | 分享卡+段位百分位感；补上它没有的每日/连胜 |
| **打地鼠/Whack-a-Mole 街机** | 目标出现→敲击→计分 | 无长线留存（纯瞬时） | 保留目标-点击循环，加连击倍率与收缩倒计时张力 |
| **Piano Tiles 类**（超休闲点按标杆） | 节奏点按→分数→排行榜 | 每日挑战+段位+好友榜 | 日期种子每日同题（复用站内 brickstorm-daily 的 mulberry32 模式） |

### 同构分析（饱和度）
- "reaction test" 工具站多家（humanbenchmark 头部），形态 10 年未变：单次测量+百分位。
- 游戏化反应类：桌面向 aim trainer（鼠标 FPS 圈）、Piano Tiles（节奏向）；**"触屏反应街机+段位+每日同题"组合在 web 端无直接供给**。
- 卷什么：题库/皮肤（超休闲）；我们卷"可晒性"（ms 数字+段位天然可晒）。

### 异构分析（NeonPlay 现有 17 款的缺口）
现状四类分区：🎮街机动作 6（全是"持续操作"型：躲避/弹球/消除）、🧩益智解谜 6、🐝词与逻辑 4、💫放置挂机 1。
- **缺口：瞬间反应型=0 款**——站内没有一款游戏以"反应速度"本身为核心指标；本作补上"竞技度量"型，且是全站最短局（30 秒），填补碎片时间场景。
- "测反应"自带体检好奇心，是站内获客转化器（"看看你多少 ms"→顺便玩别的）。

### 组合为何成立
- 反应 ms 是**天生可分享的数字**（如身高体重之于体检）——Human Benchmark 已验证分享文化，我们只需把分享做顺（一键卡片）。
- 打地鼠循环给 ms 数字加了游戏张力（收缩环=决策压力，连击=滚雪球），基准测试的"再测一次"冲动转化为街机的"再来一局"。
- 段位表锚定真实人类分布→可信→更想晒。

---

## 二、玩法设计

### 规则（MVP 共 6 条）
1. 一局 30 秒；同屏 1 个目标：霓虹圆环在随机位置出现并**从外向内收缩**，2.2 秒内不点即超时失误（连击清零、圆环红碎）。
2. 点中：记录该次反应 ms（出现→点中），圆环爆裂粒子+ms 飘字；下一个目标随机位置出现。
3. 单次得分 = `max(10, floor((500 − ms)/5))`（越快越高：250ms=50 分，450ms=10 分）；连击倍率：连续命中 3/6/10 次 → ×2/×3/×4（失误清零）。
4. 误点空白处 = 失误（连击清零）——手要有准头。
5. 结算：总分、均速 ms、最佳单次 ms、最高连击、段位；超过个人最佳则"NEW BEST"庆祝。
6. 模式：**经典**（随机序列）/**每日挑战**（`mulberry32(YYYYMMDD)` 种子驱动目标位置序列与出现间隔，全球同题，当日可重复挑战、取最高分计当日戳）。

### 段位阶梯（阈值锚定公开人类反应分布；按单局均速 ms 判定）
| 段位 | 均速 | 说明 |
|---|---|---|
| 🏆 传奇 | <200ms | 顶尖 FPS 玩家区间 |
| 🥇 大师 | <230ms | 极少数 |
| 💎 钻石 | <260ms | 人类均值偏快 |
| 🥈 白金 | <290ms | 均值区（210-280ms）|
| 🟡 黄金 | <330ms | 均值上沿 |
| ⚪ 白银 | <400ms | 偶尔走神 |
| 🟤 青铜 | ≥400ms | 入门 |

### 核心循环（4 步）
1. **出现**：目标环弹出，开始收缩——心跳开始。
2. **出手**：点中→ms 飘字+连击+1；犹豫=环消失=连击清零。
3. **滚雪球**：连击倍率让快手分数指数拉开，冲个人最佳。
4. **晒**：结算段位+分享卡；明天来打每日同题刷段位。

### 操作方案
| 端 | 操作 |
|---|---|
| 触屏 | 点按目标（全屏点击区，误点空白=失误——准头即玩法） |
| 鼠标 | 同触屏 |
| 键盘 | 无障碍模式：目标自动获得焦点环，Enter/Space=击中当前目标，Tab 切换（反应游戏天然指针向，键盘模式保可达性底线即可） |

### 美术方向（霓虹色板）
- 底 `#0a0a18` 深空+呼吸网格；目标=三层同心圆环（外辉光圈/中环/芯点）青 `#00e5ff`，收缩时外圈光弧旋转。
- 命中=环爆裂 8 向粒子+**ms 飘字**（`234ms` 金色 `#ffd54a`）；超时/误点=红 `#ff2d95` 碎裂+轻震屏。
- 连击计数器=右上角胶囊，倍率升级时弹跳+描边变色（×2 绿 `#39ff88` → ×3 紫 → ×4 金）。
- 结算=玻璃拟态面板：总分大数字翻滚、均速 ms 定帧、段位徽章辉光入场；NEW BEST=全屏金色扫光。

---

## 三、长线留存设计（五件套逐项）

### ① 个人进度
- **MVP**：生涯统计（局数/总命中/生涯最佳单次 ms）+ 个人最佳总分；段位称号按均速实时计算展示（无额外存储）。
- **R1**：成就徽章墙 8 枚——初试身手（完成 1 局）/ 破晓之速（单次 <200ms）/ 连击大师（单局 ×4 倍率触发）/ 百发百中（单局零失误）/ 均速传奇（段位=传奇）/ 三日连胜 / 七日连胜 / 百局老手（生涯 100 局）。
- **R2**：可收集要素——目标环皮肤（光谱/脉冲/星环）与命中拖尾色，靠段位/成就解锁，无付费墙。

### ② 个人排行榜
- **MVP**：Top10 本地榜（分数/均速/日期）+ 每周最佳（`YYYY-Www` 周键）；存档结构预留 `date` 与 `dailyDate` 字段，为未来全局榜平移。
- **R1**：个人纪录目标线——结算面板显示"距你的最佳还差 X 分"进度条；Top10 中每日挑战成绩带 📅 标记。
- **R2**：ghost 线——游戏中实时显示"你的最佳同刻分数"虚线对比。

### ③ 一键分享
- **MVP**：结算面板"分享"按钮 → canvas 生成成绩卡（总分/均速 ms/段位徽章/日期 + `seyrs1985.github.io/neonplay` 链接）→ Web Share API，不支持时降级剪贴板复制文本（`我在 Neon Play 反应测试打出 4,320 分（均速 243ms，💎钻石段位）→ 链接`）。
- **R1**：每日挑战分享自带日期与全球同题标签（`#ReflexRushDaily 09-12`）；段位晋升卡（青铜→白银瞬间可分享）。
- **R2**：连胜里程碑卡（7 天 🔥）。

### ④ 回访钩子
- **MVP**：**每日挑战**（mulberry32 日期种子，全球同题，当日戳）+ **连胜 streak**（游戏内 `np_reflex-rush_streak`，与站点级 `np_streak` 相互独立；断签宽容：每月 1 张补签卡自动使用，存档记录 protect 字段）。
- **R1**：连胜可视化（日历热力格）+ 断签提醒文案（结算时"明天再来保住 🔥N"）。
- **R2**：每日 3 小任务（玩 1 局经典 / 完成每日 / 均速 <300ms，完成发成就进度）。

### ⑤ 目标阶梯
- **MVP**：七段位（见上表），结算面板常驻"距下一段位还差 Xms"——"下一局"永远有明确目标。
- **R1**：段位徽章入图鉴墙（与成就合并展示）；里程碑奖励（首个钻石段位解锁首个皮肤，衔接 R2 收集）。
- **R2**：赛季概念（按月重置周最佳，段位历史档案）。

### 存档键名清单（规范 `np_<slug>_<key>`，全部 JSON 字符串）
| 键 | 数据结构 | 分期 |
|---|---|---|
| `np_reflex-rush_best` | `{"score":4320,"avgMs":243,"date":"2026-09-12"}` | MVP |
| `np_reflex-rush_top10` | `[{"score":..,"avgMs":..,"date":".."}] ≤10` | MVP |
| `np_reflex-rush_daily` | `{"date":"2026-09-12","score":..,"avgMs":..,"done":true}` | MVP |
| `np_reflex-rush_streak` | `{"count":3,"last":"2026-09-12","best":7,"protect":1}` | MVP |
| `np_reflex-rush_stats` | `{"games":12,"hits":180,"targets":192,"sumMs":45120}` | MVP |
| `np_reflex-rush_weekly` | `{"weekKey":"2026-W37","best":{"score":..,"avgMs":..}}` | MVP（展示可 R1） |
| `np_reflex-rush_badges` | `["first_run","sub200","..."]` | R1 |
| `np_reflex-rush_settings` | `{"sound":false,"zen":false}` | R2 |

---

## 四、商业化
- **广告位**：落地页构建器默认注入位（页头横幅）照旧；游戏内零插屏——本作一局 30 秒，插屏会毁掉"再来一局"循环。P2 预留结算面板"看激励广告=今日双倍分"按钮位注释（AdSense 接入后启用，MVP 不实现）。
- 留存钩子全部为游玩解锁（见第三节），无付费墙。

---

## 五、SEO

**关键词簇**：`reaction time test game` / `reflex test online` / `aim trainer mobile` / `how fast is my reaction` / `tap speed test game` / `reaction game unblocked` / `whack a mole online`。标题建议：`Reflex Rush — Reaction Time Test Game with Ranks & Daily Challenge (Free)`。

**FAQ 4 条要点（落地页 FAQPage schema）**：
1. **What is Reflex Rush?** — A free reaction-time arcade game: neon targets shrink fast, tap them before they vanish, chain combos, and turn your milliseconds into a rank from Bronze to Legend.
2. **What's a good reaction time?** — Average visual reaction is around 210-280ms; consistent sub-230ms is elite (that's Diamond+ here). Your rank is computed from your 30-second average.
3. **Is there a daily challenge?** — Yes — a seeded board identical for everyone worldwide each day, with streak tracking and milestone forgiveness so one busy day doesn't break your run.
4. **Can I play on mobile?** — Yes, tap-first design with full keyboard accessibility; free, no download, no account; scores save on your device and share as a card in one tap.

落地页同款要求：VideoGame/FAQPage schema、game-first 首屏、面包屑、推荐位挂 Flappy Dash 与 Neon Pop（街机动作互链）。

---

## 六、MVP 范围（开发 Agent 一轮 ≤15 分钟，含留存基线）

**做**：
- 结构仿站内惯例：`index.html + game/style.css + game/js/main.js + game/js/game.js`；canvas（复用站内 bootstrap）。
- 核心玩法：30s 局、目标环生成/收缩/超时、命中 ms 记录、连击倍率（3/6/10→×2/×3/×4）、误点空白失误、结算面板（总分/均速/最佳单次/最高连击/段位+距下一段位差值）。
- **留存基线（本模板硬性要求）**：本地最佳+Top10+每周键+每日挑战（mulberry32 日期种子，复用 brickstorm-daily 模式）+游戏内 streak（月度补签卡 1 张）+生涯统计；分享卡（canvas 绘制+Web Share API→剪贴板降级）；存档键按第三节清单，10s 自动存+结算即存。
- 动效：环爆粒子/ms 飘字/连击胶囊/NEW BEST 扫光；中英 i18n（np_core）；`__qaState/__qa` 钩子（站点 QA 惯例）。
- 落地页：VideoGame/FAQPage schema + 4 FAQ + 推荐位。

**不做（明确砍掉）**：音效、双目标/诱饵目标、成就墙、ghost 线、小任务、皮肤收集、zen 模式。
**超时降级顺序**：先砍 weekly 榜（保 best/daily/streak）→ 再砍 Top10（保 best）→ 分享降级为纯文本模板 → 核心玩法与每日+streak 不可砍。

---

## 七、留存路线图 R1/R2

- **R1（1-2 个后续轮次）**：成就徽章墙 8 枚（np_reflex-rush_badges）、诱饵目标（红色假环，点了扣分=增加判断深度）、周最佳展示+目标线进度条、连胜日历热力格+断签提醒、每日分享带日期标签。
- **R2**：每日 3 小任务、目标环皮肤/拖尾收集（段位与成就解锁）、zen 无限模式（无失败练习场）、ghost 实时对比线、赛季月度归档（周最佳重置+历史档案）、激励广告双倍分位启用。

---

## 八、验收标准

1. 线上 `/reflex-rush/` HTTP 200；375×667 游戏框首屏 58vh（一票否决项）；无控制台报错。
2. **玩法验证红线（LESSONS 第 9 条）**：qa_playtest 派发 pointerdown 命中首个目标→断言 ms 飘字与连击计数出现；故意不点等超时→断言失误清零；跑完整局→断言结算面板含总分/均速/段位；全程 `window.onerror` 零报错。纯布局 pass 不算可玩。
3. **留存验收（新模板硬性要求）**：
   - 刷新页面后 best/Top10/streak/daily 完成戳不丢（逐键核对第三节清单）；
   - 连胜逻辑：昨日有戳今日完成→count+1；断档→count=1 且月度补签卡消耗（可用改本地时间验证跨天）；
   - 每日种子确定性：同日两次加载，每日模式目标序列一致（对比前 5 个目标坐标）；
   - 分享卡可生成（canvas 非 blank）且含站点链接；剪贴板降级在无 Web Share 环境（桌面 Firefox）可用；
   - 全部存档键名与第三节清单一一对应，无未列明键。
4. 数值正确性：单次得分公式、连击倍率档位（3/6/10→×2/×3/×4）、段位阈值边界（如均速 229.9ms=大师、230ms=钻石）。
5. 30s 计时不因后台切换失真（时间基驱动）；命中判定容差合理（触屏点中环体半径+8px 宽容）。
6. UI 文案走 np_core L 字典（`np_lang` 联动）；键盘无障碍模式可完成一局。
7. IndexNow 提交；`STATUS.md` 运营日志追加；开发侧按惯例写 `data/run_stats.jsonl`；iOS Safari + 桌面 Chrome 冒烟通过。

---

### 附：策划备选池（供后续轮次）
- **Tile Match 羊了个羊式**（层叠三消+托盘）：z 轴命中风险待评估——观察。
- **Flick 投篮/掷点街机**：抛物线物理+框碰撞，留存五件套同样适配——下轮候选。
- **WebAudio 程序化节奏游戏**：站内程序化音画能力可支撑，判定手感打磨风险高——观察。
- **R1/R2 内容轮**：本作成就/皮肤、Word Hive 中文板包、Nonogram 7×7 题包。

*产出：NeonPlay 市场分析+游戏策划 Agent · 2026-09-12 · 需求来源：r/HumanBenchmark、r/Competitiveoverwatch、r/FPSAimTrainer（段位阈值锚定公开反应分布 210-280ms 均值/130-180ms 顶尖）*

> 已实现:2026-09-15 https://seyrs1985.github.io/neonplay/reflex-rush/
