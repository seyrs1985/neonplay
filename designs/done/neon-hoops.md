# Neon Hoops (neon-hoops)

> 一句话卖点：**带风力的指尖扣篮**——拖拽出手划出抛物线，风会推你的球，60 秒限时赛连中滚分，段位从青铜到传奇，每日全球同一套风力。

- **缝合来源**：Dunk Shot 系扣篮街机（拖拽投掷+轨迹预览+连中进阶）× 高尔夫弹道风（风力修正出手，Golf Battle 类惯例）× 每日种子赛（Wordle/brickstorm-daily 的日期哈希模式）
- **目标玩家**：街机投掷爱好者（Dunk Shot/篮球抛投类玩家）；体育休闲人群（全站尚无体育品类）；喜欢"今天风不一样"的每日挑战党
- **单局时长**：60 秒（限时赛），碎片时间友好

---

## 〇、差异化红线回答（LESSONS.md 第 8 条）

**"比 Google 搜索前 3 名多做了什么？"**——搜 "basketball shooting game online"，前排 Dunk Shot 系克隆清一色：静态篮筐、无风、无每日、无段位（[2026 年 4 月 Playgama 篮球游戏盘点](https://playgama.com/blog/2026/04/16/top-basketball-games-april-2026/)描述的品类公式仍是"拖拽+虚线轨迹"裸形态）。本作：

1. **风力弹道**——每球带横向风（旗标+粒子可视化），出手必须修弹道：把高尔夫的"读风"机制移植进扣篮街机，给纯瞄准玩法加上一层判断深度。→ 满足红线"组合两个已有玩法"（扣篮街机 × 高尔夫风力）。
2. **每日风力全球同题**——`mulberry32(YYYYMMDD)` 种子驱动当日风序列与篮筐走位（复用站内 brickstorm-daily 成熟模式）：同样 60 秒、同样的风、成绩天然可比——静态篮筐克隆做不到的"公平竞技感"。
3. **段位+分享卡**——60 秒分数换算七段位（青铜→传奇），结算一键 canvas 成绩卡（分数/连中/段位/日期+站点链接），Web Share API 一键晒。留存五件套全量落位（见第三节）。
4. **体育品类补全**——站内 17 款无体育向；篮球是 web 休闲体育第一大类（CrazyGames one-button 分类常驻 hoop 系）。

## 评分卡（按运营入队线口径）

| 维度 | 分 | 说明 |
|---|---|---|
| 搜索需求 | 4/5 | "basketball game online / dunk shot / hoop game" 常青体育大词，品类 2026 年仍在门户热榜 |
| 竞争空白 | 3/5 | flick 篮球克隆多（诚实扣分），但"风力+每日种子+段位"组合无供给 |
| 变现意图 | 4/5 | 60 秒局高频次型广告库存；一局一结算=天然插屏节奏位（仅预留不做强制） |
| 开发成本低 | 3/5 | 抛物线物理简单（重力+两点碰撞），但瞄准手感与篮筐走位需要调校 |
| 复访价值 | 5/5 | 每日风力同题+连胜+段位晋升，"今天的风我还没打" |
| **合计** | **19/25** | 超过 17 分入队线 |

---

## 一、调研依据（2026-09-13）

### 热门拆解（含留存机制）
| 游戏 | 核心循环 | **留存机制** | 借鉴→本土化 |
|---|---|---|---|
| **Dunk Shot 系**（超休闲标杆） | 拖拽出手→进筐→篮筐走位变远变高 | 仅连中爽感，无每日/无段位/无存档目标 | 拖拽+轨迹虚线+进筐走位；补上每日/段位/分享 |
| **Golf Battle 类弹道高尔夫** | 瞄准+读风→修正弹道→入洞 | 风力让每局不同=天然新鲜感 | 风力机制移植；"每日一套风"让新鲜感可比较、可竞技 |
| **CrazyGames one-button hoop 系**（[Hoop World 3D 等](https://www.crazygames.com/t/one-button)） | 单键起跳扣篮 | 门户推荐位流量，无自有回访 | 反衬：留存钩子全靠我们自带 |

### 需求与供给判断
- 品类 2026 年仍活跃：[Playgama 2026-04 盘点](https://playgama.com/blog/2026/04/16/top-basketball-games-april-2026/)专门收录 flick 系，描述公式与三年前无异——**品类无进化，卷的是换皮**。
- 无后端站点的"每日同题"是克隆的技术门槛（它们没有种子文化），恰是本站已有基建（brickstorm-daily/Alchemy/Nonogram 三度复用）。

### 同构分析（饱和度）
- flick 篮球克隆群饱和：卷皮肤、卷 3D、卷物理花活（Hoop Smash 类）。
- 弹道风在高尔夫品类常见、在篮球品类**无人做**——两个成熟机制的跨品类搬运即差异化。
- 每日挑战文化被站内三款游戏验证（brickstorm-daily/Alchemy/Nonogram 全部上线且带当日戳）。

### 异构分析（NeonPlay 现有 17 款的缺口）
现状四类分区：🎮街机动作 6、🧩益智解谜 6、🐝词与逻辑 4、💫放置挂机 1。
- **缺口：体育/投掷=0 款**——全站无一款"以准头为核心"的游戏；街机动作 6 款全是躲避/弹球/消除，投掷抛物线是新的操作动词（拖拽向量），操作光谱补全。
- 受众：体育休闲玩家（篮球人群基数大、性别与年龄分布广），与站内现有玩家重叠低。
- 时长结构：60 秒限时赛与站内 30 秒（reflex-rush）/3-6 分钟（brickstorm）/挂机（idle）形成完整时长梯度。

### 组合为何成立
- 拖拽投掷人人会（微信弹球/桌球教育过全市场），风力叠加的是"读环境"的轻策略——操作上限与门槛同时拉开，快手和萌新都有奔头。
- 风是**可解释的随机**：看得见旗标、算得出修正，失误不冤——比纯随机更适合竞技感与分享语境（"今天风太邪门"是天然话题）。
- 篮筐走位+风力双重变量让 60 秒内节奏不重复，避免 flick 系"三球看穿"的老毛病。

---

## 二、玩法设计

### 规则（MVP 共 7 条）
1. 一局 60 秒限时赛；球每球从底部随机 x 位置刷新，篮筐在屏幕右半区（含篮板），进一球后篮筐重新走位（距离/高度渐进上升，范围封顶）。
2. **出手**：从球按住向后下拖拽，松手=发射（拖拽向量决定角度与力度）；显示前 8 个轨迹预览点（品类惯例）。
3. **风**：每球随机横向风 w∈[−3,+3]，屏幕上方旗标+风粒子可视化（强度=旗标摆幅）；球飞行中受 `ax = w×2.2 px/s²`。经典模式每球独立随机；**每日模式**由日期种子驱动整局风序列+篮筐走位（全球同题）。
4. 进球判定：球心从上向下穿过筐口平面（两筐尖点之间）且 vy>0；碰筐尖（两个小圆碰撞体）或篮板会真实反弹。
5. 计分：普通进球 +2，**空心球（swish，未碰筐/板）+3**；连中 combo 每球额外 +1（封顶 +5），失误（球落地）清零 combo。
6. 键盘模式：←→ 调角度（15° 步进）、↑↓ 调力度（5% 步进）、Space 发射；屏幕显示角度/力度表。
7. 结算：总分/命中数/最高连中/swish 数/段位；破个人最佳触发 NEW BEST 扫光。

### 段位阶梯（按单局总分；60 秒典型命中 8-14 球）
| 段位 | 分数 | | 段位 | 分数 |
|---|---|---|---|---|
| 🏆 传奇 | ≥150 | | 🟡 黄金 | 30-49 |
| 🥇 大师 | 105-149 | | ⚪ 白银 | 15-29 |
| 💎 钻石 | 75-104 | | 🟤 青铜 | <15 |
| 🥈 白金 | 50-74 | | | |

### 核心循环（4 步）
1. **读风**：看旗标→心算修正量（风 3 ≈ 提前小半格出手）。
2. **出手**：拖拽划弧，虚线预览只到半程——远端靠感觉与经验。
3. **连中**：进筐走位升级+combo 滚雪球，swish 有额外奖励诱导"不惜碰板也要干净入网"。
4. **晒与回访**：段位+分享卡；明天来打"今日风"全球同题。

### 操作方案
| 端 | 操作 |
|---|---|
| 触屏 | 按住球向后下拖拽→松手发射（实时轨迹虚线）；拖出屏幕取消 |
| 鼠标 | 同触屏 |
| 键盘 | ←→ 角度步进 / ↑↓ 力度步进 / Space 发射 / R 重开；角度力度表常驻 |

### 美术方向（霓虹色板）
- 底 `#0a0a18` 深空+街头球场剪影（霓虹描线围栏/天际线）；球场地面=发光边线。
- 球=橙金 `#ff9e40` 圆+旋转条纹+短拖尾；篮筐=青 `#00e5ff` 筐尖双点+品红 `#ff2d95` 网（网格线物理摆动——进球时网兜翻涌）。
- 风=顶部旗杆（旗面摆幅=风力）+ 横向流光粒子；逆风粒子偏色红、顺风偏绿 `#39ff88`。
- 进球=网兜翻涌+金色 `#ffd54a` 分数飘字+confetti 小爆发；swish=全屏 "SWISH!" 斜切字+篮筐金框闪光；combo 胶囊弹跳升档。
- 结算=玻璃拟态面板+段位徽章辉光入场+NEW BEST 金色扫光。

---

## 三、长线留存设计（五件套逐项）

### ① 个人进度
- **MVP**：生涯统计（局数/出手/命中/累计 swish）+ 个人最佳；段位按单局分实时计算展示。
- **R1**：成就徽章墙 8 枚——开张（首球命中）/ 干净利落（首次 swish）/ 手感火热（单局 5 连中）/ 大心脏（单局 10 连中）/ 神射（单局 ≥75 分钻石档）/ 三日连胜 / 七日连胜 / 百球生涯（命中 100 球）。
- **R2**：球皮肤 3 款（经典青纹→激光条纹→彗星拖尾），由徽章解锁，无付费墙；球场配色主题（霓虹夜市/深空球馆）。

### ② 个人排行榜
- **MVP**：Top10 本地榜（分数/swish 数/日期）+ 每周最佳（`YYYY-Www` 周键）；结构含 `date`/`dailyDate` 字段，为未来全局榜预留平移。
- **R1**：目标线——开局 HUD 显示"距个人最佳 +X 分"实时差值；每日挑战成绩在 Top10 带 📅 标记。
- **R2**：ghost 线——经典模式实时显示"个人最佳同刻分数"虚线。

### ③ 一键分享
- **MVP**：结算面板"分享"→ canvas 成绩卡（总分/命中/最高连中/段位徽章/日期 + `seyrs1985.github.io/neonplay` 链接）→ Web Share API，不支持时降级剪贴板文本：`🏀 Neon Hoops 60s：87 分 · 12 中 · 最高 6 连中 · 💎钻石 | seyrs1985.github.io/neonplay/neon-hoops/`。
- **R1**：每日模式分享自带 `#NeonHoopsDaily 09-13` 日期标签；段位晋升瞬间可分享（青铜→白银升段卡）。
- **R2**：连胜里程碑卡（7 天 🔥）与 swish 集锦计数（生涯 swish 总数）。

### ④ 回访钩子
- **MVP**：**每日挑战**（mulberry32 日期种子→当日风序列+篮筐走位，全球同题，当日取最高分计戳）+ **游戏内连胜**（`np_neon-hoops_streak`，月度补签卡 1 张，protect 字段记录；与站点级 `np_streak` 独立）。
- **R1**：连胜日历热力格；结算"明天回来保住 🔥N"提醒文案；每日挑战排行榜（本地历史每日成绩曲线）。
- **R2**：每日 3 小任务（玩 1 局经典 / 完成每日 / 单局 5 连中）。

### ⑤ 目标阶梯
- **MVP**：七段位（见上表）；结算常驻"距下一段位还差 X 分"。
- **R1**：徽章入图鉴与段位合并展示；首个黄金段位解锁第二款球皮肤（衔接收集）。
- **R2**：月度赛季归档（周最佳重置+段位历史）。

### 存档键名清单（规范 `np_<slug>_<key>`，全部 JSON 字符串）
| 键 | 数据结构 | 分期 |
|---|---|---|
| `np_neon-hoops_best` | `{"score":87,"date":"2026-09-13"}` | MVP |
| `np_neon-hoops_top10` | `[{"score":..,"makes":..,"swishes":..,"date":".."}] ≤10` | MVP |
| `np_neon-hoops_daily` | `{"date":"2026-09-13","score":..,"done":true}` | MVP |
| `np_neon-hoops_streak` | `{"count":3,"last":"2026-09-13","best":7,"protect":1}` | MVP |
| `np_neon-hoops_stats` | `{"games":9,"attempts":120,"makes":88,"swishes":21}` | MVP |
| `np_neon-hoops_weekly` | `{"weekKey":"2026-W37","best":{"score":..}}` | MVP（展示可 R1） |
| `np_neon-hoops_badges` | `["first_make","first_swish","..."]` | R1 |
| `np_neon-hoops_settings` | `{"skin":"classic","sound":true}` | R2 |

---

## 四、商业化
- **广告位**：落地页构建器默认注入位（页头横幅）照旧；游戏内零强制插屏。P2 预留结算面板"看激励广告=下一局双倍分"按钮位注释（AdSense 接入后启用，MVP 不实现）。
- 留存与收集全部游玩解锁，无付费墙。

---

## 五、SEO

**关键词簇**：`basketball shooting game online free` / `dunk shot game` / `hoop game unblocked` / `flick basketball game` / `streetball arcade online` / `basketball throw game` / `play basketball online no download`。标题建议：`Neon Hoops — Free Basketball Shooting Game with Daily Wind Challenge`。

**FAQ 4 条要点（落地页 FAQPage schema）**：
1. **What is Neon Hoops?** — A free 60-second arcade basketball game: drag to flick the ball, read the wind, chain swishes, and climb from Bronze to Legend. No download, no account.
2. **How does the wind work?** — Each shot has a horizontal wind (shown by the flag); your ball drifts with it, so you adjust your arc like in golf. In the Daily challenge the whole wind pattern is identical for players worldwide.
3. **Is there a daily challenge?** — Yes — a seeded course (wind + hoop movement) that's the same for everyone each day, with streak tracking and a monthly mulligan so one busy day won't break your run.
4. **Can I play on mobile?** — Yes: flick with one finger on touch screens, full mouse support, and an angle/power keyboard mode on desktop. Progress saves on your device and shares as a card in one tap.

落地页同款要求：VideoGame/FAQPage schema、game-first 首屏、面包屑、推荐位挂 Flappy Dash 与 Reflex Rush（街机动作互链）。

---

## 六、MVP 范围（开发 Agent 一轮 ≤15 分钟，含留存基线）

**做**：
- 结构仿站内惯例：`index.html + game/style.css + game/js/main.js + game/js/game.js`；canvas（复用站内 bootstrap+DPR）。
- 核心玩法：拖拽发射+轨迹预览点（前 8 个）、重力抛物线、筐尖双圆碰撞+篮板反弹、进球判定、swish 判定、combo 计分（+1 封顶 +5）、篮筐走位渐进、60s 计时结算、风力旗标+粒子+`ax` 修正、每日种子（mulberry32 驱动风序列与走位）。
- **留存基线（模板硬性要求）**：best/Top10/weekly/daily/streak（月度补签卡）/stats 六键按第三节清单，10s 自动存+结算即存；分享卡 canvas+Web Share API→剪贴板降级；段位计算展示+距下一段位差值。
- 动效：网兜翻涌、进球 confetti、SWISH 斜切字、NEW BEST 扫光、失误震屏；中英 i18n（np_core）；`__qaState/__qa` 钩子（含 `__qa.shoot(angle,power)` 强制出手便于 QA）。
- 落地页：VideoGame/FAQPage schema + 4 FAQ + 推荐位。

**不做（明确砍掉）**：音效、双球/连投、移动篮筐的圆弧轨道、成就墙、皮肤、ghost 线、小任务、zen 模式。
**超时降级顺序**：先砍 weekly 榜（保 best/daily/streak）→ 再砍轨迹预览点 → 键盘模式降级为仅触屏说明 → 核心物理与每日风力+streak 不可砍。

---

## 七、留存路线图 R1/R2

- **R1（1-2 个后续轮次）**：成就徽章墙 8 枚（np_neon-hoops_badges）、开局目标线实时差值、连胜日历热力格+断签提醒、每日成绩带日期标签分享、段位晋升卡。
- **R2**：每日 3 小任务、球皮肤 3 款+球场主题（徽章解锁）、zen 练习场（无计时无限球）、ghost 最佳线、月度赛季归档、激励广告双倍分位启用。

---

## 八、验收标准

1. 线上 `/neon-hoops/` HTTP 200；375×667 游戏框首屏 58vh（一票否决项）；无控制台报错。
2. **玩法验证红线（LESSONS 第 9 条）**：qa_playtest 用 `__qa.shoot()` 以可进筐的角度力度强制出手→断言分数增加与网兜动画触发；再强制一记必偏出手→断言 combo 清零；跑完整局→断言结算面板含总分/命中/段位；全程 `window.onerror` 零报错。纯布局 pass 不算可玩。
3. **留存验收（模板硬性要求）**：
   - 刷新页面后 best/Top10/streak/daily 戳不丢（逐键核对第三节清单）；
   - 连胜逻辑：昨日有戳今日完成→count+1；断档→count=1 且补签卡消耗（改本地时间验证跨天）；
   - 每日种子确定性：同日两次加载，每日模式前 5 球的风值与篮筐坐标完全一致；
   - 分享卡可生成（canvas 非 blank）且含站点链接；无 Web Share 环境降级剪贴板可用；
   - 全部存档键名与第三节清单一一对应，无未列明键。
4. 数值正确性：普通 +2 / swish +3 / combo +1（封顶 +5）；风值域 [−3,+3] 且旗标摆幅与风值一致；段位阈值边界（104 分=钻石、105 分=大师）。
5. 物理合理性：球落出屏幕后 ≤1s 内刷新下一球；60s 计时为时间基驱动，后台切换不失真。
6. UI 文案走 np_core L 字典（`np_lang` 联动）；键盘模式（角度/力度表+Space）可完成一局。
7. IndexNow 提交；`STATUS.md` 运营日志追加；开发侧按惯例写 `data/run_stats.jsonl`；iOS Safari + 桌面 Chrome 冒烟通过。

---

### 附：策划备选池（供后续轮次）
- **Tile Match 羊了个羊式**：留存天然适配，z 轴命中风险待流水线验证——观察转候选。
- **Plinko×2048 合并球**：与站内三款弹球品类重叠，疲劳风险——暂缓。
- **WebAudio 程序化节奏**：判定手感打磨风险——观察。
- **R1/R2 内容轮**：reflex-rush 徽章、neon-hoops 皮肤、Word Hive 中文包、Nonogram 7×7。

*产出：NeonPlay 市场分析+游戏策划 Agent · 2026-09-13 · 品类佐证：Playgama 2026-04 篮球游戏盘点、CrazyGames one-button 分类；留存基建复用：brickstorm-daily 日期种子模式（第三次移植）*

> 已实现:2026-09-15 https://seyrs1985.github.io/neonplay/neon-hoops/
